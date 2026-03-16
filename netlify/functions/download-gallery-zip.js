const fs = require("fs")
const os = require("os")
const path = require("path")
const archiver = require("archiver")

const { createClient } = require("@supabase/supabase-js")

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function downloadFile(url, filePath) {
  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(`Erro ao baixar arquivo: ${url}`)
  }

  const buffer = Buffer.from(await res.arrayBuffer())
  await fs.promises.writeFile(filePath, buffer)
}

exports.handler = async (event) => {
  try {

    if (!event.body) {
      throw new Error("Requisição inválida.")
    }

    const { event_id } = JSON.parse(event.body)

    if (!event_id) {
      throw new Error("event_id não informado.")
    }

    const { data: uploads, error } = await supabase
      .from("uploads")
      .select("*")
      .eq("event_id", event_id)
      .eq("status", "approved")

    if (error) throw error

    if (!uploads || uploads.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Nenhuma foto encontrada" }),
      }
    }

    const tmpDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "gallery-")
    )

    const zipPath = path.join(tmpDir, "gallery.zip")

    const output = fs.createWriteStream(zipPath)
    const archive = archiver("zip", { zlib: { level: 9 } })

    archive.pipe(output)

    for (let i = 0; i < uploads.length; i++) {

      const item = uploads[i]

      if (!item.file_path) continue

      let url = item.file_url

      if (!url) {

        const { data, error: signedError } = await supabase.storage
          .from("event-media")
          .createSignedUrl(item.file_path, 60 * 60)

        if (signedError) continue

        url = data?.signedUrl
      }

      if (!url) continue

      const ext = path.extname(item.file_path) || ".jpg"

      const fileName = `foto-${String(i + 1).padStart(4, "0")}${ext}`

      const filePath = path.join(tmpDir, fileName)

      await downloadFile(url, filePath)

      archive.file(filePath, { name: fileName })
    }

    await archive.finalize()

    await new Promise((resolve) => output.on("close", resolve))

    const buffer = await fs.promises.readFile(zipPath)

    const storagePath = `downloads/${event_id}-${Date.now()}.zip`

    const { error: uploadError } = await supabase.storage
      .from("event-films")
      .upload(storagePath, buffer, {
        contentType: "application/zip",
        upsert: true,
      })

    if (uploadError) throw uploadError

    const { data: signedData, error: signedError } = await supabase.storage
      .from("event-films")
      .createSignedUrl(storagePath, 60 * 60)

    if (signedError) throw signedError

    return {
      statusCode: 200,
      body: JSON.stringify({
        url: signedData.signedUrl,
      }),
    }

  } catch (error) {

    console.error("Erro ao gerar ZIP:", error)

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
      }),
    }

  }
}