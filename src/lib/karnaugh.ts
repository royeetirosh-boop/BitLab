/** Karnaugh map + Quine–McCluskey minimization (2–4 variables). */

export type CellVal = 0 | 1 | 'X'
export type VarCount = 2 | 3 | 4
/** Quine–McCluskey also supports 5 vars (where K-maps get painful). */
export type QMVarCount = 2 | 3 | 4 | 5

export const VAR_NAMES = ['A', 'B', 'C', 'D', 'E'] as const

/** Gray-code order for K-map axes */
export function grayCode(nbits: number): number[] {
  const out: number[] = []
  const n = 1 << nbits
  for (let i = 0; i < n; i++) out.push(i ^ (i >> 1))
  return out
}

export function bitsOf(n: number, width: number): string {
  return n.toString(2).padStart(width, '0')
}

/** Map layout: rows = MSBs, cols = LSBs (classic). */
export function kmapAxes(vars: VarCount): {
  rowVars: string[]
  colVars: string[]
  rows: number[]
  cols: number[]
} {
  if (vars === 2) {
    return { rowVars: ['A'], colVars: ['B'], rows: grayCode(1), cols: grayCode(1) }
  }
  if (vars === 3) {
    return { rowVars: ['A'], colVars: ['B', 'C'], rows: grayCode(1), cols: grayCode(2) }
  }
  return { rowVars: ['A', 'B'], colVars: ['C', 'D'], rows: grayCode(2), cols: grayCode(2) }
}

/** Minterm index from row/col gray values */
export function cellMinterm(vars: VarCount, rowGray: number, colGray: number): number {
  if (vars === 2) return (rowGray << 1) | colGray
  if (vars === 3) return (rowGray << 2) | colGray
  return (rowGray << 2) | colGray
}

export function emptyMap(vars: VarCount): CellVal[] {
  return Array.from({ length: 1 << vars }, () => 0)
}

export interface Implicant {
  /** bitmask of care bits that are 0/1; -1 dash via mask */
  bits: number
  /** 1 where bit is fixed, 0 where dash */
  mask: number
  minterms: number[]
  term: string
}

function termString(bits: number, mask: number, vars: number): string {
  const parts: string[] = []
  for (let i = vars - 1; i >= 0; i--) {
    const bit = 1 << i
    if (!(mask & bit)) continue
    const name = VAR_NAMES[vars - 1 - i]
    parts.push(bits & bit ? name : `${name}'`)
  }
  return parts.length ? parts.join('') : '1'
}

/** Binary pattern with '-' for dashes (combined bits). */
export function implicantPattern(bits: number, mask: number, vars: number): string {
  let s = ''
  for (let i = vars - 1; i >= 0; i--) {
    const bit = 1 << i
    if (!(mask & bit)) s += '-'
    else s += bits & bit ? '1' : '0'
  }
  return s
}

function onesInPattern(bits: number, mask: number): number {
  return countOnes(bits & mask)
}

function countOnes(n: number): number {
  let c = 0
  while (n) {
    c += n & 1
    n >>= 1
  }
  return c
}

function combine(a: Implicant, b: Implicant, vars: number): Implicant | null {
  if (a.mask !== b.mask) return null
  const diff = a.bits ^ b.bits
  if (countOnes(diff) !== 1) return null
  if ((diff & a.mask) !== diff) return null
  const mask = a.mask & ~diff
  const bits = a.bits & mask
  const minterms = [...new Set([...a.minterms, ...b.minterms])].sort((x, y) => x - y)
  return { bits, mask, minterms, term: termString(bits, mask, vars) }
}

export interface QMTableRow {
  group: number
  minterms: number[]
  pattern: string
  term: string
  checked: boolean
  bits: number
  mask: number
}

export interface QMTableStage {
  title: string
  explanation: string
  rows: QMTableRow[]
}

export interface QMChartCol {
  minterm: number
}

export interface QMResult {
  on: number[]
  dc: number[]
  stages: QMTableStage[]
  primes: Implicant[]
  /** coverage[primeIndex][mintermIndex] */
  coverage: boolean[][]
  essentialIdx: number[]
  selectedIdx: number[]
  expression: string
  steps: { title: string; body: string }[]
}

/** Full Quine–McCluskey tabular method for the lesson UI. */
export function buildMcCluskey(on: number[], dc: number[], vars: QMVarCount): QMResult {
  const onSet = [...new Set(on.filter((m) => m >= 0 && m < 1 << vars))].sort((a, b) => a - b)
  const dcSet = [...new Set(dc.filter((m) => m >= 0 && m < 1 << vars && !onSet.includes(m)))].sort(
    (a, b) => a - b,
  )

  if (onSet.length === 0) {
    return {
      on: onSet,
      dc: dcSet,
      stages: [],
      primes: [],
      coverage: [],
      essentialIdx: [],
      selectedIdx: [],
      expression: '0',
      steps: [{ title: 'Empty ON-set', body: 'No minterms → F = 0.' }],
    }
  }

  if (onSet.length + dcSet.length === 1 << vars) {
    const all = [...onSet, ...dcSet]
    return {
      on: onSet,
      dc: dcSet,
      stages: [
        {
          title: 'Stage 0 · all minterms',
          explanation: 'Every cell is 1 or X — function is identically 1.',
          rows: [
            {
              group: 0,
              minterms: all,
              pattern: '-'.repeat(vars),
              term: '1',
              checked: false,
              bits: 0,
              mask: 0,
            },
          ],
        },
      ],
      primes: [{ bits: 0, mask: 0, minterms: onSet, term: '1' }],
      coverage: [onSet.map(() => true)],
      essentialIdx: [0],
      selectedIdx: [0],
      expression: '1',
      steps: [{ title: 'Tautology', body: 'F = 1.' }],
    }
  }

  const fullMask = (1 << vars) - 1
  let current: Implicant[] = [...onSet, ...dcSet].map((m) => ({
    bits: m,
    mask: fullMask,
    minterms: [m],
    term: termString(m, fullMask, vars),
  }))

  const stages: QMTableStage[] = []
  const unchecked: Implicant[] = []
  let stageIdx = 0

  const toRows = (list: Implicant[], used: Set<number>): QMTableRow[] => {
    const rows = list.map((imp, i) => ({
      group: onesInPattern(imp.bits, imp.mask),
      minterms: [...imp.minterms],
      pattern: implicantPattern(imp.bits, imp.mask, vars),
      term: imp.term,
      checked: used.has(i),
      bits: imp.bits,
      mask: imp.mask,
    }))
    rows.sort((a, b) => a.group - b.group || a.minterms[0] - b.minterms[0])
    return rows
  }

  while (current.length) {
    const used = new Set<number>()
    const nextMap = new Map<string, Implicant>()
    for (let i = 0; i < current.length; i++) {
      for (let j = i + 1; j < current.length; j++) {
        const c = combine(current[i], current[j], vars)
        if (!c) continue
        used.add(i)
        used.add(j)
        const key = `${c.bits}|${c.mask}`
        const prev = nextMap.get(key)
        if (prev) {
          prev.minterms = [...new Set([...prev.minterms, ...c.minterms])].sort((a, b) => a - b)
        } else nextMap.set(key, c)
      }
    }

    stages.push({
      title:
        stageIdx === 0
          ? 'Table 1 · List minterms (group by # of 1s)'
          : `Table ${stageIdx + 1} · Combine pairs that differ by one bit`,
      explanation:
        stageIdx === 0
          ? 'Sort ON (and don’t-care) minterms into groups by the number of 1-bits. Check ✓ means this term was combined into the next column.'
          : 'Combine only adjacent groups (differ by exactly one bit). A dash (-) marks the bit that changed. Unchecked terms are prime implicants.',
      rows: toRows(current, used),
    })

    current.forEach((imp, i) => {
      if (!used.has(i)) unchecked.push(imp)
    })

    current = [...nextMap.values()]
    stageIdx++
    if (!current.length) break
  }

  const primes = dedupeImplicants(unchecked).filter((p) => p.minterms.some((m) => onSet.includes(m)))
  const coverage = primes.map((p) => onSet.map((m) => p.minterms.includes(m)))

  // Essential detection (for chart UI)
  const essentialIdx: number[] = []
  const uncovered = new Set(onSet)
  for (const m of onSet) {
    const idxs = primes
      .map((p, i) => (p.minterms.includes(m) ? i : -1))
      .filter((i) => i >= 0)
    if (idxs.length === 1 && !essentialIdx.includes(idxs[0])) essentialIdx.push(idxs[0])
  }

  const cover = coverMinterms(onSet, primes)
  const selectedIdx = cover
    .map((c) => primes.findIndex((p) => p.bits === c.bits && p.mask === c.mask))
    .filter((i) => i >= 0)
  const expression = cover.map((p) => p.term).join(' + ') || '0'

  // Mark essentials that cover
  essentialIdx.forEach((i) => primes[i]?.minterms.forEach((m) => uncovered.delete(m)))

  const steps = [
    {
      title: '1 · Tabulate',
      body: `ON-set Σm(${onSet.join(', ')})${dcSet.length ? ` · don’t cares X(${dcSet.join(', ')})` : ''}. Group by number of 1s.`,
    },
    {
      title: '2 · Combine',
      body: `${stages.length} column(s). Check marks = combined further. Unchecked → candidate prime implicants.`,
    },
    {
      title: '3 · Prime implicant chart',
      body: `Prime implicants: ${primes.map((p) => p.term).join(', ') || '—'}. Columns = ON minterms that must be covered.`,
    },
    {
      title: '4 · Essentials & cover',
      body:
        essentialIdx.length > 0
          ? `Essential PI(s): ${essentialIdx.map((i) => primes[i].term).join(', ')}. Final cover → F = ${expression}`
          : `No single essential (ties). Greedy cover → F = ${expression}`,
    },
  ]

  return {
    on: onSet,
    dc: dcSet,
    stages,
    primes,
    coverage,
    essentialIdx,
    selectedIdx,
    expression,
    steps,
  }
}

/** Quine–McCluskey → essential prime implicants covering ON-set (X = don't care, usable in implicants). */
export function minimizeSOP(cells: CellVal[], vars: VarCount): {
  primes: Implicant[]
  essential: Implicant[]
  expression: string
  groups: Implicant[]
} {
  const on: number[] = []
  const dc: number[] = []
  cells.forEach((v, i) => {
    if (v === 1) on.push(i)
    if (v === 'X') dc.push(i)
  })
  if (on.length === 0) {
    return { primes: [], essential: [], expression: '0', groups: [] }
  }
  if (on.length + dc.length === 1 << vars) {
    return {
      primes: [{ bits: 0, mask: 0, minterms: on, term: '1' }],
      essential: [{ bits: 0, mask: 0, minterms: on, term: '1' }],
      expression: '1',
      groups: [{ bits: 0, mask: 0, minterms: [...on, ...dc], term: '1' }],
    }
  }

  const fullMask = (1 << vars) - 1
  let current: Implicant[] = [...on, ...dc].map((m) => ({
    bits: m,
    mask: fullMask,
    minterms: [m],
    term: termString(m, fullMask, vars),
  }))

  const unchecked: Implicant[] = []
  const allStages: Implicant[][] = [current]

  while (current.length) {
    const used = new Set<number>()
    const nextMap = new Map<string, Implicant>()
    for (let i = 0; i < current.length; i++) {
      for (let j = i + 1; j < current.length; j++) {
        const c = combine(current[i], current[j], vars)
        if (!c) continue
        used.add(i)
        used.add(j)
        const key = `${c.bits}|${c.mask}`
        const prev = nextMap.get(key)
        if (prev) {
          prev.minterms = [...new Set([...prev.minterms, ...c.minterms])].sort((a, b) => a - b)
        } else nextMap.set(key, c)
      }
    }
    current.forEach((imp, i) => {
      if (!used.has(i)) unchecked.push(imp)
    })
    current = [...nextMap.values()]
    if (current.length) allStages.push(current)
  }

  // Prime implicants: those never combined further
  const primes = dedupeImplicants(unchecked)
  // Only primes that cover at least one ON minterm
  const useful = primes.filter((p) => p.minterms.some((m) => on.includes(m)))

  // Petrick / essential covering (greedy + essentials)
  const cover = coverMinterms(on, useful)
  const expression = cover.map((p) => p.term).join(' + ') || '0'

  // Visual groups = cover implicants (for highlighting)
  return { primes: useful, essential: cover, expression, groups: cover }
}

function dedupeImplicants(list: Implicant[]): Implicant[] {
  const map = new Map<string, Implicant>()
  for (const p of list) {
    const key = `${p.bits}|${p.mask}`
    const prev = map.get(key)
    if (!prev) map.set(key, { ...p, minterms: [...p.minterms] })
    else {
      prev.minterms = [...new Set([...prev.minterms, ...p.minterms])].sort((a, b) => a - b)
    }
  }
  return [...map.values()]
}

function coverMinterms(on: number[], primes: Implicant[]): Implicant[] {
  const uncovered = new Set(on)
  const chosen: Implicant[] = []
  const remaining = [...primes]

  // Essentials
  let changed = true
  while (changed && uncovered.size) {
    changed = false
    for (const m of [...uncovered]) {
      const covers = remaining.filter((p) => p.minterms.includes(m))
      if (covers.length === 1) {
        const p = covers[0]
        if (!chosen.includes(p)) {
          chosen.push(p)
          p.minterms.forEach((x) => uncovered.delete(x))
          const idx = remaining.indexOf(p)
          if (idx >= 0) remaining.splice(idx, 1)
          changed = true
        }
      }
    }
  }

  // Greedy for the rest
  while (uncovered.size && remaining.length) {
    remaining.sort(
      (a, b) =>
        b.minterms.filter((m) => uncovered.has(m)).length -
        a.minterms.filter((m) => uncovered.has(m)).length,
    )
    const best = remaining.shift()!
    if (!best.minterms.some((m) => uncovered.has(m))) continue
    chosen.push(best)
    best.minterms.forEach((m) => uncovered.delete(m))
  }

  return chosen
}

export function evalImplicant(imp: Implicant, minterm: number, vars: VarCount): boolean {
  const care = imp.mask & ((1 << vars) - 1)
  return (minterm & care) === (imp.bits & care)
}

/** POS via complement minimize then De Morgan-ish rewrite is heavy; offer SOP of F' as note. */
export function minimizePOS(cells: CellVal[], vars: VarCount): { expression: string } {
  const comp = cells.map((v) => (v === 1 ? 0 : v === 0 ? 1 : 'X')) as CellVal[]
  const { expression } = minimizeSOP(comp, vars)
  if (expression === '0') return { expression: '1' }
  if (expression === '1') return { expression: '0' }
  // Convert SOP of F' to POS of F: (term)' → product of sums roughly
  // A'B + C → (A+B'+C')' wait — proper: F = Π (sum terms from each product of F')
  const products = expression.split(' + ').map((t) => t.trim())
  const sums = products.map((prod) => {
    if (prod === '1') return '0'
    const lits: string[] = []
    for (let i = 0; i < prod.length; i++) {
      const ch = prod[i]
      if (ch === "'") continue
      const neg = prod[i + 1] === "'"
      // De Morgan on product: (XY')' = X'+Y
      lits.push(neg ? ch : `${ch}'`)
    }
    return `(${lits.join(' + ')})`
  })
  return { expression: sums.join(' · ') }
}
