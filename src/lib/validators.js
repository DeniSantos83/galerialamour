const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']

export function getFileCategory(file) {
  if (!file) return null
  if (IMAGE_TYPES.includes(file.type)) return 'image'
  if (VIDEO_TYPES.includes(file.type)) return 'video'
  return null
}

export function validateFileType(file) {
  const category = getFileCategory(file)

  if (!category) {
    return 'Formato não permitido. Envie JPG, PNG, WEBP, MP4, MOV ou WEBM.'
  }

  return null
}

export function validateFileSize(file, settings) {
  const category = getFileCategory(file)
  if (!category) return null

  const maxMb = category === 'image'
    ? settings?.max_photo_size_mb ?? 20
    : settings?.max_video_size_mb ?? 80

  const maxBytes = maxMb * 1024 * 1024

  if (file.size > maxBytes) {
    return `Arquivo muito grande. O limite para ${category === 'image' ? 'foto' : 'vídeo'} é ${maxMb} MB.`
  }

  return null
}

export function getVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')

    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      const duration = video.duration
      URL.revokeObjectURL(url)
      resolve(duration)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível ler a duração do vídeo.'))
    }

    video.src = url
  })
}

export async function validateVideoDuration(file, settings) {
  const category = getFileCategory(file)
  if (category !== 'video') return null

  const maxDuration = settings?.max_video_duration_seconds ?? 45
  const duration = await getVideoDuration(file)

}