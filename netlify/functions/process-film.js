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

    if (fetchError) {
      throw fetchError;
    }

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

    if (processingError) {
      throw processingError;
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));

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

    if (readyError) {
      throw readyError;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        message: "Filme processado com sucesso.",
        filmId: film.id,
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