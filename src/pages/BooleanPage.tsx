import { useMemo, useState } from 'react'
import { canonicalForms, truthTable } from '../lib/boolean'
import { minimizeSOP, type VarCount, VAR_NAMES, emptyMap, type CellVal } from '../lib/karnaugh'
import { Link } from 'react-router-dom'

export function BooleanPage() {
  const [vars, setVars] = useState<VarCount>(3)
  const [outputs, setOutputs] = useState<(0 | 1)[]>(() => Array.from({ length: 8 }, () => 0))

  const setVarCount = (v: VarCount) => {
    setVars(v)
    setOutputs(Array.from({ length: 1 << v }, () => 0))
  }

  const rows = useMemo(() => truthTable(vars, outputs), [vars, outputs])
  const forms = useMemo(() => canonicalForms(vars, outputs), [vars, outputs])
  const minimized = useMemo(() => {
    const cells = outputs.map((o) => o as CellVal)
    while (cells.length < 1 << vars) cells.push(0)
    return minimizeSOP(cells.length ? cells : emptyMap(vars), vars)
  }, [outputs, vars])

  return (
    <div className="page">
      <section className="hero" style={{ paddingBottom: '0.75rem' }}>
        <div className="kicker">Boolean algebra · טבלת אמת</div>
        <h1>
          Truth in.
          <br />
          <em>Algebra out.</em>
        </h1>
        <p>
          Fill the output column. Get canonical SOP / POS and a minimized expression — then jump to the{' '}
          <Link to="/kmap" style={{ color: 'var(--copper)' }}>
            Karnaugh map
          </Link>{' '}
          for the visual grouping story.
        </p>
      </section>

      <div className="panel">
        <div className="row">
          <div className="field" style={{ flex: '0 0 160px' }}>
            <label>Variables</label>
            <select value={vars} onChange={(e) => setVarCount(Number(e.target.value) as VarCount)}>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </div>
          <button type="button" className="btn" onClick={() => setOutputs(outputs.map(() => 0))}>
            All 0
          </button>
          <button type="button" className="btn" onClick={() => setOutputs(outputs.map(() => 1))}>
            All 1
          </button>
        </div>
      </div>

      <div className="lesson-layout" style={{ marginTop: '1rem' }}>
        <div className="panel" style={{ overflowX: 'auto' }}>
          <table className="ee-table">
            <thead>
              <tr>
                <th>m</th>
                {VAR_NAMES.slice(0, vars).map((v) => (
                  <th key={v}>{v}</th>
                ))}
                <th>F</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.row}>
                  <td>{r.row}</td>
                  {r.bits.split('').map((b, i) => (
                    <td key={i}>{b}</td>
                  ))}
                  <td>
                    <button
                      type="button"
                      className={`bit ${r.out ? 'on' : ''}`}
                      style={{ width: '2.2rem', margin: '0 auto' }}
                      onClick={() =>
                        setOutputs((prev) => {
                          const n = [...prev]
                          n[r.row] = prev[r.row] ? 0 : 1
                          return n
                        })
                      }
                    >
                      {r.out}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="math-box">
            <strong>Canonical SOP · Σm</strong>
            Σm({forms.minterms.join(', ') || '—'})
            {'\n'}
            {forms.sop}
          </div>
          <div className="math-box">
            <strong>Canonical POS · ΠM</strong>
            ΠM({forms.maxterms.join(', ') || '—'})
            {'\n'}
            {forms.pos}
          </div>
          <div className="hw-box">
            <strong>Minimized SOP</strong>
            F = {minimized.expression}
          </div>
        </div>
      </div>
    </div>
  )
}
