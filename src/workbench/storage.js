const database = () =>
  new Promise((resolve, reject) => {
    const r = indexedDB.open("character-studio-workbench", 1)
    r.onupgradeneeded = () => r.result.createObjectStore("projects")
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
export async function readAutosave() {
  const db = await database()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("projects")
    const r = tx.objectStore("projects").get("autosave")
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
    tx.oncomplete = () => db.close()
  })
}
export async function writeAutosave(value) {
  const db = await database()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("projects", "readwrite")
    tx.objectStore("projects").put(value, "autosave")
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}
export function download(data, name, type = "application/octet-stream") {
  const blob = data instanceof Blob ? data : new Blob([data], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}
export function encodeBytes(buffer) {
  let result = ""
  const a = new Uint8Array(buffer)
  for (let i = 0; i < a.length; i += 32768)
    result += String.fromCharCode(...a.subarray(i, i + 32768))
  return btoa(result)
}
export function decodeBytes(text) {
  const s = atob(text)
  return Uint8Array.from(s, (c) => c.charCodeAt(0)).buffer
}
export function filename(name) {
  return (
    name
      .replace(/[^a-z0-9_-]+/gi, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "avatar"
  )
}
