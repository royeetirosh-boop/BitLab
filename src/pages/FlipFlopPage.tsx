import { useMemo, useState } from 'react'
import { FF_META, nextFF, type FFType } from '../lib/flipflops'

export function FlipFlopPage() {
  const [type, setType] = useState<FFType>('JK')
  const [Q, setQ] = useState<0 | 1>(0)
  const [S, setS] = useState<0 | 1>(0)
  const [R, setR] = useState<0 | 1>(0)
  const [J, setJ] = useState<0 | 1>(0)
  const [K, setK] = useState<0 | 1>(0)
  const [D, setD] = useState<0 | 1>(0)
  const [T, setT] = useState<0 | 1>(0)
  const [log, setLog] = useState<string[]>([])
  const [delayMs, setDelayMs] = useState(400)

  const meta = FF_META[type]
  const preview = useMemo(
    () => nextFF(type, Q, { S, R, J, K, D, T }),
    [type, Q, S, R, J, K, D, T],
  )

  const clock = () => {
    const res = nextFF(type, Q, { S, R, J, K, D, T })
    if (res.invalid) {
      setLog((l) => [`⚠ ${res.note}`, ...l].slice(0, 12))
      return
    }
    setTimeout(() => {
      setQ(res.next.Q)
      setLog((l) => [`CLK · ${res.note} → Q=${res.next.Q}`, ...l].slice(0, 12))
    }, delayMs)
  }

  const Bit = ({
    label,
    value,
    set,
  }: {
    label: string
    value: 0 | 1
    set: (v: 0 | 1) => void
  }) => (
    <button type="button" className={`btn ${value ? 'primary' : ''}`} onClick={() => set(value ? 0 : 1)}>
      {label}={value}
    </button>
  )

  return (
    <div className="page">
      <section className="hero" style={{ paddingBottom: '0.75rem' }}>
        <div className="kicker">Sequential logic · לוגיקה סדרתית</div>
        <h1>
          Memory in a gate.
          <br />
          <em>Flip-flops.</em>
        </h1>
        <p>
          Combinational logic has no memory — flip-flops do. Set inputs, hit Clock, watch Q update. Core
          of registers, counters, and FSMs.
        </p>
      </section>

      <div className="tabs">
        {(['SR', 'JK', 'D', 'T'] as FFType[]).map((t) => (
          <button key={t} type="button" className={type === t ? 'on' : ''} onClick={() => setType(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="lesson-layout">
        <div className="panel">
          <h2 className="step-title">{meta.title}</h2>
          <p className="explain">{meta.blurb}</p>
          <div className="math-box">
            <strong>Characteristic equation</strong>
            {meta.characteristic}
          </div>

          <div className="row" style={{ marginTop: '1rem' }}>
            {type === 'SR' && (
              <>
                <Bit label="S" value={S} set={setS} />
                <Bit label="R" value={R} set={setR} />
              </>
            )}
            {type === 'JK' && (
              <>
                <Bit label="J" value={J} set={setJ} />
                <Bit label="K" value={K} set={setK} />
              </>
            )}
            {type === 'D' && <Bit label="D" value={D} set={setD} />}
            {type === 'T' && <Bit label="T" value={T} set={setT} />}
          </div>

          <div className="row" style={{ marginTop: '0.85rem', alignItems: 'center' }}>
            <button type="button" className="btn primary" onClick={clock}>
              ⏱ Clock edge
            </button>
            <button type="button" className="btn" onClick={() => setQ((q) => (q ? 0 : 1))}>
              Force Q={Q ? 0 : 1}
            </button>
            <div className="field" style={{ flex: '1 1 160px' }}>
              <label>Edge delay: {delayMs} ms</label>
              <input
                type="range"
                min={0}
                max={1200}
                step={50}
                value={delayMs}
                onChange={(e) => setDelayMs(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="panel alu">
          <div className={`alu-block ${preview.invalid ? '' : 'hot'}`}>
            <h4>Present state</h4>
            <div className="row">
              <div className={`bit ${Q ? 'on' : ''}`} style={{ width: '3rem', height: '3rem' }}>
                Q={Q}
              </div>
              <div className={`bit ${!Q ? 'on' : ''}`} style={{ width: '3rem', height: '3rem' }}>
                Q'={1 - Q}
              </div>
            </div>
          </div>
          <div className={`alu-block ${preview.invalid ? '' : 'hot'}`}>
            <h4>Next state (after clock)</h4>
            <p className="hint" style={{ margin: 0, color: preview.invalid ? 'var(--danger)' : undefined }}>
              {preview.note}
            </p>
            {!preview.invalid && (
              <div className="row" style={{ marginTop: 8 }}>
                <div className={`bit ${preview.next.Q ? 'on pulse' : ''}`} style={{ width: '3rem' }}>
                  Q⁺={preview.next.Q}
                </div>
              </div>
            )}
          </div>
          <div className="alu-block">
            <h4>Trace</h4>
            {log.length === 0 ? (
              <p className="hint" style={{ margin: 0 }}>
                Clock to record transitions.
              </p>
            ) : (
              log.map((line, i) => (
                <div key={i} className="hint" style={{ fontFamily: 'var(--font-mono)' }}>
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
