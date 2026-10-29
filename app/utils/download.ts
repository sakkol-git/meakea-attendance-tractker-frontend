/** Save authenticated CSV bytes locally after the API has rechecked access. */
export function saveCsv(content: string, name: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function saveFile(bytes: Uint8Array, name: string, contentType: string) {
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer], { type: contentType }))
  const link = document.createElement('a')
  link.href = url
  link.download = name.replace(/[\\/\r\n]/g, '_')
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
