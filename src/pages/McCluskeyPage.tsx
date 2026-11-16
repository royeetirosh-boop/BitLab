import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  buildMcCluskey,
  implicantPattern,
  type QMVarCount,
  VAR_NAMES,
} from '../lib/karnaugh'

function parseList(raw: string, max: number): number[] {
  return raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 0 && n < max)
}

export function McCluskeyPage() {
  const [vars, setVars] = useState<QMVarCount>(4)
  const [onRaw, setOnRaw] = useState('0, 2, 5, 6, 7, 8, 10, 13')
  const [dcRaw, setDcRaw] = useState('4, 15')
  const [stageView, setStageView] = useState(0)
  const [delayMs, setDelayMs] = useState(1200)
  const [playing, setPlaying] = useState(false)

  const on = useMemo(() => parseList(onRaw, 1 << vars), [onRaw, vars])
  const dc = useMemo(() => parseList(dcRaw, 1 << vars), [dcRaw, vars])
  const result = useMemo(() => buildMcCluskey(on, dc, vars), [on, dc, vars])

  const slides = useMemo(() => {
    return [
      { kind: 'step' as const, idx: 0, title: result.steps[0]?.title ?? 'Start' },
      ...result.stages.map((st, i) => ({ kind: 'table' as const, idx: i, title: st.title })),
      { kind: 'step' as const, idx: 2, title: result.steps[2]?.title ?? 'Chart' },
      { kind: 'chart' as const, idx: 0, title: 'Prime implicant chart' },
      { kind: 'step' as const, idx: 3, title: result.steps[3]?.title ?? 'Cover' },
      { kind: 'done' as const, idx: 0, title: 'Final expression' },
    ]
  }, [result])

  const max = Math.max(0, slides.length - 1)
  const slide = slides[Math.min(stageView, max)] ?? slides[0]

  useEffect(() => {
    setStageView(0)
    setPlaying(false)
  }, [vars, onRaw, dcRaw])

  useEffect(() => {
    if (!playing) return
    if (stageView >= max) {
      setPlaying(false)
      return
    }
    const t = window.setTimeout(() => setStageView((s) => Math.min(s + 1, max)), delayMs)
    return () => window.clearTimeout(t)
  }, [playing, stageView, max, delayMs])

  const stage = slide?.kind === 'table' ? result.stages[slide.idx] : null

  return (
    <div className="page">
      <section className="hero" style={{ paddingBottom: '0.75rem' }}>
        <div className="kicker">Quine–McCluskey · טבלאות מקלקסקי</div>
        <h1>
          Tabular minimization.
          <br />
          <em>When K-maps get crowded.</em>
        </h1>
        <p>
          Same algorithm that powers the{' '}
          <Link to="/kmap" style={{ color: 'var(--copper)' }}>
            Karnaugh map
          </Link>
          , shown the textbook way: group by # of 1s → combine → prime-implicant chart → essentials.
        </p>
      </section>

      <div className="panel">
        <div className="row">
          <div className="field" style={{ flex: '0 0 120px' }}>
            <label>Variables</label>
            <select value={vars} onChange={(e) => setVars(Number(e.target.value) as QMVarCount)}>
              <option value={2}>2 — AB</option>
              <option value={3}>3 — ABC</option>
              <option value={4}>4 — ABCD</option>
              <option value={5}>5 — ABCDE</option>
            </select>
          </div>
          <div className="field">
            <label>ON minterms (Σm)</label>
            <input value={onRaw} onChange={(e) => setOnRaw(e.target.value)} spellCheck={false} />
          </div>
          <div className="field">
            <label>Don’t cares (X) — optional</label>
            <input value={dcRaw} onChange={(e) => setDcRaw(e.target.value)} spellCheck={false} />
          </div>
        </div>
        <p className="hint" style={{ marginTop: '0.65rem' }}>
          Parsed ON: [{on.join(', ') || '—'}]
          {dc.length ? ` · X: [${dc.join(', ')}]` : ''} · vars {VAR_NAMES.slice(0, vars).join(', ')}
        </p>

        <div className="row" style={{ marginTop: '0.85rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn"
            disabled={stageView === 0}
            onClick={() => setStageView((s) => Math.max(0, s - 1))}
          >
            ← Prev
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              if (stageView >= max) setStageView(0)
              setPlaying((p) => !p)
            }}
          >
            {playing ? 'Pause' : stageView >= max ? 'Replay' : 'Play tables'}
          </button>
          <button
            type="button"
            className="btn"
            disabled={stageView >= max}
            onClick={() => setStageView((s) => Math.min(max, s + 1))}
          >
            Next →
          </button>
          <div className="field" style={{ flex: '1 1 180px' }}>
            <label>Delay: {delayMs} ms</label>
            <input
              type="range"
              min={300}
              max={3000}
              step={100}
              value={delayMs}
              onChange={(e) => setDelayMs(Number(e.target.value))}
            />
          </div>
          <span className="hint">
            {stageView + 1}/{slides.length} · {slide?.title}
          </span>
        </div>
        <div className="progress">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              className={i === stageView ? 'on' : ''}
              onClick={() => setStageView(i)}
            />
          ))}
        </div>
      </div>

      <div className="lesson-layout" style={{ marginTop: '1rem' }}>
        <div className="panel">
          <h2 className="step-title">{slide?.title}</h2>

          {slide?.kind === 'step' && <p className="explain">{result.steps[slide.idx]?.body}</p>}

          {slide?.kind === 'table' && stage && (
            <>
              <p className="explain">{stage.explanation}</p>
              <div style={{ overflowX: 'auto' }}>
                <table className="ee-table qm-table">
                  <thead>
                    <tr>
                      <th>Group</th>
                      <th>Minterms</th>
                      <th>Pattern</th>
                      <th>Term</th>
                      <th>✓</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stage.rows.map((row, i) => (
                      <tr
                        key={`${row.pattern}-${i}`}
                        className={row.checked ? 'qm-checked' : 'qm-prime'}
                      >
                        <td>{row.group}</td>
                        <td>({row.minterms.join(', ')})</td>
                        <td className="qm-pat">{row.pattern}</td>
                        <td>{row.term}</td>
                        <td>{row.checked ? '✓' : '·'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="hint" style={{ marginTop: '0.65rem' }}>
                Rows without ✓ are (candidates for) prime implicants.
              </p>
            </>
          )}

          {slide?.kind === 'chart' && (
            <>
              <p className="explain">
                Each ★ marks coverage. A column with a single ★ makes that prime implicant{' '}
                <em>essential</em>.
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table className="ee-table qm-table">
                  <thead>
                    <tr>
                      <th>Prime implicant</th>
                      {result.on.map((m) => (
                        <th key={m}>m{m}</th>
                      ))}
                      <th>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.primes.map((p, pi) => {
                      const essential = result.essentialIdx.includes(pi)
                      const selected = result.selectedIdx.includes(pi)
                      return (
                        <tr
                          key={`${p.term}-${pi}`}
                          className={essential ? 'qm-essential' : selected ? 'qm-selected' : ''}
                        >
                          <td>
                            {p.term}
                            <div className="hint">
                              {implicantPattern(p.bits, p.mask, vars)} · m({p.minterms.join(',')})
                            </div>
                          </td>
                          {result.coverage[pi]?.map((hit, mi) => (
                            <td key={mi}>{hit ? '★' : ''}</td>
                          ))}
                          <td>{essential ? 'essential' : selected ? 'in cover' : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {slide?.kind === 'done' && (
            <>
              <div className="math-box">
                <strong>Minimized SOP</strong>
                F = {result.expression}
              </div>
              <div className="hw-box">
                <strong>Hardware</strong>
                Each product term → AND (inverters on primed literals). Sum → OR. Same two-level
                network as a K-map solution.
              </div>
            </>
          )}
        </div>

        <div className="panel alu">
          <div className="alu-block hot">
            <h4>Function</h4>
            <div className="hint" style={{ whiteSpace: 'pre-wrap' }}>
              Σm({result.on.join(', ') || '—'})
              {result.dc.length ? `\nX(${result.dc.join(', ')})` : ''}
            </div>
          </div>
          <div className="alu-block">
            <h4>Live result</h4>
            <div className="val" style={{ color: 'var(--teal)', wordBreak: 'break-all' }}>
              F = {result.expression}
            </div>
          </div>
          <div className="alu-block">
            <h4>Compare</h4>
            <p className="hint" style={{ margin: 0 }}>
              For ≤4 variables, solve the same minterms on the{' '}
              <Link to="/kmap" style={{ color: 'var(--copper)' }}>
                K-map
              </Link>{' '}
              — answers should match.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
