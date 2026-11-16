export const COLOR_BANDS = [
  { name: 'Black', he: 'שחור', value: 0, mult: 1, tol: null as number | null, hex: '#1a1a1a' },
  { name: 'Brown', he: 'חום', value: 1, mult: 10, tol: 1, hex: '#6b3a2a' },
  { name: 'Red', he: 'אדום', value: 2, mult: 100, tol: 2, hex: '#c0392b' },
  { name: 'Orange', he: 'כתום', value: 3, mult: 1e3, tol: null, hex: '#e67e22' },
  { name: 'Yellow', he: 'צהוב', value: 4, mult: 1e4, tol: null, hex: '#f1c40f' },
  { name: 'Green', he: 'ירוק', value: 5, mult: 1e5, tol: 0.5, hex: '#27ae60' },
  { name: 'Blue', he: 'כחול', value: 6, mult: 1e6, tol: 0.25, hex: '#2980b9' },
  { name: 'Violet', he: 'סגול', value: 7, mult: 1e7, tol: 0.1, hex: '#8e44ad' },
  { name: 'Gray', he: 'אפור', value: 8, mult: 1e8, tol: 0.05, hex: '#7f8c8d' },
  { name: 'White', he: 'לבן', value: 9, mult: 1e9, tol: null, hex: '#ecf0f1' },
  { name: 'Gold', he: 'זהב', value: -1, mult: 0.1, tol: 5, hex: '#d4af37' },
  { name: 'Silver', he: 'כסף', value: -2, mult: 0.01, tol: 10, hex: '#bdc3c7' },
] as const

export function decodeResistor(bands: number[]): { ohms: number; tol: number | null; text: string } {
  // 4-band: digit digit multiplier tolerance
  const d1 = COLOR_BANDS[bands[0]]
  const d2 = COLOR_BANDS[bands[1]]
  const mult = COLOR_BANDS[bands[2]]
  const tolBand = bands[3] != null ? COLOR_BANDS[bands[3]] : null
  const ohms = (d1.value * 10 + d2.value) * mult.mult
  const tol = tolBand?.tol ?? null
  return {
    ohms,
    tol,
    text: formatOhms(ohms) + (tol != null ? ` ±${tol}%` : ''),
  }
}

export function formatOhms(r: number): string {
  if (r >= 1e6) return `${+(r / 1e6).toPrecision(4)} MΩ`
  if (r >= 1e3) return `${+(r / 1e3).toPrecision(4)} kΩ`
  if (r >= 1) return `${+r.toPrecision(4)} Ω`
  return `${+r.toPrecision(4)} Ω`
}

export function ohmsLaw(args: { V?: number; I?: number; R?: number; P?: number }): {
  V: number
  I: number
  R: number
  P: number
  note: string
} | null {
  let { V, I, R, P } = args
  const known = [V, I, R, P].filter((x) => x != null && Number.isFinite(x)).length
  if (known < 2) return null

  if (V != null && I != null) {
    R = V / I
    P = V * I
  } else if (V != null && R != null) {
    I = V / R
    P = (V * V) / R
  } else if (I != null && R != null) {
    V = I * R
    P = I * I * R
  } else if (P != null && V != null) {
    I = P / V
    R = (V * V) / P
  } else if (P != null && I != null) {
    V = P / I
    R = P / (I * I)
  } else if (P != null && R != null) {
    I = Math.sqrt(P / R)
    V = I * R
  } else return null

  return {
    V: V!,
    I: I!,
    R: R!,
    P: P!,
    note: 'V=IR · P=VI = I²R = V²/R',
  }
}

export interface Phasor {
  mag: number
  deg: number
}

export function polarToRect(p: Phasor): { re: number; im: number } {
  const rad = (p.deg * Math.PI) / 180
  return { re: p.mag * Math.cos(rad), im: p.mag * Math.sin(rad) }
}

export function rectToPolar(re: number, im: number): Phasor {
  return { mag: Math.hypot(re, im), deg: (Math.atan2(im, re) * 180) / Math.PI }
}

/** Series RLC impedance */
export function seriesRLC(R: number, L: number, C: number, f: number) {
  const w = 2 * Math.PI * f
  const XL = w * L
  const XC = C > 0 ? 1 / (w * C) : Infinity
  const X = XL - XC
  const Z = rectToPolar(R, X)
  const pf = Math.cos((Z.deg * Math.PI) / 180)
  return { XL, XC, X, Z, pf, resonant: C > 0 ? 1 / (2 * Math.PI * Math.sqrt(L * C)) : NaN }
}

export const UNIT_PREFIXES = [
  { name: 'p', mult: 1e-12 },
  { name: 'n', mult: 1e-9 },
  { name: 'μ', mult: 1e-6 },
  { name: 'm', mult: 1e-3 },
  { name: '', mult: 1 },
  { name: 'k', mult: 1e3 },
  { name: 'M', mult: 1e6 },
  { name: 'G', mult: 1e9 },
]

export function convertPrefix(value: number, from: number, to: number): number {
  return (value * from) / to
}

/** Degree curriculum map for the home / toolkit hub */
export const CURRICULUM = [
  {
    area: 'Digital logic · לוגיקה ספרתית',
    items: [
      { to: '/convert', title: 'Number bases', blurb: 'Bin / hex / BCD / Gray' },
      { to: '/lesson', title: 'Animated conversions', blurb: 'BCD +6, double dabble…' },
      { to: '/kmap', title: 'Karnaugh maps', blurb: 'מפות קרנו — minimize SOP/POS' },
      { to: '/mccluskey', title: 'Quine–McCluskey', blurb: 'טבלאות מקלקסקי — tabular PI chart' },
      { to: '/boolean', title: 'Truth tables', blurb: 'Canonical SOP / POS' },
      { to: '/logic', title: 'Logic lab', blurb: 'ANSI gates + wire + run' },
      { to: '/seq', title: 'Flip-flops', blurb: 'SR, JK, D, T sequential' },
    ],
  },
  {
    area: 'Circuits · מעגלים',
    items: [
      { to: '/circuits', title: 'DC circuit studio', blurb: 'Traditional symbols + Ohm' },
      { to: '/tools#ohm', title: 'Ohm / power calc', blurb: 'V, I, R, P solver' },
      { to: '/tools#rlc', title: 'AC · series RLC', blurb: 'Phasors, XL, XC, Z' },
      { to: '/tools#color', title: 'Resistor color code', blurb: '4-band decoder' },
    ],
  },
  {
    area: 'Fundamentals · יסודות',
    items: [
      { to: '/tools#units', title: 'SI prefixes', blurb: 'p n μ m k M G' },
      { to: '/tools#sheet', title: 'Formula sheet', blurb: 'Must-know EE equations' },
    ],
  },
] as const
