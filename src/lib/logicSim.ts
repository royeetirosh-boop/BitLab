export type GateType =
  | 'IN'
  | 'OUT'
  | 'NOT'
  | 'AND'
  | 'OR'
  | 'NAND'
  | 'NOR'
  | 'XOR'
  | 'XNOR'
  | 'CLK'

export interface LogicNode {
  id: string
  type: GateType
  x: number
  y: number
  /** For IN / CLK: manual or free-running state */
  value?: boolean
  label?: string
}

export interface LogicWire {
  id: string
  fromId: string
  /** output port index (usually 0) */
  fromPort: number
  toId: string
  /** input port index */
  toPort: number
}

export function inputCount(type: GateType): number {
  switch (type) {
    case 'IN':
    case 'CLK':
    case 'OUT':
    case 'NOT':
      return type === 'OUT' || type === 'NOT' ? 1 : 0
    default:
      return 2
  }
}

export function outputCount(type: GateType): number {
  return type === 'OUT' ? 0 : 1
}

export function evalGate(type: GateType, inputs: (boolean | undefined)[], self?: boolean): boolean | undefined {
  if (type === 'IN' || type === 'CLK') return self ?? false
  if (type === 'OUT') return inputs[0]
  if (inputs.some((v) => v === undefined)) return undefined

  const a = !!inputs[0]
  const b = !!inputs[1]
  switch (type) {
    case 'NOT':
      return !a
    case 'AND':
      return a && b
    case 'OR':
      return a || b
    case 'NAND':
      return !(a && b)
    case 'NOR':
      return !(a || b)
    case 'XOR':
      return a !== b
    case 'XNOR':
      return a === b
    default:
      return undefined
  }
}

/** Propagate signals until stable (combinational). */
export function simulate(
  nodes: LogicNode[],
  wires: LogicWire[],
): Record<string, boolean | undefined> {
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const values: Record<string, boolean | undefined> = {}

  for (const n of nodes) {
    if (n.type === 'IN' || n.type === 'CLK') values[n.id] = n.value ?? false
  }

  for (let iter = 0; iter < nodes.length + 2; iter++) {
    let changed = false
    for (const n of nodes) {
      if (n.type === 'IN' || n.type === 'CLK') continue
      const inputs: (boolean | undefined)[] = []
      const need = inputCount(n.type)
      for (let p = 0; p < need; p++) {
        const w = wires.find((x) => x.toId === n.id && x.toPort === p)
        if (!w) {
          inputs[p] = undefined
          continue
        }
        inputs[p] = values[w.fromId]
      }
      const next = evalGate(n.type, inputs, n.value)
      if (values[n.id] !== next) {
        values[n.id] = next
        changed = true
      }
    }
    if (!changed) break
  }

  void byId
  return values
}

export const GATE_META: Record<
  GateType,
  { label: string; blurb: string; color: string }
> = {
  IN: { label: 'Input', blurb: 'Toggle 0/1 switch', color: '#3d9a6a' },
  OUT: { label: 'LED', blurb: 'Output indicator', color: '#e8a838' },
  CLK: { label: 'Clock', blurb: 'Auto toggling bit', color: '#5b8def' },
  NOT: { label: 'NOT', blurb: 'Inverter', color: '#c45c5c' },
  AND: { label: 'AND', blurb: '1 only if both 1', color: '#5b8def' },
  OR: { label: 'OR', blurb: '1 if either 1', color: '#7a6bb5' },
  NAND: { label: 'NAND', blurb: 'NOT AND', color: '#2a9d8f' },
  NOR: { label: 'NOR', blurb: 'NOT OR', color: '#bc6c25' },
  XOR: { label: 'XOR', blurb: '1 if different', color: '#e76f51' },
  XNOR: { label: 'XNOR', blurb: '1 if same', color: '#264653' },
}
