export interface UpdateNotes {
  en: string
  he: string
}

export interface UpdateManifest {
  versionCode: number
  versionName: string
  apkUrl: string
  notes: UpdateNotes
}

export const DEFAULT_UPDATE_MANIFEST_URL: string

export function parseUpdateManifest(value: unknown): UpdateManifest

export function isNewerVersion(remoteCode: unknown, installedCode: unknown): boolean
