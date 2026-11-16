import { Fragment, useMemo, useState } from 'react'
import {
  cellMinterm,
  emptyMap,
  kmapAxes,
  minimizePOS,
  minimizeSOP,
  type CellVal,
  type VarCount,
  VAR_NAMES,
} from '../lib/karnaugh'

const COLORS = ['#3ecf9a', '#e8b84a', '#5b8def', '#e06b6b', '#c678dd', '#d4894a']

function cycle(v: CellVal): CellVal {
  if (v === 0) return 1
  if (v === 1) return 'X'
  return 0
}

export function KarnaughPage() {
  const [vars, setVars] = useState<VarCount>(3)
  const [cells, setCells] = useState<CellVal[]>(() => emptyMap(3))
  const [showDontCare, setShowDontCare] = useState(true)

  const axes = useMemo(() => kmapAxes(vars), [vars])
  const result = useMemo(() => minimizeSOP(cells, vars), [cells, vars])
  const pos = useMemo(() => minimizePOS(cells, vars), [cells, vars])

  const setVarCount = (v: VarCount) => {
    setVars(v)
    setCells(emptyMap(v))
  }

  const toggle = (minterm: number) => {
    setCells((prev) => {
      const next = [...prev]
      next[minterm] = showDontCare ? cycle(next[minterm]) : next[minterm] === 1 ? 0 : 1
      return next
    })
  }

  const groupOf = (m: number): number => {
    const idx = result.groups.findIndex((g) => g.minterms.includes(m) || (cells[m] === 'X' && evalCover(g, m, vars)))
    // Prefer groups that actually cover for display
    for (let i = 0; i < result.groups.length; i++) {
      const g = result.groups[i]
      const care = g.mask
      if ((m & care) === (g.bits & care)) return i
    }
    return idx
  }

  return (
    <div className="page">
      <section className="hero" style={{ paddingBottom: '0.75rem' }}>
        <div className="kicker">מפות קרנו · Karnaugh maps</div>
        <h1>
          Circle the ones.
          <br />
          <em>Read the minimal SOP.</em>
        </h1>
        <p>
          Click cells: 0 → 1 → X (don’t care). Groups wrap on edges — same Gray-code adjacency you use on
          paper. Minimization via Quine–McCluskey.
        </p>
      </section>

      <div className="panel">
        <div className="row" style={{ alignItems: 'end' }}>
          <div className="field" style={{ flex: '0 0 140px' }}>
            <label>Variables</label>
            <select value={vars} onChange={(e) => setVarCount(Number(e.target.value) as VarCount)}>
              <option value={2}>2 — A B</option>
              <option value={3}>3 — A B C</option>
              <option value={4}>4 — A B C D</option>
            </select>
          </div>
          <label className="hint" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={showDontCare} onChange={(e) => setShowDontCare(e.target.checked)} />
            Allow X (don’t cares)
          </label>
          <button type="button" className="btn" onClick={() => setCells(emptyMap(vars))}>
            Clear
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setCells(Array.from({ length: 1 << vars }, () => 1))}
          >
            All 1s
          </button>
        </div>
      </div>

      <div className="lesson-layout" style={{ marginTop: '1rem' }}>
        <div className="panel">
          <div className="kmap-wrap">
            <div className="kmap-label top">
              {axes.colVars.join('')} →
            </div>
            <div className="kmap-grid" style={{ gridTemplateColumns: `auto repeat(${axes.cols.length}, 1fr)` }}>
              <div className="kmap-corner">
                <span>{axes.rowVars.join('')}</span>
                <span>╲</span>
                <span>{axes.colVars.join('')}</span>
              </div>
              {axes.cols.map((c) => (
                <div key={`h-${c}`} className="kmap-head">
                  {c.toString(2).padStart(axes.colVars.length, '0')}
                </div>
              ))}
              {axes.rows.map((r) => (
                <Fragment key={`row-${r}`}>
                  <div className="kmap-head">{r.toString(2).padStart(axes.rowVars.length, '0')}</div>
                  {axes.cols.map((c) => {
                    const m = cellMinterm(vars, r, c)
                    const v = cells[m]
                    const gi = groupOf(m)
                    const color = v === 1 || v === 'X' ? COLORS[gi % COLORS.length] : undefined
                    return (
                      <button
                        key={`c-${r}-${c}`}
                        type="button"
                        className={`kmap-cell ${v === 1 ? 'one' : v === 'X' ? 'dc' : ''}`}
                        style={color && v !== 0 ? { boxShadow: `inset 0 0 0 2px ${color}` } : undefined}
                        onClick={() => toggle(m)}
                        title={`m${m}`}
                      >
                        <small>m{m}</small>
                        <strong>{v}</strong>
                      </button>
                    )
                  })}
                </Fragment>
              ))}
            </div>
            <p className="hint" style={{ marginTop: '0.75rem' }}>
              Vars: {VAR_NAMES.slice(0, vars).join(', ')} · Gray headers = adjacent cells differ by 1 bit
              (including wrap).
            </p>
          </div>
        </div>

        <div className="panel">
          <h2 className="step-title">Minimized result</h2>
          <div className="math-box">
            <strong>SOP (sum of products)</strong>
            F = {result.expression}
          </div>
          <div className="math-box">
            <strong>POS (product of sums)</strong>
            F = {pos.expression}
          </div>
          <div className="hw-box">
            <strong>Groups (prime implicants used)</strong>
            {result.groups.length === 0
              ? 'None — function is 0'
              : result.groups.map((g, i) => (
                  <div key={g.term} style={{ color: COLORS[i % COLORS.length], marginTop: 6 }}>
                    {g.term} · covers m({g.minterms.filter((m) => cells[m] === 1).join(',')})
                  </div>
                ))}
          </div>
          <p className="explain" style={{ marginTop: '0.75rem' }}>
            Hardware link: each product term is an AND gate (literals); the SOP is an OR of those ANDs —
            two-level AND-OR (or NAND-NAND) logic.
          </p>
        </div>
      </div>
    </div>
  )
}

function evalCover(
  g: { bits: number; mask: number },
  m: number,
  _vars: VarCount,
): boolean {
  return (m & g.mask) === (g.bits & g.mask)
}
