/**
 * Downscales an image file to a square avatar and returns a compact JPEG
 * data-URL. Profile photos live inline in API responses as base64, so keeping
 * them ~15–30 KB (instead of megabytes) is what makes that storage viable.
 */
export function fileToAvatarDataURL(file: File, size = 256, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      // Center-crop to a square, never upscale small images
      const side = Math.min(img.width, img.height)
      const out = Math.min(size, side)
      const canvas = document.createElement('canvas')
      canvas.width = out
      canvas.height = out
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Rasmni qayta ishlab bo‘lmadi'))
        return
      }
      // JPEG has no alpha — flatten transparent PNGs onto white
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, out, out)
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, out, out)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Rasmni o‘qib bo‘lmadi'))
    }
    img.src = url
  })
}
