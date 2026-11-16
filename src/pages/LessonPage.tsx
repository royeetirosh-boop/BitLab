import { useEffect, useMemo, useState } from 'react'
import { BitStrip } from '../components/BitStrip'
import { parseFlexibleInput, type RadixFormat } from '../lib/conversions'
import {
  FORMAT_OPTIONS,
  buildConversionLesson,
  buildPlus6DeepDive,
  type LessonStep,
} from '../lib/conversionLesson'

type Mode = 'convert' | 'plus6'

export function LessonPage() {
  const [mode, setMode] = useState<Mode>('convert')
  const [from, setFrom] = useState<RadixFormat>('decimal')
  const [to, setTo] = useState<RadixFormat>('binary')
  const [raw, setRaw] = useState('42')
  const [a, setA] = useState(9)
  const [b, setB] = useState(5)
  const [cin, setCin] = useState(0)
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [delayMs, setDelayMs] = useState(1500)

  const parsed = useMemo(() => parseFlexibleInput(raw, from), [raw, from])

  const steps: LessonStep[] = useMemo(() => {
    if (mode === 'plus6') return buildPlus6DeepDive(a, b, cin)
    if (parsed == null) return []
    return buildConversionLesson({
      from,
      to,
      value: parsed,
      rawInput: raw.trim().replace(/\s+/g, ''),
    })
  }, [mode, from, to, parsed, raw, a, b, cin])

  const max = Math.max(0, steps.length - 1)

  useEffect(() => {
    setStep(0)
    setPlaying(false)
  }, [mode, from, to, raw, a, b, cin])

  useEffect(() => {
    if (!playing) return
    if (step >= max) {
      setPlaying(false)
      return
    }
    const t = window.setTimeout(() => setStep((s) => Math.min(s + 1, max)), delayMs)
    return () => window.clearTimeout(t)
  }, [playing, step, max, delayMs])

  const current = steps[Math.min(step, steps.length - 1)]
  const placeholder = FORMAT_OPTIONS.find((f) => f.id === from)?.placeholder ?? '0'

  const swap = () => {
    setFrom(to)
    setTo(from)
    // best-effort: keep decimal meaning in the input field when possible
    if (parsed != null) {
      if (to === 'decimal') setRaw(String(parsed))
      else if (to === 'binary') setRaw(parsed.toString(2))
      else if (to === 'hex') setRaw(parsed.toString(16).toUpperCase())
      else if (to === 'octal') setRaw(parsed.toString(8))
      else if (to === 'bcd') {
        setRaw(
          String(parsed)
            .split('')
            .map((d) => Number(d).toString(2).padStart(4, '0'))
            .join(''),
        )
      } else if (to === 'gray') {
        const g = parsed ^ (parsed >> 1)
        setRaw(g.toString(2))
      }
    }
  }

  return (
    <div className="page">
      <section className="hero" style={{ paddingBottom: '0.5rem' }}>
        <div className="kicker">Animated conversion lab</div>
        <h1>
          Pick a start.
          <br />
          <em>Walk to the end.</em>
        </h1>
        <p>
          Same slide style as BCD +6 — math, hardware story, and bit lamps — for every pair: decimal,
          binary, hex, octal, BCD, Gray.
        </p>
      </section>

      <div className="tabs">
        <button type="button" className={mode === 'convert' ? 'on' : ''} onClick={() => setMode('convert')}>
          Any → any lesson
        </button>
        <button type="button" className={mode === 'plus6' ? 'on' : ''} onClick={() => setMode('plus6')}>
          Deep dive · BCD +6 adder
        </button>
      </div>

      <div className="panel">
        {mode === 'convert' ? (
          <div className="row">
            <div className="field" style={{ flex: '0 0 160px' }}>
              <label>From</label>
              <select
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value as RadixFormat)
                }}
              >
                {FORMAT_OPTIONS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="btn" style={{ marginBottom: 2 }} onClick={swap} title="Swap">
              ⇄
            </button>
            <div className="field" style={{ flex: '0 0 160px' }}>
              <label>To</label>
              <select value={to} onChange={(e) => setTo(e.target.value as RadixFormat)}>
                {FORMAT_OPTIONS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Value ({FORMAT_OPTIONS.find((f) => f.id === from)?.label})</label>
              <input value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={placeholder} spellCheck={false} />
            </div>
          </div>
        ) : (
          <div className="row">
            <div className="field">
              <label>Digit A</label>
              <input
                type="number"
                min={0}
                max={9}
                value={a}
                onChange={(e) => setA(Math.min(9, Math.max(0, Number(e.target.value) || 0)))}
              />
            </div>
            <div className="field">
              <label>Digit B</label>
              <input
                type="number"
                min={0}
                max={9}
                value={b}
                onChange={(e) => setB(Math.min(9, Math.max(0, Number(e.target.value) || 0)))}
              />
            </div>
            <div className="field">
              <label>Cin</label>
              <select value={cin} onChange={(e) => setCin(Number(e.target.value))}>
                <option value={0}>0</option>
                <option value={1}>1</option>
              </select>
            </div>
          </div>
        )}

        {mode === 'convert' && parsed == null && (
          <p className="hint" style={{ marginTop: '0.75rem' }}>
            Enter a valid {FORMAT_OPTIONS.find((f) => f.id === from)?.label} value to start the lesson.
          </p>
        )}

        {steps.length > 0 && (
          <>
            <div className="row" style={{ marginTop: '0.85rem', alignItems: 'center' }}>
              <button type="button" className="btn" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
                ← Prev
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  if (step >= max) setStep(0)
                  setPlaying((p) => !p)
                }}
              >
                {playing ? 'Pause' : step >= max ? 'Replay' : 'Play animation'}
              </button>
              <button
                type="button"
                className="btn"
                disabled={step >= max}
                onClick={() => setStep((s) => Math.min(max, s + 1))}
              >
                Next →
              </button>
              <div className="field" style={{ flex: '1 1 200px', minWidth: 160 }}>
                <label>Delay between steps: {delayMs} ms</label>
                <input
                  type="range"
                  min={200}
                  max={4000}
                  step={100}
                  value={delayMs}
                  onChange={(e) => setDelayMs(Number(e.target.value))}
                />
              </div>
              <span className="hint" style={{ alignSelf: 'center' }}>
                Step {step + 1} / {steps.length}
                {current?.stage ? ` · ${current.stage}` : ''}
              </span>
            </div>
            <div className="progress">
              {steps.map((_, i) => (
                <button key={i} type="button" className={i === step ? 'on' : ''} onClick={() => setStep(i)} />
              ))}
            </div>
          </>
        )}
      </div>

      {current && (
        <div className="lesson-layout" style={{ marginTop: '1rem' }}>
          <div className="panel">
            <h2 className="step-title">{current.title}</h2>
            <p className="explain">{current.explanation}</p>
            <div className="math-box">
              <strong>Math</strong>
              {current.math}
            </div>
            <div className="hw-box">
              <strong>Hardware in action</strong>
              {current.hardware}
            </div>
          </div>

          <div className="panel alu">
            {current.bits && (
              <div className="alu-block hot">
                <h4>{current.bitsLabel ?? 'Bits'}</h4>
                <BitStrip bits={current.bits.replace(/[^01]/g, '') || '0'} invalid={current.invalid} pulse={current.pulse} />
              </div>
            )}
            {(current.rows ?? []).map((row) => (
              <div key={row.label} className={`alu-block ${row.hot ? 'hot' : ''}`}>
                <h4>{row.label}</h4>
                <div className="val" style={{ color: row.hot ? 'var(--teal)' : undefined, wordBreak: 'break-all' }}>
                  {row.value}
                </div>
                {row.bits && <BitStrip bits={row.bits} pulse={row.hot} />}
              </div>
            ))}
            {!current.bits && !(current.rows?.length) && (
              <div className="alu-block">
                <h4>Visual</h4>
                <p className="hint" style={{ margin: 0 }}>
                  Follow the math panel — this step is conceptual.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
