import { useEffect, useState } from 'react'
import { checkForUpdate, installedVersion, showUpdateDialog } from '../lib/appUpdateClient'
import { APP_VERSION_CODE, APP_VERSION_NAME } from '../lib/appVersion'

export function AboutPage() {
  const [installed, setInstalled] = useState(`${APP_VERSION_NAME} (${APP_VERSION_CODE})`)
  const [status, setStatus] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let cancelled = false
    void installedVersion().then((info) => {
      if (!cancelled) setInstalled(`${info.versionName} (${info.versionCode})`)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function check() {
    setStatus(null)
    setPending(true)
    const result = await checkForUpdate()
    setPending(false)
    if (result.status === 'silent') return
    if (result.status === 'current') {
      setStatus(`You're on ${result.installedName} (build ${result.installedCode}). That's the newest listed build.`)
      return
    }
    if (result.status === 'unpublished') {
      setStatus(
        `Build ${result.release.versionName} is listed, but it has no APK address yet, so there is nothing to install.`,
      )
      return
    }
    setStatus(`Build ${result.release.versionName} is ready to install.`)
    showUpdateDialog(result)
  }

  return (
    <div className="page">
      <section className="hero">
        <div className="kicker">About</div>
        <h1>
          Bit<span style={{ color: 'var(--copper)' }}>Lab</span>
        </h1>
        <p>This install is {installed}.</p>
      </section>

      <section className="panel">
        <h2 className="step-title">Updates</h2>
        <p className="explain">
          BitLab checks a public update manifest on launch. When a newer build is listed, it downloads
          the APK and opens the Android installer over this app.
        </p>
        <p className="explain he" dir="rtl" lang="he">
          העדכון מותקן מעל האפליקציה הקיימת, בלי להסיר אותה קודם.
        </p>
        <div className="update-actions">
          <button type="button" className="btn primary" disabled={pending} onClick={() => void check()}>
            {pending ? 'Checking…' : 'Check for updates'}
          </button>
        </div>
        {status && <p className="hint">{status}</p>}
      </section>
    </div>
  )
}
