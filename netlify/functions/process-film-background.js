const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const ffmpegPath = require("ffmpeg-static");
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

const MUSIC_LIBRARY = {
  romantico: path.join(__dirname, "assets", "romantico.mp3"),
  jovem: path.join(__dirname, "assets", "jovem.mp3"),
  forro: path.join(__dirname, "assets", "forro.mp3"),
  carnaval: path.join(__dirname, "assets", "carnaval.mp3"),
};

const VIDEO_WIDTH = 1280;
const VIDEO_HEIGHT = 720;
const VIDEO_FPS = 30;
const MAX_IMAGES = 12;
const TRANSITION_DURATION = 0.9;

function shuffleArray(array) {
  const clone = [...array];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

function normalizeMusicStyle(value) {
  const normalized = String(value || "romantico").toLowerCase().trim();
  return MUSIC_LIBRARY[normalized] ? normalized : "romantico";
}

function fileExists(filePath) {
  try {
    return Boolean(filePath && fs.existsSync(filePath));
  } catch (_) {
    return false;
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

function buildZoomPanFilter(index, framesPerImage) {
  const zoomStep = index % 2 === 0 ? "0.0009" : "0.0007";
  const maxZoom = index % 2 === 0 ? "1.14" : "1.10";

  const xExpr =
    index % 3 === 0
      ? "iw/2-(iw/zoom/2)"
      : index % 3 === 1
      ? "if(gte(zoom,1.02),(iw-iw/zoom)*0.12,(iw-iw/zoom)/2)"
      : "if(gte(zoom,1.02),(iw-iw/zoom)*0.88,(iw-iw/zoom)/2)";

  const yExpr =
    index % 2 === 0
      ? "if(gte(zoom,1.02),(ih-ih/zoom)*0.18,(ih-ih/zoom)/2)"
      : "if(gte(zoom,1.02),(ih-ih/zoom)*0.82,(ih-ih/zoom)/2)";

  return [
    `scale=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:force_original_aspect_ratio=decrease`,
    `pad=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:(ow-iw)/2:(oh-ih)/2`,
    `zoompan=z='min(zoom+${zoomStep},${maxZoom})':x='${xExpr}':y='${yExpr}':d=${framesPerImage}:s=${VIDEO_WIDTH}x${VIDEO_HEIGHT}:fps=${VIDEO_FPS}`,
    "setsar=1",
    "format=yuv420p",
  ].join(",");
}

function buildVideoFilter(localImagePaths, secondsPerImage, transitionDuration) {
  const framesPerImage = Math.max(
    1,
    Math.round((secondsPerImage + transitionDuration) * VIDEO_FPS)
  );

  const parts = [];

  for (let i = 0; i < localImagePaths.length; i += 1) {
    parts.push(`[${i}:v]${buildZoomPanFilter(i, framesPerImage)}[v${i}]`);
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
    const offset = Number((secondsPerImage * i).toFixed(2));

    parts.push(
      `[${previousLabel}][${nextLabel}]xfade=transition=fade:duration=${transitionDuration}:offset=${offset}[${outLabel}]`
    );

    previousLabel = outLabel;
  }

  return parts.join(";");
}

function buildAudioFilter(totalDuration) {
  const fadeInDuration = Math.min(1.5, Math.max(0.5, totalDuration / 10));
  const fadeOutDuration = Math.min(1.8, Math.max(0.8, totalDuration / 10));
  const fadeOutStart = Math.max(0, totalDuration - fadeOutDuration);

  return `volume=0.18,afade=t=in:st=0:d=${fadeInDuration.toFixed(
    2
  )},afade=t=out:st=${fadeOutStart.toFixed(2)}:d=${fadeOutDuration.toFixed(
    2
  )}`;
}

exports.handler = async function (event) {
  let tmpDir = null;
  let currentFilmId = null;

  try {
    console.log("Iniciando processamento de filme em background...");
    console.log("ffmpegPath:", ffmpegPath);

    let requestMode = "unused_only";
    let requestedFilmId = null;

    try {
      if (event?.body) {
        const parsedBody = JSON.parse(event.body);
        requestMode = parsedBody?.mode || "unused_only";
        requestedFilmId = parsedBody?.film_id || null;
      }
    } catch (_) {
      requestMode = "unused_only";
      requestedFilmId = null;
    }

    console.log("Modo solicitado:", requestMode);
    console.log("Film ID solicitado:", requestedFilmId);

    let film = null;
    let fetchError = null;

    if (requestedFilmId) {
      const result = await supabase
        .from("event_films")
        .select("*")
        .eq("id", requestedFilmId)
        .eq("status", "queued")
        .maybeSingle();

      film = result.data;
      fetchError = result.error;
    } else {
      console.log("film_id ausente. Usando fallback para o primeiro filme queued.");

      const result = await supabase
        .from("event_films")
        .select("*")
        .eq("status", "queued")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      film = result.data;
      fetchError = result.error;
    }

    if (fetchError) throw fetchError;

    if (!film) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          ok: false,
          message: "Nenhum filme na fila.",
        }),
      };
    }

    currentFilmId = film.id;
    console.log("Filme encontrado:", film.id);

    const { error: processingError } = await supabase
      .from("event_films")
      .update({
        status: "processing",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", film.id);

    if (processingError) throw processingError;

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

    const selectedImages = selectedSourceImages.slice(0, MAX_IMAGES);

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

    console.log(
      "Assets existe:",
      fs.existsSync(path.join(__dirname, "assets"))
    );
    console.log(
      "romantico existe:",
      fs.existsSync(path.join(__dirname, "assets", "romantico.mp3"))
    );
    console.log(
      "jovem existe:",
      fs.existsSync(path.join(__dirname, "assets", "jovem.mp3"))
    );
    console.log(
      "forro existe:",
      fs.existsSync(path.join(__dirname, "assets", "forro.mp3"))
    );
    console.log(
      "carnaval existe:",
      fs.existsSync(path.join(__dirname, "assets", "carnaval.mp3"))
    );

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

    const totalDuration =
      Number(film.duration_seconds) > 0 ? Number(film.duration_seconds) : 30;

    const effectiveCount = Math.max(1, localImagePaths.length);
    const secondsPerImage = Math.max(
      2.2,
      Number((totalDuration / effectiveCount).toFixed(2))
    );

    console.log("Duração total:", totalDuration);
    console.log("Segundos por imagem:", secondsPerImage);

    const outputMp4Path = path.join(tmpDir, "highlight.mp4");

    const musicStyle = normalizeMusicStyle(film.style);
    const selectedMusicPath = MUSIC_LIBRARY[musicStyle];
    const hasMusicFile = fileExists(selectedMusicPath);

    console.log("Estilo musical:", musicStyle);
    console.log("Arquivo musical:", selectedMusicPath);
    console.log("Tem trilha:", hasMusicFile);

    const ffmpegArgs = ["-y"];

    for (let i = 0; i < localImagePaths.length; i += 1) {
      ffmpegArgs.push(
        "-loop",
        "1",
        "-t",
        (secondsPerImage + TRANSITION_DURATION + 0.15).toFixed(2),
        "-i",
        localImagePaths[i]
      );
    }

    let audioInputIndex = null;

    if (hasMusicFile) {
      audioInputIndex = localImagePaths.length;
      ffmpegArgs.push("-stream_loop", "-1", "-i", selectedMusicPath);
    }

    const videoFilter = buildVideoFilter(
      localImagePaths,
      secondsPerImage,
      TRANSITION_DURATION
    );

    if (hasMusicFile) {
      const audioFilter = buildAudioFilter(totalDuration);
      ffmpegArgs.push(
        "-filter_complex",
        `${videoFilter};[${audioInputIndex}:a]${audioFilter}[aout]`,
        "-map",
        "[vfinal]",
        "-map",
        "[aout]"
      );
    } else {
      ffmpegArgs.push("-filter_complex", videoFilter, "-map", "[vfinal]");
    }

    ffmpegArgs.push(
      "-r",
      String(VIDEO_FPS),
      "-pix_fmt",
      "yuv420p",
      "-c:v",
      "libx264"
    );

    if (hasMusicFile) {
      ffmpegArgs.push("-c:a", "aac", "-shortest");
    }

    ffmpegArgs.push("-movflags", "+faststart", outputMp4Path);

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

    const { error: readyError } = await supabase
      .from("event_films")
      .update({
        status: "ready",
        output_path: storagePath,
        output_url: signedUrlData.signedUrl,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", film.id);

    if (readyError) throw readyError;

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
        musicStyle,
        hasMusicFile,
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