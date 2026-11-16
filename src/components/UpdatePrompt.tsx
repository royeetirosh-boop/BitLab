import { useEffect, useState } from 'react'
import {
  checkForUpdate,
  dismissUpdate,
  installRelease,
  isUpdateDismissed,
  onShowUpdateDialog,
  type UpdateOffer,
} from '../lib/appUpdateClient'

export function UpdatePrompt() {
  const [offer, setOffer] = useState<UpdateOffer | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void checkForUpdate().then((result) => {
      if (cancelled || result.status !== 'available') return
      if (isUpdateDismissed(result.release.versionCode)) return
      setOffer(result)
      setMessage(null)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return onShowUpdateDialog((next) => {
      setOffer(next)
      setMessage(null)
      setBusy(false)
    })
  }, [])

  if (!offer) return null

  async function update() {
    if (!offer) return
    setBusy(true)
    setMessage(null)
    try {
      const outcome = await installRelease(offer.release)
      if (outcome === 'permission') {
        setMessage('Allow BitLab to install unknown apps, then tap Update again.')
      } else if (outcome === 'web') {
        setMessage('The Android installer runs on the phone. This browser opened the APK link instead.')
      } else {
        setMessage('The Android installer is opening.')
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not download the update')
    } finally {
      setBusy(false)
    }
  }

  const { notes } = offer.release

  return (
    <div className="update-overlay" role="presentation">
      <section className="update-dialog" role="dialog" aria-modal="true" aria-labelledby="update-title">
        <p className="kicker">BitLab</p>
        <h2 id="update-title">Update available</h2>
        <p className="explain he" dir="rtl" lang="he">
          עדכון זמין
        </p>
        <p className="hint">
          Installed {offer.installedName} ({offer.installedCode}) · new {offer.release.versionName} (
          {offer.release.versionCode})
        </p>
        {notes.he && (
          <p className="explain he" dir="rtl" lang="he">
            {notes.he}
          </p>
        )}
        {notes.en && notes.en !== notes.he && <p className="explain">{notes.en}</p>}
        {message && <p className="hint">{message}</p>}
        <div className="update-actions">
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              dismissUpdate(offer.release.versionCode)
              setOffer(null)
            }}
          >
            Later
          </button>
          <button type="button" className="btn primary" disabled={busy} onClick={() => void update()}>
            {busy ? 'Downloading…' : 'Update'}
          </button>
        </div>
      </section>
    </div>
  )
}
