import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { CircuitSymbol, partPortPos, partSize } from '../components/CircuitSymbol'
import {
  CIRCUIT_PALETTE,
  PART_META,
  simulateCircuit,
  type CircuitNet,
  type CircuitPart,
  type PartType,
} from '../lib/circuitSim'

let seq = 1
const pid = () => `p${seq++}`
const nid = () => `c${seq++}`

type Tool = 'select' | 'wire'

export function CircuitLabPage() {
  const [parts, setParts] = useState<CircuitPart[]>([
    { id: 'bat', type: 'battery', x: 40, y: 180, rot: 0, value: 5, label: '5V' },
    { id: 'r1', type: 'resistor', x: 200, y: 80, rot: 0, value: 220, label: '220Ω' },
    { id: 'led1', type: 'led', x: 380, y: 80, rot: 0, value: 0, label: 'LAMP' },
    { id: 'sw1', type: 'switch', x: 200, y: 260, rot: 0, value: 0, on: true, label: 'SW' },
  ])
  const [nets, setNets] = useState<CircuitNet[]>([
    { id: 'c1', aId: 'bat', aPort: 1, bId: 'r1', bPort: 0 },
    { id: 'c2', aId: 'r1', aPort: 1, bId: 'led1', bPort: 0 },
    { id: 'c3', aId: 'led1', aPort: 1, bId: 'sw1', bPort: 0 },
    { id: 'c4', aId: 'sw1', aPort: 1, bId: 'bat', bPort: 0 },
  ])
  const [selected, setSelected] = useState<string | null>('bat')
  const [tool, setTool] = useState<Tool>('wire')
  const [pending, setPending] = useState<{ id: string; port: 0 | 1 } | null>(null)
  const [drag, setDrag] = useState<{ id: string; ox: number; oy: number } | null>(null)
  const [lang, setLang] = useState<'en' | 'he'>('he')
  const [running, setRunning] = useState(false)
  const [pulse, setPulse] = useState(0)
  const [delayMs, setDelayMs] = useState(400)

  const sim = useMemo(() => simulateCircuit(parts, nets), [parts, nets])
  const selectedPart = parts.find((p) => p.id === selected)

  useEffect(() => {
    if (!running || !sim.ok) return
    const t = window.setInterval(() => setPulse((p) => p + 1), Math.max(80, delayMs))
    return () => window.clearInterval(t)
  }, [running, sim.ok, delayMs])

  const addPart = (type: PartType) => {
    const id = pid()
    const defaults: Record<PartType, number> = {
      battery: 5,
      resistor: 330,
      led: 0,
      bulb: 0,
      switch: 0,
      ground: 0,
      diode: 0,
      fuse: 0,
      ammeter: 0,
      voltmeter: 0,
      wire: 0,
    }
    setParts((prev) => [
      ...prev,
      {
        id,
        type,
        x: 70 + (prev.length % 6) * 24,
        y: 70 + (prev.length % 5) * 24,
        rot: 0,
        value: defaults[type],
        on: type === 'switch' ? true : undefined,
        label: PART_META[type].label,
      },
    ])
    setSelected(id)
    setTool('select')
  }

  const absPort = (p: CircuitPart, port: 0 | 1) => {
    const local = partPortPos(p.type, port)
    return { x: p.x + local.x, y: p.y + local.y }
  }

  const connect = (id: string, port: 0 | 1) => {
    if (tool !== 'wire' && !pending) {
      setTool('wire')
    }
    if (!pending) {
      setPending({ id, port })
      return
    }
    if (pending.id === id && pending.port === port) {
      setPending(null)
      return
    }
    setNets((prev) => [
      ...prev,
      { id: nid(), aId: pending.id, aPort: pending.port, bId: id, bPort: port },
    ])
    setPending(null)
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!drag) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setParts((prev) =>
      prev.map((p) =>
        p.id === drag.id
          ? { ...p, x: e.clientX - rect.left - drag.ox, y: e.clientY - rect.top - drag.oy }
          : p,
      ),
    )
  }

  const t = (en: string, he: string) => (lang === 'he' ? he : en)
  const pathGlow = running && sim.ok

  return (
    <div className="page" style={{ width: 'min(1200px, calc(100% - 2rem))' }}>
      <section className="hero" style={{ paddingBottom: '0.75rem' }}>
        <div className="kicker">{t('DC circuit studio', 'סטודיו מעגלים חשמליים')}</div>
        <h1 className={lang === 'he' ? 'he' : undefined}>
          {lang === 'he' ? (
            <>
              בנו מעגל.
              <br />
              <em>הריצו אותו.</em>
            </>
          ) : (
            <>
              Build a loop.
              <br />
              <em>Run it.</em>
            </>
          )}
        </h1>
        <p>
          {t(
            'Traditional schematic symbols. Wire mode connects terminals. Run animates current on the closed path.',
            'סימנים מוסכמים. מצב חוט מחבר הדקים. הרצה מנפישה זרם במעגל הסגור.',
          )}
        </p>
        <div className="tabs">
          <button type="button" className={lang === 'he' ? 'on' : ''} onClick={() => setLang('he')}>
            עברית
          </button>
          <button type="button" className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>
            English
          </button>
        </div>
      </section>

      <div className="panel" style={{ marginBottom: '0.85rem' }}>
        <div className="row" style={{ alignItems: 'center' }}>
          <button
            type="button"
            className={`btn ${tool === 'select' ? 'primary' : ''}`}
            onClick={() => {
              setTool('select')
              setPending(null)
            }}
          >
            {t('Move', 'הזזה')}
          </button>
          <button
            type="button"
            className={`btn ${tool === 'wire' ? 'primary' : ''}`}
            onClick={() => setTool('wire')}
          >
            {t('Wire tool', 'כלי חוט')}
          </button>
          <button
            type="button"
            className={`btn ${running ? 'primary' : ''}`}
            onClick={() => setRunning((r) => !r)}
            disabled={!sim.ok}
          >
            {running ? t('Stop', 'עצור') : t('Run circuit', 'הרץ מעגל')}
          </button>
          <div className="field" style={{ flex: '1 1 180px', minWidth: 160 }}>
            <label>
              {t('Run pulse delay', 'השהיית פעימה')}: {delayMs} ms
            </label>
            <input
              type="range"
              min={100}
              max={1500}
              step={50}
              value={delayMs}
              onChange={(e) => setDelayMs(Number(e.target.value))}
            />
          </div>
          {pending && (
            <span className="hint">{t('Click second terminal…', 'לחצו על הדק שני…')}</span>
          )}
        </div>
      </div>

      <div className="lab-shell">
        <aside className="panel palette">
          <div className="kicker">{t('Symbols', 'סימנים')}</div>
          {CIRCUIT_PALETTE.map((type) => (
            <button key={type} type="button" className="palette-gate" onClick={() => addPart(type)}>
              <CircuitSymbol type={type} mini on={type === 'switch'} />
              <span>
                {lang === 'he' ? PART_META[type].labelHe : PART_META[type].label}
                <small>{PART_META[type].blurb}</small>
              </span>
            </button>
          ))}
        </aside>

        <div
          className={`canvas-wrap logic-canvas ${tool === 'wire' ? 'wire-mode' : ''}`}
          onPointerMove={onPointerMove}
          onPointerUp={() => setDrag(null)}
          onClick={() => {
            setSelected(null)
            if (tool !== 'wire') setPending(null)
          }}
        >
          <svg className="wires">
            {nets.map((n, idx) => {
              const a = parts.find((p) => p.id === n.aId)
              const b = parts.find((p) => p.id === n.bId)
              if (!a || !b) return null
              const p1 = absPort(a, n.aPort)
              const p2 = absPort(b, n.bPort)
              const onPath = pathGlow && sim.pathNetIds.includes(n.id)
              const dash = onPath ? `${8 + (pulse % 5)} ${6}` : undefined
              return (
                <line
                  key={n.id}
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={onPath ? '#e8b84a' : '#6a8074'}
                  strokeWidth={onPath ? 3 : 2.4}
                  strokeDasharray={dash}
                  style={onPath ? { animationDelay: `${idx * 40}ms` } : undefined}
                />
              )
            })}
          </svg>

          {parts.map((p) => {
            const size = partSize(p.type)
            const lit = !!sim.ledOn[p.id]
            const onPath = pathGlow && sim.pathPartIds.includes(p.id)
            return (
              <div
                key={p.id}
                className={`gate-node ${selected === p.id ? 'selected' : ''}`}
                style={{ left: p.x, top: p.y, width: size.w, height: size.h }}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelected(p.id)
                }}
                onPointerDown={(e) => {
                  if ((e.target as HTMLElement).closest('.port')) return
                  if (tool === 'wire') return
                  e.stopPropagation()
                  const rect = e.currentTarget.getBoundingClientRect()
                  setDrag({ id: p.id, ox: e.clientX - rect.left, oy: e.clientY - rect.top })
                  e.currentTarget.setPointerCapture(e.pointerId)
                }}
              >
                <CircuitSymbol
                  type={p.type}
                  on={p.on}
                  lit={lit}
                  selected={selected === p.id}
                  value={p.value}
                  label={p.label}
                  running={onPath}
                />
                {([0, 1] as const).map((port) => {
                  if (p.type === 'ground' && port === 1) return null
                  const loc = partPortPos(p.type, port)
                  return (
                    <button
                      key={port}
                      type="button"
                      className={`port ${port === 0 ? 'in' : 'out'} gate-port ${pending?.id === p.id && pending.port === port ? 'arm' : ''}`}
                      style={{ left: loc.x - 7, top: loc.y - 7 }}
                      title={t(`terminal ${port}`, `הדק ${port}`)}
                      onClick={(e) => {
                        e.stopPropagation()
                        connect(p.id, port)
                      }}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>

        <aside className="panel inspector">
          <div className="kicker">{t('Meter', 'מד')}</div>
          <div className="chip">
            {sim.ok ? t('Loop OK', 'מעגל תקין') : t('Open / incomplete', 'מעגל פתוח')}
            <small>{sim.message}</small>
          </div>

          {selectedPart && (
            <>
              <div className="chip" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <CircuitSymbol type={selectedPart.type} mini on={selectedPart.on} lit={!!sim.ledOn[selectedPart.id]} />
                <span>
                  {lang === 'he' ? PART_META[selectedPart.type].labelHe : PART_META[selectedPart.type].label}
                </span>
              </div>
              {(selectedPart.type === 'battery' || selectedPart.type === 'resistor') && (
                <div className="field" style={{ marginTop: '0.5rem' }}>
                  <label>{selectedPart.type === 'battery' ? 'V' : 'Ω'}</label>
                  <input
                    type="number"
                    value={selectedPart.value}
                    min={selectedPart.type === 'battery' ? 0.5 : 1}
                    onChange={(e) => {
                      const value = Number(e.target.value) || 0
                      setParts((prev) =>
                        prev.map((p) => (p.id === selectedPart.id ? { ...p, value } : p)),
                      )
                    }}
                  />
                </div>
              )}
              {selectedPart.type === 'switch' && (
                <button
                  type="button"
                  className="btn primary"
                  onClick={() =>
                    setParts((prev) =>
                      prev.map((p) => (p.id === selectedPart.id ? { ...p, on: !p.on } : p)),
                    )
                  }
                >
                  {selectedPart.on ? t('Open switch', 'פתח מפסק') : t('Close switch', 'סגור מפסק')}
                </button>
              )}
              <p className="hint">
                I ≈ {((sim.current[selectedPart.id] ?? 0) * 1000).toFixed(2)} mA
                <br />
                V ≈ {(sim.voltage[selectedPart.id] ?? 0).toFixed(2)} V
              </p>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setParts((prev) => prev.filter((p) => p.id !== selectedPart.id))
                  setNets((prev) =>
                    prev.filter((n) => n.aId !== selectedPart.id && n.bId !== selectedPart.id),
                  )
                  setSelected(null)
                }}
              >
                {t('Delete', 'מחק')}
              </button>
            </>
          )}

          <button type="button" className="btn ghost" onClick={() => setNets([])}>
            {t('Clear wires', 'נקה חוטים')}
          </button>
          <div className="math-box">
            <strong>{t('Concept', 'הרעיון')}</strong>
            {t(
              'Wire tool: click terminal → terminal. Run: animate current on the closed path.',
              'כלי חוט: הדק → הדק. הרצה: אנימציית זרם במעגל הסגור.',
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
