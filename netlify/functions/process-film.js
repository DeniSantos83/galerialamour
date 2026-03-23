const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const ffmpegPath = require("ffmpeg-static");
const fetch = require("node-fetch");
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL não definido na Netlify Function.");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY não definido na Netlify Function.");
}

if (!ffmpegPath) {
  throw new Error("ffmpeg-static não encontrou binário do FFmpeg.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const VIDEO_WIDTH = 960;
const VIDEO_HEIGHT = 540;
const VIDEO_FPS = 24;
const TRANSITION_DURATION = 0.5;

function shuffleArray(array) {
  const clone = [...array];

  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }

  return clone;
}

function getMaxImagesByDuration(durationSeconds) {
  const duration = Number(durationSeconds) || 30;

  if (duration <= 30) return 10;
  if (duration <= 45) return 15;
  return 18;
}

async function updateFilmStatus(filmId, values) {
  const payload = {
    ...values,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("event_films")
    .update(payload)
    .eq("id", filmId);

  if (error) {
    throw error;
  }
}

async function downloadToFile(url, outputPath) {
  console.log("Baixando arquivo:", url);

  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Falha ao baixar arquivo: ${url} | status ${response.status} | body: ${body}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.promises.writeFile(outputPath, buffer);

  console.log("Arquivo salvo em:", outputPath);
}

async function getDownloadUrl(item) {
  if (item.file_url && /^https?:\/\//i.test(item.file_url)) {
    return item.file_url;
  }

  if (!item.file_path) {
    throw new Error(`Upload ${item.id} sem file_url e sem file_path.`);
  }

  const { data, error } = await supabase.storage
    .from("event-media")
    .createSignedUrl(item.file_path, 60 * 60);

  if (error) {
    throw new Error(
      `Não foi possível gerar signed URL para o upload ${item.id}: ${error.message}`
    );
  }

  if (!data?.signedUrl) {
    throw new Error(`Signed URL vazia para o upload ${item.id}.`);
  }

  return data.signedUrl;
}

function runFfmpeg(args) {
  console.log("Executando ffmpeg:", ffmpegPath);
  console.log("Args:", args.join(" "));

  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => reject(err));

    child.on("close", (code) => {
      console.log("FFmpeg finalizou com código:", code);
      console.log("FFmpeg stdout:", stdout);
      console.log("FFmpeg stderr:", stderr);

      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(
          new Error(`FFmpeg falhou com código ${code}\n${stderr || stdout}`)
        );
      }
    });
  });
}

function buildStillImageFilter() {
  return [
    `scale=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:force_original_aspect_ratio=decrease`,
    `pad=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:(ow-iw)/2:(oh-ih)/2`,
    "setsar=1",
    "format=yuv420p",
  ].join(",");
}

function buildVideoFilter(localImagePaths, secondsPerImage, transitionDuration) {
  const parts = [];

  for (let i = 0; i < localImagePaths.length; i += 1) {
    parts.push(`[${i}:v]${buildStillImageFilter()}[v${i}]`);
  }

  if (localImagePaths.length === 1) {
    parts.push(
      `[v0]trim=duration=${secondsPerImage.toFixed(
        2
      )},setpts=PTS-STARTPTS[vfinal]`
    );
    return parts.join(";");
  }

  let previousLabel = "v0";

  for (let i = 1; i < localImagePaths.length; i += 1) {
    const nextLabel = `v${i}`;
    const outLabel = i === localImagePaths.length - 1 ? "vfinal" : `vx${i}`;
    const offset = Number(
      ((secondsPerImage - transitionDuration) * i).toFixed(2)
    );

    parts.push(
      `[${previousLabel}][${nextLabel}]xfade=transition=fade:duration=${transitionDuration}:offset=${offset}[${outLabel}]`
    );

    previousLabel = outLabel;
  }

  return parts.join(";");
}

exports.handler = async function (event) {
  let tmpDir = null;
  let currentFilmId = null;

  try {
    console.log("Iniciando processamento de filme...");
    console.log("ffmpegPath:", ffmpegPath);

    let requestMode = "unused_only";
    let requestedFilmId = null;

    try {
      if (event?.body) {
        const parsedBody = JSON.parse(event.body);
        requestMode = parsedBody?.mode || "unused_only";
        requestedFilmId = parsedBody?.film_id || null;
      }
    } catch (parseError) {
      console.error("Erro ao ler body:", parseError);
      throw new Error("Body inválido para processar o filme.");
    }

    console.log("Modo solicitado:", requestMode);
    console.log("Film ID solicitado:", requestedFilmId);

    if (!requestedFilmId) {
      throw new Error("film_id é obrigatório para processar o filme.");
    }

    const { data: film, error: fetchError } = await supabase
      .from("event_films")
      .select("*")
      .eq("id", requestedFilmId)
      .in("status", ["queued", "processing"])
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!film) {
      throw new Error(
        "Filme não encontrado ou não está mais disponível para processamento."
      );
    }

    currentFilmId = film.id;
    console.log("Filme encontrado:", film.id);

    if (film.status !== "processing") {
      await updateFilmStatus(film.id, {
        status: "processing",
        error_message: null,
      });
    }

    console.log("Status alterado para processing.");

    const { data: uploads, error: uploadsError } = await supabase
      .from("uploads")
      .select("*")
      .eq("event_id", film.event_id)
      .eq("status", "approved")
      .order("created_at", { ascending: true });

    if (uploadsError) throw uploadsError;

    console.log("Uploads aprovados encontrados:", uploads?.length || 0);

    const approvedImages = (uploads || []).filter((item) => {
      const fileType = String(item.file_type || "").toLowerCase();
      const mimeType = String(item.mime_type || "").toLowerCase();
      return fileType === "image" || mimeType.startsWith("image/");
    });

    console.log("Imagens aprovadas filtradas:", approvedImages.length);

    if (!approvedImages.length) {
      throw new Error("Nenhuma imagem aprovada encontrada para este evento.");
    }

    const { data: usedMediaRows, error: usedMediaError } = await supabase
      .from("event_film_items")
      .select(`
        media_id,
        film_id,
        event_films!inner(event_id)
      `);

    if (usedMediaError) throw usedMediaError;

    const usedMediaIds = new Set(
      (usedMediaRows || [])
        .filter((row) => row.event_films?.event_id === film.event_id)
        .map((row) => row.media_id)
        .filter(Boolean)
    );

    const unusedImages = approvedImages.filter(
      (item) => !usedMediaIds.has(item.id)
    );

    console.log("Imagens ainda não usadas:", unusedImages.length);

    let selectedSourceImages = [];

    if (requestMode === "allow_reuse") {
      if (unusedImages.length > 0) {
        selectedSourceImages = unusedImages;
      } else {
        console.log("Sem imagens inéditas. Reutilizando imagens aprovadas.");
        selectedSourceImages = shuffleArray(approvedImages);
      }
    } else {
      if (!unusedImages.length) {
        throw new Error(
          "Todas as imagens aprovadas deste evento já foram usadas em filmes anteriores."
        );
      }

      selectedSourceImages = unusedImages;
    }

    if (!selectedSourceImages.length) {
      throw new Error("Nenhuma imagem aprovada encontrada para este evento.");
    }

    const totalDuration =
      Number(film.duration_seconds) > 0 ? Number(film.duration_seconds) : 30;

    const maxImages = getMaxImagesByDuration(totalDuration);
    const selectedImages = selectedSourceImages.slice(0, maxImages);

    console.log("Duração total desejada:", totalDuration);
    console.log("Limite de imagens para essa duração:", maxImages);
    console.log("Imagens selecionadas:", selectedImages.length);

    const { error: deleteItemsError } = await supabase
      .from("event_film_items")
      .delete()
      .eq("film_id", film.id);

    if (deleteItemsError) throw deleteItemsError;

    const itemsPayload = selectedImages.map((item, index) => ({
      film_id: film.id,
      media_id: item.id,
      media_type: "photo",
      media_path: item.file_path,
      approved: true,
      sort_order: index,
      created_at: new Date().toISOString(),
    }));

    const { error: itemsError } = await supabase
      .from("event_film_items")
      .insert(itemsPayload);

    if (itemsError) throw itemsError;

    console.log("event_film_items gravado.");

    tmpDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), `film-${film.id}-`)
    );

    console.log("Diretório temporário:", tmpDir);

    const localImagePaths = [];

    for (let i = 0; i < selectedImages.length; i += 1) {
      const item = selectedImages[i];

      const ext =
        path.extname(item.file_path || "") ||
        (String(item.mime_type || "").includes("png") ? ".png" : ".jpg");

      const localPath = path.join(
        tmpDir,
        `img-${String(i).padStart(3, "0")}${ext}`
      );

      const downloadUrl = await getDownloadUrl(item);
      await downloadToFile(downloadUrl, localPath);

      localImagePaths.push(localPath);
    }

    if (!localImagePaths.length) {
      throw new Error("Não foi possível baixar as imagens do filme.");
    }

    const effectiveCount = Math.max(1, localImagePaths.length);

    const secondsPerImage =
      effectiveCount === 1
        ? totalDuration
        : Number(
            (
              (totalDuration +
                (effectiveCount - 1) * TRANSITION_DURATION) /
              effectiveCount
            ).toFixed(2)
          );

    console.log("Quantidade de imagens:", effectiveCount);
    console.log("Segundos por imagem:", secondsPerImage);

    const outputMp4Path = path.join(tmpDir, "highlight.mp4");

    const ffmpegArgs = ["-y"];

    for (let i = 0; i < localImagePaths.length; i += 1) {
      ffmpegArgs.push(
        "-loop",
        "1",
        "-t",
        secondsPerImage.toFixed(2),
        "-i",
        localImagePaths[i]
      );
    }

    const videoFilter = buildVideoFilter(
      localImagePaths,
      secondsPerImage,
      TRANSITION_DURATION
    );

    ffmpegArgs.push(
      "-filter_complex",
      videoFilter,
      "-map",
      "[vfinal]",
      "-r",
      String(VIDEO_FPS),
      "-pix_fmt",
      "yuv420p",
      "-c:v",
      "libx264",
      "-movflags",
      "+faststart",
      outputMp4Path
    );

    await runFfmpeg(ffmpegArgs);

    console.log("MP4 gerado:", outputMp4Path);

    const fileBuffer = await fs.promises.readFile(outputMp4Path);
    const storagePath = `${film.event_id}/${film.id}/highlight.mp4`;

    const { error: uploadFilmError } = await supabase.storage
      .from("event-films")
      .upload(storagePath, fileBuffer, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadFilmError) throw uploadFilmError;

    console.log("Upload do filme concluído:", storagePath);

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("event-films")
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

    if (signedUrlError) throw signedUrlError;

    await updateFilmStatus(film.id, {
      status: "completed",
      output_path: storagePath,
      output_url: signedUrlData?.signedUrl || null,
      error_message: null,
    });

    console.log("Filme finalizado com sucesso.");

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        message: "Filme gerado com sucesso.",
        filmId: film.id,
        selectedCount: selectedImages.length,
        outputPath: storagePath,
        durationSeconds: totalDuration,
        mode: requestMode,
      }),
    };
  } catch (error) {
    console.error("Erro ao processar filme:", error);

    if (currentFilmId) {
      try {
        await supabase
          .from("event_films")
          .update({
            status: "failed",
            error_message: error.message || "Erro interno ao processar filme.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentFilmId);
      } catch (updateError) {
        console.error("Erro ao marcar filme como failed:", updateError);
      }
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        message: error.message || "Erro interno ao processar filme.",
      }),
    };
  } finally {
    if (tmpDir) {
      try {
        await fs.promises.rm(tmpDir, { recursive: true, force: true });
      } catch (_) {}
    }
  }
};