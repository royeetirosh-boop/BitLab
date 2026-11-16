import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { GateSymbol, gatePortPos, gateSize } from '../components/GateSymbol'
import {
  GATE_META,
  inputCount,
  outputCount,
  simulate,
  type GateType,
  type LogicNode,
  type LogicWire,
} from '../lib/logicSim'

const palette: GateType[] = ['IN', 'OUT', 'NOT', 'AND', 'OR', 'NAND', 'NOR', 'XOR', 'XNOR', 'CLK']

let idSeq = 1
const nid = () => `n${idSeq++}`
const wid = () => `w${idSeq++}`

type Tool = 'select' | 'wire'

/** Topological-ish layers from inputs for run animation. */
function propagationOrder(nodes: LogicNode[], wires: LogicWire[]): string[][] {
  const indeg: Record<string, number> = {}
  const outs: Record<string, string[]> = {}
  for (const n of nodes) {
    indeg[n.id] = 0
    outs[n.id] = []
  }
  for (const w of wires) {
    outs[w.fromId] = outs[w.fromId] ?? []
    outs[w.fromId].push(w.toId)
    indeg[w.toId] = (indeg[w.toId] ?? 0) + 1
  }
  const layers: string[][] = []
  let frontier = nodes.filter((n) => n.type === 'IN' || n.type === 'CLK').map((n) => n.id)
  const seen = new Set<string>()
  while (frontier.length) {
    layers.push(frontier)
    frontier.forEach((id) => seen.add(id))
    const next: string[] = []
    for (const id of frontier) {
      for (const to of outs[id] ?? []) {
        if (seen.has(to)) continue
        const preds = wires.filter((w) => w.toId === to).map((w) => w.fromId)
        if (preds.every((p) => seen.has(p))) next.push(to)
      }
    }
    frontier = [...new Set(next)]
  }
  for (const n of nodes) {
    if (!seen.has(n.id)) {
      layers.push([n.id])
      seen.add(n.id)
    }
  }
  void indeg
  return layers
}

export function LogicLabPage() {
  const [nodes, setNodes] = useState<LogicNode[]>([
    { id: 'n_in1', type: 'IN', x: 36, y: 70, value: true, label: 'A' },
    { id: 'n_in2', type: 'IN', x: 36, y: 200, value: false, label: 'B' },
    { id: 'n_and', type: 'AND', x: 200, y: 120 },
    { id: 'n_out', type: 'OUT', x: 400, y: 130, label: 'Y' },
  ])
  const [wires, setWires] = useState<LogicWire[]>([
    { id: 'w1', fromId: 'n_in1', fromPort: 0, toId: 'n_and', toPort: 0 },
    { id: 'w2', fromId: 'n_in2', fromPort: 0, toId: 'n_and', toPort: 1 },
    { id: 'w3', fromId: 'n_and', fromPort: 0, toId: 'n_out', toPort: 0 },
  ])
  const [selected, setSelected] = useState<string | null>(null)
  const [tool, setTool] = useState<Tool>('wire')
  const [pending, setPending] = useState<{ fromId: string; fromPort: number } | null>(null)
  const [drag, setDrag] = useState<{ id: string; ox: number; oy: number } | null>(null)
  const [running, setRunning] = useState(false)
  const [runLayer, setRunLayer] = useState(-1)
  const [delayMs, setDelayMs] = useState(500)

  const values = useMemo(() => simulate(nodes, wires), [nodes, wires])
  const layers = useMemo(() => propagationOrder(nodes, wires), [nodes, wires])
  const activeIds = useMemo(() => {
    if (!running || runLayer < 0) return new Set<string>()
    return new Set(layers.slice(0, runLayer + 1).flat())
  }, [running, runLayer, layers])

  const hasClk = nodes.some((n) => n.type === 'CLK')
  useEffect(() => {
    if (!hasClk || running) return
    const t = window.setInterval(() => {
      setNodes((prev) => prev.map((n) => (n.type === 'CLK' ? { ...n, value: !n.value } : n)))
    }, 700)
    return () => window.clearInterval(t)
  }, [hasClk, running])

  useEffect(() => {
    if (!running) return
    if (runLayer >= layers.length - 1) {
      const t = window.setTimeout(() => {
        setRunLayer(-1)
        setRunning(false)
      }, delayMs)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => setRunLayer((l) => l + 1), delayMs)
    return () => window.clearTimeout(t)
  }, [running, runLayer, layers.length, delayMs])

  const addGate = (type: GateType) => {
    const id = nid()
    setNodes((prev) => [
      ...prev,
      {
        id,
        type,
        x: 100 + (prev.length % 5) * 28,
        y: 50 + (prev.length % 4) * 36,
        value: type === 'IN' || type === 'CLK' ? false : undefined,
        label: type === 'IN' ? `IN${prev.filter((p) => p.type === 'IN').length + 1}` : undefined,
      },
    ])
    setSelected(id)
    setTool('select')
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!drag) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left - drag.ox
    const y = e.clientY - rect.top - drag.oy
    setNodes((prev) => prev.map((n) => (n.id === drag.id ? { ...n, x, y } : n)))
  }

  const absPort = (node: LogicNode, kind: 'in' | 'out', port: number) => {
    const p = gatePortPos(node.type, kind, port)
    return { x: node.x + p.x, y: node.y + p.y }
  }

  const connectTo = (toId: string, toPort: number) => {
    if (!pending) return
    if (pending.fromId === toId) {
      setPending(null)
      return
    }
    setWires((prev) => [
      ...prev.filter((w) => !(w.toId === toId && w.toPort === toPort)),
      {
        id: wid(),
        fromId: pending.fromId,
        fromPort: pending.fromPort,
        toId,
        toPort,
      },
    ])
    setPending(null)
  }

  const startRun = () => {
    setRunning(true)
    setRunLayer(0)
  }

  const selectedNode = nodes.find((n) => n.id === selected)

  return (
    <div className="page" style={{ width: 'min(1200px, calc(100% - 2rem))' }}>
      <section className="hero" style={{ paddingBottom: '0.75rem' }}>
        <div className="kicker">Mini computer · ANSI logic symbols</div>
        <h1>
          Wire a machine.
          <br />
          <em>Run the signals.</em>
        </h1>
        <p>
          Use the wire tool (output → input). Hit Run to watch levels propagate layer by layer — set
          your own delay between jumps.
        </p>
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
            Move
          </button>
          <button
            type="button"
            className={`btn ${tool === 'wire' ? 'primary' : ''}`}
            onClick={() => setTool('wire')}
          >
            Wire tool
          </button>
          <button
            type="button"
            className={`btn ${running ? 'primary' : ''}`}
            onClick={() => {
              if (running) {
                setRunning(false)
                setRunLayer(-1)
              } else startRun()
            }}
          >
            {running ? 'Stop' : 'Run logic'}
          </button>
          <div className="field" style={{ flex: '1 1 200px', minWidth: 160 }}>
            <label>Step delay: {delayMs} ms</label>
            <input
              type="range"
              min={100}
              max={2000}
              step={50}
              value={delayMs}
              onChange={(e) => setDelayMs(Number(e.target.value))}
            />
          </div>
          {pending && <span className="hint">Wiring… click an input stub</span>}
          {running && (
            <span className="hint">
              Layer {Math.min(runLayer + 1, layers.length)} / {layers.length}
            </span>
          )}
        </div>
      </div>

      <div className="lab-shell">
        <aside className="panel palette">
          <div className="kicker">Parts</div>
          {palette.map((t) => (
            <button key={t} type="button" className="palette-gate" onClick={() => addGate(t)}>
              <GateSymbol type={t} mini />
              <span>
                {GATE_META[t].label}
                <small>{GATE_META[t].blurb}</small>
              </span>
            </button>
          ))}
        </aside>

        <div
          className={`canvas-wrap logic-canvas ${tool === 'wire' ? 'wire-mode' : ''}`}
          onPointerMove={onPointerMove}
          onPointerUp={() => setDrag(null)}
          onPointerLeave={() => setDrag(null)}
          onClick={() => {
            setSelected(null)
            if (tool !== 'wire') setPending(null)
          }}
        >
          <svg className="wires">
            {wires.map((w) => {
              const a = nodes.find((n) => n.id === w.fromId)
              const b = nodes.find((n) => n.id === w.toId)
              if (!a || !b) return null
              const p1 = absPort(a, 'out', 0)
              const p2 = absPort(b, 'in', w.toPort)
              const live = values[w.fromId]
              const revealed = !running || activeIds.has(w.fromId)
              const midX = (p1.x + p2.x) / 2
              return (
                <path
                  key={w.id}
                  d={`M ${p1.x} ${p1.y} C ${midX} ${p1.y}, ${midX} ${p2.y}, ${p2.x} ${p2.y}`}
                  fill="none"
                  stroke={revealed && live ? '#3ecf9a' : revealed ? '#5a7166' : '#2a3d35'}
                  strokeWidth={revealed && live ? 2.8 : 2}
                  opacity={revealed ? 0.95 : 0.25}
                  strokeDasharray={running && activeIds.has(w.fromId) && live ? '8 6' : undefined}
                />
              )
            })}
          </svg>

          {nodes.map((n) => {
            const live = values[n.id]
            const size = gateSize(n.type)
            const revealed = !running || activeIds.has(n.id)
            return (
              <div
                key={n.id}
                className={`gate-node ${selected === n.id ? 'selected' : ''}`}
                style={{
                  left: n.x,
                  top: n.y,
                  width: size.w,
                  height: size.h,
                  opacity: revealed ? 1 : 0.35,
                  filter: running && activeIds.has(n.id) ? 'drop-shadow(0 0 12px rgba(62,207,154,0.45))' : undefined,
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelected(n.id)
                }}
                onPointerDown={(e) => {
                  if ((e.target as HTMLElement).closest('.port')) return
                  if (tool === 'wire') return
                  e.stopPropagation()
                  const target = e.currentTarget
                  const rect = target.getBoundingClientRect()
                  setDrag({ id: n.id, ox: e.clientX - rect.left, oy: e.clientY - rect.top })
                  target.setPointerCapture(e.pointerId)
                }}
              >
                <GateSymbol
                  type={n.type}
                  live={revealed && !!live}
                  selected={selected === n.id}
                  label={n.label}
                />

                {Array.from({ length: inputCount(n.type) }, (_, i) => {
                  const p = gatePortPos(n.type, 'in', i)
                  return (
                    <button
                      key={`in-${i}`}
                      type="button"
                      className={`port in gate-port ${pending ? 'arm' : ''}`}
                      style={{ left: p.x - 7, top: p.y - 7 }}
                      title={`input ${i}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (tool === 'wire' || pending) connectTo(n.id, i)
                      }}
                    />
                  )
                })}

                {Array.from({ length: outputCount(n.type) }, (_, i) => {
                  const p = gatePortPos(n.type, 'out', i)
                  return (
                    <button
                      key={`out-${i}`}
                      type="button"
                      className={`port out gate-port ${revealed && live ? 'live' : ''}`}
                      style={{ left: p.x - 7, top: p.y - 7 }}
                      title="output — click, then an input"
                      onClick={(e) => {
                        e.stopPropagation()
                        setTool('wire')
                        setPending({ fromId: n.id, fromPort: i })
                      }}
                    />
                  )
                })}

                {(n.type === 'IN' || n.type === 'CLK') && (
                  <button
                    type="button"
                    className="gate-toggle"
                    onClick={(e) => {
                      e.stopPropagation()
                      setNodes((prev) =>
                        prev.map((x) => (x.id === n.id ? { ...x, value: !x.value } : x)),
                      )
                    }}
                  >
                    {n.value ? '1' : '0'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <aside className="panel inspector">
          <div className="kicker">Inspector</div>
          {pending && <p className="hint">Wire mode: click a teal input port to finish the wire.</p>}
          {selectedNode ? (
            <>
              <div className="chip" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <GateSymbol type={selectedNode.type} mini selected />
                <span>
                  {GATE_META[selectedNode.type].label}
                  <small>{GATE_META[selectedNode.type].blurb}</small>
                </span>
              </div>
              <p className="hint">
                Output:{' '}
                <strong style={{ color: 'var(--teal)' }}>
                  {values[selectedNode.id] === undefined ? 'Z' : values[selectedNode.id] ? '1' : '0'}
                </strong>
              </p>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setNodes((prev) => prev.filter((n) => n.id !== selectedNode.id))
                  setWires((prev) =>
                    prev.filter((w) => w.fromId !== selectedNode.id && w.toId !== selectedNode.id),
                  )
                  setSelected(null)
                }}
              >
                Delete part
              </button>
            </>
          ) : (
            <p className="hint">Wire tool: output stub → input stub. Run shows propagation.</p>
          )}
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              if (selected) {
                setWires((prev) => prev.filter((w) => w.fromId !== selected && w.toId !== selected))
              } else setWires([])
            }}
          >
            Clear wires {selected ? '(selected)' : '(all)'}
          </button>
        </aside>
      </div>
    </div>
  )
}
