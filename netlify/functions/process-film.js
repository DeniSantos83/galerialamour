const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async function () {
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

    await new Promise((resolve) => setTimeout(resolve, 4000));

    const fakeOutputUrl = `${process.env.URL || ""}/filmes-demo/${film.id}.mp4`;

    const { error: readyError } = await supabase
      .from("event_films")
      .update({
        status: "ready",
        output_url: fakeOutputUrl,
        output_path: `fake/${film.event_id}/${film.id}/highlight.mp4`,
        error_message: null,
      })
      .eq("id", film.id);

    if (readyError) throw readyError;

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        message: "Filme processado com imagens aprovadas.",
        filmId: film.id,
        selectedCount: selectedImages.length,
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
  }
};