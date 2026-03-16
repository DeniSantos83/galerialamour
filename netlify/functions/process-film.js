const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const ffmpegPath = require("ffmpeg-static");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function downloadToFile(url, outputPath) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Falha ao baixar arquivo: ${url}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.promises.writeFile(outputPath, buffer);
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    let stdout = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => reject(err));

    child.on("close", (code) => {
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

exports.handler = async function () {
  let tmpDir = null;

  try {
    const { data: film, error: fetchError } = await supabase
      .from("event_films")
      .select("*")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!film) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          message: "Nenhum filme na fila.",
        }),
      };
    }

    const { error: processingError } = await supabase
      .from("event_films")
      .update({
        status: "processing",
        error_message: null,
      })
      .eq("id", film.id);

    if (processingError) throw processingError;

    const { data: uploads, error: uploadsError } = await supabase
      .from("uploads")
      .select("*")
      .eq("event_id", film.event_id)
      .eq("status", "approved")
      .order("created_at", { ascending: true });

    if (uploadsError) throw uploadsError;

    const approvedImages = (uploads || []).filter((item) => {
      const type = String(item.file_type || "").toLowerCase();
      const mime = String(item.mime_type || "").toLowerCase();
      return type === "image" || mime.startsWith("image/");
    });

    if (!approvedImages.length) {
      await supabase
        .from("event_films")
        .update({
          status: "failed",
          error_message: "Nenhuma imagem aprovada encontrada para este evento.",
        })
        .eq("id", film.id);

      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: false,
          message: "Nenhuma imagem aprovada encontrada.",
          filmId: film.id,
        }),
      };
    }

    const selectedImages = approvedImages.slice(0, 12);

    await supabase.from("event_film_items").delete().eq("film_id", film.id);

    const itemsPayload = selectedImages.map((item, index) => ({
      film_id: film.id,
      media_id: item.id,
      media_type: "photo",
      media_path: item.file_path,
      approved: true,
      sort_order: index,
    }));

    const { error: itemsError } = await supabase
      .from("event_film_items")
      .insert(itemsPayload);

    if (itemsError) throw itemsError;

    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), `film-${film.id}-`));

    const imageListPath = path.join(tmpDir, "images.txt");
    const localImagePaths = [];

    for (let i = 0; i < selectedImages.length; i += 1) {
      const item = selectedImages[i];
      const ext =
        path.extname(item.file_path || "") ||
        (item.mime_type?.includes("png") ? ".png" : ".jpg");

      const localPath = path.join(tmpDir, `img-${String(i).padStart(3, "0")}${ext}`);
      await downloadToFile(item.file_url, localPath);
      localImagePaths.push(localPath);
    }

    const imageListContent = localImagePaths
      .map((imgPath) => {
        const escaped = imgPath.replace(/'/g, "'\\''");
        return `file '${escaped}'\nduration 2`;
      })
      .join("\n");

    const lastImageEscaped = localImagePaths[localImagePaths.length - 1].replace(
      /'/g,
      "'\\''"
    );

    await fs.promises.writeFile(
      imageListPath,
      `${imageListContent}\nfile '${lastImageEscaped}'\n`,
      "utf8"
    );

    const outputMp4Path = path.join(tmpDir, "highlight.mp4");

    await runFfmpeg([
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      imageListPath,
      "-vf",
      "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
      "-r",
      "30",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      outputMp4Path,
    ]);

    const fileBuffer = await fs.promises.readFile(outputMp4Path);
    const storagePath = `${film.event_id}/${film.id}/highlight.mp4`;

    const { error: uploadFilmError } = await supabase.storage
      .from("event-films")
      .upload(storagePath, fileBuffer, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadFilmError) throw uploadFilmError;

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
      })
      .eq("id", film.id);

    if (readyError) throw readyError;

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        message: "Filme gerado com sucesso.",
        filmId: film.id,
        selectedCount: selectedImages.length,
        outputPath: storagePath,
      }),
    };
  } catch (error) {
    console.error("Erro ao processar filme:", error);

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