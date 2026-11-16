import { VAR_NAMES, type VarCount } from './karnaugh'

export function truthTable(vars: VarCount, outputs: (0 | 1)[]): { row: number; bits: string; out: 0 | 1 }[] {
  const n = 1 << vars
  return Array.from({ length: n }, (_, i) => ({
    row: i,
    bits: i.toString(2).padStart(vars, '0'),
    out: outputs[i] ?? 0,
  }))
}

/** Canonical SOP / POS from truth table outputs */
export function canonicalForms(vars: VarCount, outputs: (0 | 1)[]): { sop: string; pos: string; minterms: number[]; maxterms: number[] } {
  const minterms: number[] = []
  const maxterms: number[] = []
  const n = 1 << vars
  for (let i = 0; i < n; i++) {
    if (outputs[i]) minterms.push(i)
    else maxterms.push(i)
  }

  const sop =
    minterms.length === 0
      ? '0'
      : minterms.length === n
        ? '1'
        : minterms
            .map((m) => {
              const bits = m.toString(2).padStart(vars, '0')
              return bits
                .split('')
                .map((b, i) => (b === '1' ? VAR_NAMES[i] : `${VAR_NAMES[i]}'`))
                .join('')
            })
            .join(' + ')

  const pos =
    maxterms.length === 0
      ? '1'
      : maxterms.length === n
        ? '0'
        : maxterms
            .map((m) => {
              const bits = m.toString(2).padStart(vars, '0')
              const parts = bits
                .split('')
                .map((b, i) => (b === '0' ? VAR_NAMES[i] : `${VAR_NAMES[i]}'`))
                .join(' + ')
              return `(${parts})`
            })
            .join(' · ')

  return { sop, pos, minterms, maxterms }
}

export function evalBits(bits: string, outputs: (0 | 1)[]): 0 | 1 {
  const i = parseInt(bits, 2)
  return outputs[i] ?? 0
}
