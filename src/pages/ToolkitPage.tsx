import { useMemo, useState } from 'react'
import {
  COLOR_BANDS,
  convertPrefix,
  decodeResistor,
  ohmsLaw,
  seriesRLC,
  UNIT_PREFIXES,
  formatOhms,
} from '../lib/eeCalcs'

const FORMULAS = [
  { title: 'Ohm / power', body: 'V = IR\nP = VI = I²R = V²/R' },
  { title: 'Series / parallel R', body: 'Rs = R1+R2+…\n1/Rp = 1/R1 + 1/R2 + …' },
  { title: 'Capacitor', body: 'i = C dv/dt\nXc = 1/(ωC)\nτ = RC' },
  { title: 'Inductor', body: 'v = L di/dt\nXL = ωL\nτ = L/R' },
  { title: 'AC phasor', body: 'Z = R + jX\n|Z| = √(R²+X²)\nθ = atan(X/R)' },
  { title: 'Resonance (series)', body: 'ω₀ = 1/√(LC)\nf₀ = 1/(2π√(LC))\nQ = ω₀L/R' },
  { title: 'Digital', body: 'G = B ⊕ (B≫1)  (Gray)\nBCD digit ≤ 1001\n+6 corrects illegal BCD' },
  { title: 'Boolean', body: "De Morgan: (AB)' = A'+B'\n(A+B)' = A'B'\nConsensus / K-map grouping" },
]

export function ToolkitPage() {
  const [b0, setB0] = useState(1)
  const [b1, setB1] = useState(0)
  const [b2, setB2] = useState(2)
  const [b3, setB3] = useState(10) // gold

  const [V, setV] = useState('12')
  const [I, setI] = useState('')
  const [R, setR] = useState('220')
  const [P, setP] = useState('')

  const [rR, setRR] = useState(100)
  const [rL, setRL] = useState(0.1)
  const [rC, setRC] = useState(1e-6)
  const [rF, setRF] = useState(1000)

  const [uVal, setUVal] = useState(4.7)
  const [uFrom, setUFrom] = useState(1e-6)
  const [uTo, setUTo] = useState(1)

  const color = useMemo(() => decodeResistor([b0, b1, b2, b3]), [b0, b1, b2, b3])
  const ohm = useMemo(() => {
    const num = (s: string) => (s.trim() === '' ? undefined : Number(s))
    return ohmsLaw({ V: num(V), I: num(I), R: num(R), P: num(P) })
  }, [V, I, R, P])
  const rlc = useMemo(() => seriesRLC(rR, rL, rC, rF), [rR, rL, rC, rF])
  const converted = convertPrefix(uVal, uFrom, uTo)

  const digitBands = COLOR_BANDS.filter((c) => c.value >= 0)
  const multBands = COLOR_BANDS.filter((c) => c.mult != null)
  const tolBands = COLOR_BANDS.filter((c) => c.tol != null)

  return (
    <div className="page">
      <section className="hero" style={{ paddingBottom: '0.75rem' }}>
        <div className="kicker">EE toolkit · ארגז כלים</div>
        <h1>
          Calculators &
          <br />
          <em>formula sheet.</em>
        </h1>
        <p>Resistor colors, Ohm’s law, series RLC phasors, SI prefixes — the stuff you reach for in every lab.</p>
      </section>

      <div className="panel" id="color">
        <h2 className="step-title">Resistor color code · קוד צבעים</h2>
        <div className="resistor-preview">
          <div className="res-body">
            {[b0, b1, b2, b3].map((bi, i) => (
              <div key={i} className="res-band" style={{ background: COLOR_BANDS[bi].hex }} />
            ))}
          </div>
          <div className="math-box" style={{ margin: 0, flex: 1 }}>
            <strong>Value</strong>
            {color.text}
          </div>
        </div>
        <div className="row" style={{ marginTop: '0.75rem' }}>
          <div className="field">
            <label>1st digit</label>
            <select value={b0} onChange={(e) => setB0(Number(e.target.value))}>
              {digitBands.map((c) => (
                <option key={c.name} value={COLOR_BANDS.indexOf(c)}>
                  {c.name} / {c.he} ({c.value})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>2nd digit</label>
            <select value={b1} onChange={(e) => setB1(Number(e.target.value))}>
              {digitBands.map((c) => (
                <option key={c.name} value={COLOR_BANDS.indexOf(c)}>
                  {c.name} / {c.he} ({c.value})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Multiplier</label>
            <select value={b2} onChange={(e) => setB2(Number(e.target.value))}>
              {multBands.map((c) => (
                <option key={c.name} value={COLOR_BANDS.indexOf(c)}>
                  {c.name} ×{c.mult}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Tolerance</label>
            <select value={b3} onChange={(e) => setB3(Number(e.target.value))}>
              {tolBands.map((c) => (
                <option key={c.name} value={COLOR_BANDS.indexOf(c)}>
                  {c.name} ±{c.tol}%
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="panel" id="ohm" style={{ marginTop: '1rem' }}>
        <h2 className="step-title">Ohm’s law & power</h2>
        <p className="hint">Fill any two fields — the rest solve automatically.</p>
        <div className="row">
          {(
            [
              ['V (V)', V, setV],
              ['I (A)', I, setI],
              ['R (Ω)', R, setR],
              ['P (W)', P, setP],
            ] as const
          ).map(([label, val, set]) => (
            <div className="field" key={label}>
              <label>{label}</label>
              <input value={val} onChange={(e) => set(e.target.value)} inputMode="decimal" />
            </div>
          ))}
        </div>
        {ohm ? (
          <div className="result-grid" style={{ marginTop: '0.85rem' }}>
            <div className="result-tile">
              <div className="lbl">V</div>
              <div className="val">{ohm.V.toPrecision(4)} V</div>
            </div>
            <div className="result-tile">
              <div className="lbl">I</div>
              <div className="val">{ohm.I.toPrecision(4)} A</div>
            </div>
            <div className="result-tile">
              <div className="lbl">R</div>
              <div className="val">{formatOhms(ohm.R)}</div>
            </div>
            <div className="result-tile">
              <div className="lbl">P</div>
              <div className="val">{ohm.P.toPrecision(4)} W</div>
            </div>
          </div>
        ) : (
          <p className="hint">Need at least two known values.</p>
        )}
      </div>

      <div className="panel" id="rlc" style={{ marginTop: '1rem' }}>
        <h2 className="step-title">AC · series RLC phasors</h2>
        <div className="row">
          <div className="field">
            <label>R (Ω)</label>
            <input type="number" value={rR} onChange={(e) => setRR(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>L (H)</label>
            <input type="number" value={rL} step="any" onChange={(e) => setRL(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>C (F)</label>
            <input type="number" value={rC} step="any" onChange={(e) => setRC(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>f (Hz)</label>
            <input type="number" value={rF} onChange={(e) => setRF(Number(e.target.value))} />
          </div>
        </div>
        <div className="result-grid" style={{ marginTop: '0.85rem' }}>
          <div className="result-tile">
            <div className="lbl">XL</div>
            <div className="val">{rlc.XL.toFixed(2)} Ω</div>
          </div>
          <div className="result-tile">
            <div className="lbl">XC</div>
            <div className="val">{Number.isFinite(rlc.XC) ? `${rlc.XC.toFixed(2)} Ω` : '∞'}</div>
          </div>
          <div className="result-tile">
            <div className="lbl">|Z| ∠θ</div>
            <div className="val">
              {rlc.Z.mag.toFixed(2)} Ω ∠ {rlc.Z.deg.toFixed(1)}°
            </div>
          </div>
          <div className="result-tile">
            <div className="lbl">f₀ (resonance)</div>
            <div className="val">{Number.isFinite(rlc.resonant) ? `${rlc.resonant.toFixed(1)} Hz` : '—'}</div>
          </div>
          <div className="result-tile">
            <div className="lbl">Power factor</div>
            <div className="val">{rlc.pf.toFixed(3)}</div>
          </div>
        </div>
        <p className="hint">Z = R + j(XL − XC). Lagging if X&gt;0 (inductive), leading if X&lt;0 (capacitive).</p>
      </div>

      <div className="panel" id="units" style={{ marginTop: '1rem' }}>
        <h2 className="step-title">SI prefix converter</h2>
        <div className="row">
          <div className="field">
            <label>Value</label>
            <input type="number" value={uVal} step="any" onChange={(e) => setUVal(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>From</label>
            <select value={uFrom} onChange={(e) => setUFrom(Number(e.target.value))}>
              {UNIT_PREFIXES.map((p) => (
                <option key={p.name || 'unit'} value={p.mult}>
                  {p.name || '(none)'} ×{p.mult}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>To</label>
            <select value={uTo} onChange={(e) => setUTo(Number(e.target.value))}>
              {UNIT_PREFIXES.map((p) => (
                <option key={`to-${p.name || 'unit'}`} value={p.mult}>
                  {p.name || '(none)'} ×{p.mult}
                </option>
              ))}
            </select>
          </div>
          <div className="result-tile" style={{ flex: 1, minWidth: 120 }}>
            <div className="lbl">Result</div>
            <div className="val">{converted.toPrecision(6)}</div>
          </div>
        </div>
      </div>

      <div className="panel" id="sheet" style={{ marginTop: '1rem' }}>
        <h2 className="step-title">Formula sheet · דף נוסחאות</h2>
        <div className="grid-cards">
          {FORMULAS.map((f) => (
            <div key={f.title} className="card-link" style={{ cursor: 'default' }}>
              <strong>{f.title}</strong>
              <pre className="formula-pre">{f.body}</pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
