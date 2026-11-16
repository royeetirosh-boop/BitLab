import { App } from '@capacitor/app'
import { Capacitor, registerPlugin } from '@capacitor/core'
import {
  DEFAULT_UPDATE_MANIFEST_URL,
  isNewerVersion,
  parseUpdateManifest,
  type UpdateManifest,
} from './appUpdate.mjs'
import { APP_VERSION_CODE, APP_VERSION_NAME } from './appVersion'

const DISMISS_KEY = 'bitlab.updateDismissed'
const SHOW_EVENT = 'bitlab:show-update'

interface AppUpdatePlugin {
  downloadAndInstall(options: { url: string }): Promise<{ ok?: boolean; started?: boolean }>
}

const AppUpdate = registerPlugin<AppUpdatePlugin>('AppUpdate')

export interface UpdateOffer {
  release: UpdateManifest
  installedCode: number
  installedName: string
}

export type UpdateCheck =
  | ({ status: 'current' } & UpdateOffer)
  | ({ status: 'available' } & UpdateOffer)
  | ({ status: 'unpublished' } & UpdateOffer)
  | { status: 'silent' }

export function manifestUrl(): string {
  return DEFAULT_UPDATE_MANIFEST_URL
}

export function isUpdateDismissed(versionCode: number): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === String(versionCode)
  } catch {
    return false
  }
}

export function dismissUpdate(versionCode: number): void {
  try {
    sessionStorage.setItem(DISMISS_KEY, String(versionCode))
  } catch {
    // A private session can still close the dialog for this page view.
  }
}

export function showUpdateDialog(offer: UpdateOffer): void {
  window.dispatchEvent(new CustomEvent<UpdateOffer>(SHOW_EVENT, { detail: offer }))
}

export function onShowUpdateDialog(listener: (offer: UpdateOffer) => void): () => void {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<UpdateOffer>).detail
    if (detail?.release) listener(detail)
  }
  window.addEventListener(SHOW_EVENT, handler)
  return () => window.removeEventListener(SHOW_EVENT, handler)
}

export async function installedVersion(): Promise<{ versionCode: number; versionName: string }> {
  if (Capacitor.isNativePlatform()) {
    try {
      const info = await App.getInfo()
      const versionCode = Number.parseInt(info.build, 10)
      if (Number.isInteger(versionCode) && versionCode > 0) {
        return { versionCode, versionName: info.version || APP_VERSION_NAME }
      }
    } catch {
      // The packaged constants still name this build.
    }
  }
  return { versionCode: APP_VERSION_CODE, versionName: APP_VERSION_NAME }
}

/**
 * Offline, a missing manifest, and a malformed file all return `silent`
 * so launch (and the settings button) can stay quiet.
 */
export async function checkForUpdate(): Promise<UpdateCheck> {
  try {
    const installed = await installedVersion()
    const response = await fetch(manifestUrl(), { cache: 'no-store' })
    if (!response.ok) return { status: 'silent' }
    const release = parseUpdateManifest(await response.json())
    const offer = {
      release,
      installedCode: installed.versionCode,
      installedName: installed.versionName,
    }
    if (!isNewerVersion(release.versionCode, installed.versionCode)) {
      return { status: 'current', ...offer }
    }
    if (!release.apkUrl) return { status: 'unpublished', ...offer }
    return { status: 'available', ...offer }
  } catch {
    return { status: 'silent' }
  }
}

function pluginErrorText(err: unknown): string {
  if (!err) return 'Download failed'
  if (typeof err === 'string') return err
  if (err instanceof Error) return err.message
  if (typeof err === 'object') {
    const record = err as { message?: unknown; errorMessage?: unknown; code?: unknown }
    const text = [record.message, record.errorMessage, record.code].filter(Boolean).map(String).join(' ')
    if (text.trim()) return text
  }
  return String(err)
}

export async function installRelease(release: UpdateManifest): Promise<'started' | 'web' | 'permission'> {
  if (!release.apkUrl) throw new Error('This version has no APK address yet.')
  if (Capacitor.getPlatform() !== 'android') {
    window.open(release.apkUrl, '_blank', 'noopener')
    return 'web'
  }
  try {
    await AppUpdate.downloadAndInstall({ url: release.apkUrl })
    return 'started'
  } catch (err) {
    const message = pluginErrorText(err)
    if (message.includes('INSTALL_PERMISSION_REQUIRED')) return 'permission'
    throw new Error(message)
  }
}
