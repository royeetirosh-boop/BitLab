export type PartType =
  | 'battery'
  | 'resistor'
  | 'led'
  | 'bulb'
  | 'switch'
  | 'ground'
  | 'diode'
  | 'fuse'
  | 'ammeter'
  | 'voltmeter'
  | 'wire'

export interface CircuitPart {
  id: string
  type: PartType
  x: number
  y: number
  rot: 0 | 90
  value: number
  on?: boolean
  label?: string
}

export interface CircuitNet {
  id: string
  aId: string
  aPort: 0 | 1
  bId: string
  bPort: 0 | 1
}

export interface SimResult {
  current: Record<string, number>
  voltage: Record<string, number>
  power: Record<string, number>
  ok: boolean
  message: string
  ledOn: Record<string, boolean>
  pathNetIds: string[]
  pathPartIds: string[]
}

const LED_VF = 2.0
const LED_R = 30
const DIODE_VF = 0.7
const DIODE_R = 20

function isLamp(t: PartType) {
  return t === 'led' || t === 'bulb'
}

function partResistance(p: CircuitPart): number | null {
  switch (p.type) {
    case 'resistor':
      return Math.max(p.value, 0.001)
    case 'led':
    case 'bulb':
      return LED_R
    case 'diode':
      return DIODE_R
    case 'switch':
      return p.on ? 0.01 : 1e9
    case 'fuse':
    case 'wire':
    case 'ammeter':
      return 0.01
    case 'voltmeter':
      return 1e6
    case 'ground':
    case 'battery':
      return null
    default:
      return null
  }
}

export function simulateCircuit(parts: CircuitPart[], nets: CircuitNet[]): SimResult {
  const empty: SimResult = {
    current: {},
    voltage: {},
    power: {},
    ok: false,
    message: 'Add a battery, a load, and close the loop.',
    ledOn: {},
    pathNetIds: [],
    pathPartIds: [],
  }

  if (!parts.some((p) => p.type === 'battery')) {
    return { ...empty, message: 'Need at least one battery (מקור מתח).' }
  }

  type Node = string
  const adj = new Map<Node, { to: Node; partId: string }[]>()
  const addEdge = (u: Node, v: Node, partId: string) => {
    if (!adj.has(u)) adj.set(u, [])
    if (!adj.has(v)) adj.set(v, [])
    adj.get(u)!.push({ to: v, partId })
    adj.get(v)!.push({ to: u, partId })
  }

  for (const p of parts) {
    if (p.type === 'ground') {
      // single terminal — treat both ports as same node shorted to a virtual ground rail later
      addEdge(`${p.id}:0`, `${p.id}:1`, p.id)
      continue
    }
    addEdge(`${p.id}:0`, `${p.id}:1`, p.id)
  }
  for (const n of nets) {
    addEdge(`${n.aId}:${n.aPort}`, `${n.bId}:${n.bPort}`, `net:${n.id}`)
  }

  const battery = parts.find((p) => p.type === 'battery')!
  const start = `${battery.id}:1`
  const goal = `${battery.id}:0`

  const visited = new Set<Node>()
  const prev = new Map<Node, { node: Node; partId: string }>()
  const q: Node[] = [start]
  visited.add(start)
  let found = false

  while (q.length) {
    const cur = q.shift()!
    if (cur === goal) {
      found = true
      break
    }
    for (const e of adj.get(cur) ?? []) {
      if (visited.has(e.to)) continue
      if (e.partId === battery.id && cur === start) continue
      visited.add(e.to)
      prev.set(e.to, { node: cur, partId: e.partId })
      q.push(e.to)
    }
  }

  if (!found) {
    return {
      ...empty,
      message: 'No closed loop from battery + back to −. Connect wires (סגור את המעגל).',
    }
  }

  let walk: Node | undefined = goal
  const partOrder: string[] = []
  const pathNetIds: string[] = []
  const edgeIds: string[] = []
  while (walk && walk !== start) {
    const step = prev.get(walk)
    if (!step) break
    edgeIds.push(step.partId)
    if (step.partId.startsWith('net:')) pathNetIds.push(step.partId.slice(4))
    else partOrder.push(step.partId)
    walk = step.node
  }

  let R = 0
  const series: CircuitPart[] = []
  for (const id of partOrder) {
    const part = parts.find((x) => x.id === id)
    if (!part || part.id === battery.id) continue
    const r = partResistance(part)
    if (r == null) continue
    if (part.type === 'switch' && !part.on) {
      return {
        ...empty,
        ok: true,
        message: 'Switch is open (מפסק פתוח) — current = 0.',
        current: Object.fromEntries(parts.map((p) => [p.id, 0])),
        voltage: Object.fromEntries(parts.map((p) => [p.id, p.type === 'battery' ? p.value : 0])),
        power: Object.fromEntries(parts.map((p) => [p.id, 0])),
        ledOn: Object.fromEntries(parts.filter((p) => isLamp(p.type)).map((p) => [p.id, false])),
        pathNetIds: [],
        pathPartIds: [],
      }
    }
    R += r
    series.push(part)
  }

  let V = battery.value
  const lamps = series.filter((p) => isLamp(p.type))
  const diodes = series.filter((p) => p.type === 'diode')
  V -= lamps.length * LED_VF + diodes.length * DIODE_VF
  if (V < 0) {
    return {
      ...empty,
      ok: true,
      message: 'Battery voltage too low for diode/lamp drops.',
      current: Object.fromEntries(parts.map((p) => [p.id, 0])),
      voltage: {},
      power: {},
      ledOn: Object.fromEntries(lamps.map((p) => [p.id, false])),
      pathNetIds: [],
      pathPartIds: [],
    }
  }

  R = Math.max(R, 0.01)
  const I = V / R

  const current: Record<string, number> = {}
  const voltage: Record<string, number> = {}
  const power: Record<string, number> = {}
  const ledOn: Record<string, boolean> = {}

  for (const p of parts) {
    current[p.id] = 0
    voltage[p.id] = 0
    power[p.id] = 0
  }
  current[battery.id] = I
  voltage[battery.id] = battery.value
  power[battery.id] = battery.value * I

  for (const p of series) {
    current[p.id] = I
    if (isLamp(p.type)) {
      voltage[p.id] = LED_VF + I * LED_R
      ledOn[p.id] = I > 0.001
    } else if (p.type === 'diode') {
      voltage[p.id] = DIODE_VF + I * DIODE_R
    } else {
      const r = partResistance(p) ?? 0
      voltage[p.id] = I * r
    }
    power[p.id] = voltage[p.id] * I
  }

  return {
    current,
    voltage,
    power,
    ok: true,
    message: `I ≈ ${(I * 1000).toFixed(1)} mA · R≈${R.toFixed(1)}Ω · V=IR`,
    ledOn,
    pathNetIds,
    pathPartIds: partOrder,
  }
}

export const PART_META: Record<PartType, { label: string; labelHe: string; blurb: string }> = {
  battery: { label: 'Battery', labelHe: 'סוללה', blurb: 'DC cell' },
  resistor: { label: 'Resistor', labelHe: 'נגד', blurb: 'Zig-zag R' },
  led: { label: 'Lamp', labelHe: 'נורה', blurb: 'Circle + X' },
  bulb: { label: 'Lamp', labelHe: 'נורה', blurb: 'Circle + X' },
  switch: { label: 'Switch', labelHe: 'מפסק', blurb: 'Open / closed' },
  ground: { label: 'Ground', labelHe: 'הארקה', blurb: 'Earth symbol' },
  diode: { label: 'Diode', labelHe: 'דיודה', blurb: 'Triangle + bar' },
  fuse: { label: 'Fuse', labelHe: 'נתיך', blurb: 'Protective link' },
  ammeter: { label: 'Ammeter', labelHe: 'מד זרם', blurb: 'Circle A' },
  voltmeter: { label: 'Voltmeter', labelHe: 'מד מתח', blurb: 'Circle V' },
  wire: { label: 'Wire node', labelHe: 'צומת', blurb: 'Junction' },
}

export const CIRCUIT_PALETTE: PartType[] = [
  'battery',
  'resistor',
  'led',
  'switch',
  'ground',
  'diode',
  'fuse',
  'ammeter',
  'voltmeter',
  'wire',
]
