import { useMemo, useState } from 'react'
import { BitStrip } from '../components/BitStrip'
import {
  convertAll,
  parseFlexibleInput,
  type RadixFormat,
} from '../lib/conversions'

const formats: { id: RadixFormat; label: string; placeholder: string }[] = [
  { id: 'decimal', label: 'Decimal', placeholder: '42' },
  { id: 'binary', label: 'Binary', placeholder: '101010' },
  { id: 'bcd', label: 'BCD nibbles', placeholder: '01000010' },
  { id: 'gray', label: 'Gray code', placeholder: '111111' },
  { id: 'hex', label: 'Hex', placeholder: '2A' },
  { id: 'octal', label: 'Octal', placeholder: '52' },
]

export function ConvertPage() {
  const [format, setFormat] = useState<RadixFormat>('decimal')
  const [raw, setRaw] = useState('42')

  const value = useMemo(() => parseFlexibleInput(raw, format), [raw, format])
  const all = useMemo(() => (value == null ? null : convertAll(value)), [value])

  return (
    <div className="page">
      <section className="hero" style={{ paddingBottom: '1rem' }}>
        <div className="kicker">Radix playground</div>
        <h1>
          Put a number in.
          <br />
          <em>Get every encoding out.</em>
        </h1>
        <p>Same integer, different wires. Gray is for rotary encoders; BCD keeps decimal digits honest in hardware.</p>
      </section>

      <div className="panel">
        <div className="row">
          <div className="field" style={{ flex: '0 0 180px' }}>
            <label>Input format</label>
            <select value={format} onChange={(e) => setFormat(e.target.value as RadixFormat)}>
              {formats.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Value</label>
            <input
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={formats.find((f) => f.id === format)?.placeholder}
              spellCheck={false}
            />
          </div>
        </div>

        {value == null || !all ? (
          <p className="hint" style={{ marginTop: '1rem' }}>
            Enter a valid non-negative value for the selected format.
          </p>
        ) : (
          <>
            <div className="result-grid">
              <div className="result-tile">
                <div className="lbl">Decimal</div>
                <div className="val">{all.decimal}</div>
              </div>
              <div className="result-tile">
                <div className="lbl">Binary</div>
                <div className="val">{all.binary}</div>
                <BitStrip bits={all.binary} />
              </div>
              <div className="result-tile">
                <div className="lbl">BCD (nibbles)</div>
                <div className="val">{all.bcd}</div>
                <BitStrip bits={all.bcd.replace(/\s/g, '')} />
              </div>
              <div className="result-tile">
                <div className="lbl">Gray code</div>
                <div className="val">{all.gray}</div>
                <BitStrip bits={all.gray} />
              </div>
              <div className="result-tile">
                <div className="lbl">Hex</div>
                <div className="val">0x{all.hex}</div>
              </div>
              <div className="result-tile">
                <div className="lbl">Octal</div>
                <div className="val">0o{all.octal}</div>
              </div>
            </div>
            <p className="hint" style={{ marginTop: '1rem' }}>
              Gray tip: only one bit flips between adjacent values — G = B ⊕ (B≫1). BCD tip: each decimal
              digit is its own 4-bit group (never A–F).
            </p>
          </>
        )}
      </div>
    </div>
  )
}
