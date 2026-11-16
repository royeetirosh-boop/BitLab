/**
 * Pure update-manifest helpers. The phone compares integer versionCodes.
 * An empty apkUrl means the build was recorded but not uploaded yet.
 *
 * The public host is the same releases repo the other apps use.
 * Phones fetch it with no GitHub login. A missing file or a failed
 * request is treated as "no update" by the caller.
 */
export const DEFAULT_UPDATE_MANIFEST_URL =
  'https://raw.githubusercontent.com/royeetirosh-boop/Ravofun--releases-/main/bitlab/latest.json'

export function parseUpdateManifest(value) {
  if (!value || typeof value !== 'object') {
    throw new Error('Update manifest must be an object')
  }
  const versionCode = value.versionCode
  const versionName = typeof value.versionName === 'string' ? value.versionName.trim() : ''
  const apkUrl = typeof value.apkUrl === 'string' ? value.apkUrl.trim() : null
  if (!Number.isInteger(versionCode) || versionCode < 1) {
    throw new Error('versionCode must be a positive integer')
  }
  if (!versionName) throw new Error('versionName is required')
  if (apkUrl == null) throw new Error('apkUrl must be a string')
  if (apkUrl && !isHttpUrl(apkUrl)) throw new Error('apkUrl must be an http(s) URL or empty')
  const notes = normalizeNotes(value.notes)
  return { versionCode, versionName, apkUrl, notes }
}

export function isNewerVersion(remoteCode, installedCode) {
  return Number.isInteger(remoteCode) && Number.isInteger(installedCode) && remoteCode > installedCode
}

function normalizeNotes(notes) {
  if (typeof notes === 'string') {
    const text = notes.trim()
    if (!text) throw new Error('notes are required')
    return { en: text, he: text }
  }
  if (!notes || typeof notes !== 'object') throw new Error('notes are required')
  const en = typeof notes.en === 'string' ? notes.en.trim() : ''
  const he = typeof notes.he === 'string' ? notes.he.trim() : ''
  if (!en && !he) throw new Error('notes.en and notes.he are required')
  return { en, he }
}

function isHttpUrl(value) {
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password
  } catch {
    return false
  }
}
