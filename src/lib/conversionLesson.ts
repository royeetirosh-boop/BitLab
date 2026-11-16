import {
  binaryToGray,
  formatBcdNibbles,
  toBinary,
  toHex,
  toOctal,
  type RadixFormat,
} from './conversions'
import { buildDoubleDabble, buildPlus6Lesson } from './bcdLesson'

export const FORMAT_OPTIONS: { id: RadixFormat; label: string; placeholder: string }[] = [
  { id: 'decimal', label: 'Decimal', placeholder: '42' },
  { id: 'binary', label: 'Binary', placeholder: '101010' },
  { id: 'hex', label: 'Hex', placeholder: '2A' },
  { id: 'octal', label: 'Octal', placeholder: '52' },
  { id: 'bcd', label: 'BCD', placeholder: '01000010' },
  { id: 'gray', label: 'Gray code', placeholder: '111111' },
]

export interface LessonStep {
  id: string
  title: string
  explanation: string
  math: string
  hardware: string
  /** Primary bit visualization */
  bits?: string
  bitsLabel?: string
  invalid?: boolean
  pulse?: boolean
  /** Extra register / table rows for the visual panel */
  rows?: { label: string; value: string; bits?: string; hot?: boolean }[]
  stage?: string
}

const labelOf = (f: RadixFormat) => FORMAT_OPTIONS.find((x) => x.id === f)?.label ?? f

function widthFor(n: number, min = 8) {
  return Math.max(min, n.toString(2).length)
}

function formatOut(n: number, to: RadixFormat): string {
  const w = widthFor(n)
  switch (to) {
    case 'decimal':
      return String(n)
    case 'binary':
      return toBinary(n, w)
    case 'hex':
      return `0x${toHex(n)}`
    case 'octal':
      return `0o${toOctal(n)}`
    case 'bcd':
      return formatBcdNibbles(n)
    case 'gray':
      return toBinary(binaryToGray(n), w)
  }
}

/** Hub graph: most conversions go via binary or decimal for a clean teach path. */
function route(from: RadixFormat, to: RadixFormat): RadixFormat[] {
  if (from === to) return [from]
  // Direct edges we teach natively
  const direct: Array<[RadixFormat, RadixFormat]> = [
    ['decimal', 'binary'],
    ['binary', 'decimal'],
    ['binary', 'hex'],
    ['hex', 'binary'],
    ['binary', 'octal'],
    ['octal', 'binary'],
    ['binary', 'gray'],
    ['gray', 'binary'],
    ['decimal', 'bcd'],
    ['bcd', 'decimal'],
    ['binary', 'bcd'],
    ['bcd', 'binary'],
    ['decimal', 'hex'],
    ['hex', 'decimal'],
    ['decimal', 'octal'],
    ['octal', 'decimal'],
  ]
  if (direct.some(([a, b]) => a === from && b === to)) return [from, to]

  // Prefer binary as hub (hardware-native)
  if (from !== 'binary' && to !== 'binary') {
    return [from, 'binary', to]
  }
  return [from, to]
}

function decimalToBinarySteps(n: number): LessonStep[] {
  const steps: LessonStep[] = [
    {
      id: 'd2b-start',
      title: '1 · Repeated division by 2',
      explanation:
        'Hardware and hand methods both peel off remainders: each ÷2 asks “is this bit 0 or 1?” Remainders, read bottom→top, are the binary number.',
      math: `Convert ${n}₁₀ → binary\nMethod: n ÷ 2 → quotient + remainder (LSB first)`,
      hardware: 'A shift-right register dumps LSB each clock; quotient stays in the register. Same math as a restoring divider fixed at divisor=2.',
      rows: [{ label: 'Input', value: `${n}₁₀` }],
      stage: 'decimal→binary',
    },
  ]

  let q = n
  const remainders: number[] = []
  let i = 0
  if (n === 0) {
    remainders.push(0)
    steps.push({
      id: 'd2b-0',
      title: '2 · Special case zero',
      explanation: 'Zero has no 1-bits. Binary result is 0.',
      math: '0 ÷ 2 = 0 rem 0',
      hardware: 'All register bits stay cleared.',
      bits: '0',
      bitsLabel: 'Result',
      stage: 'decimal→binary',
    })
  } else {
    while (q > 0) {
      const rem = q % 2
      const next = Math.floor(q / 2)
      remainders.push(rem)
      steps.push({
        id: `d2b-${i}`,
        title: `2.${i + 1} · Divide ${q} by 2`,
        explanation:
          rem === 1
            ? `${q} is odd → remainder 1 (this bit is ON). Quotient ${next} continues.`
            : `${q} is even → remainder 0 (this bit is OFF). Quotient ${next} continues.`,
        math: `${q} ÷ 2 = ${next} remainder ${rem}\nRemainders so far (LSB→…): ${remainders.join(' ')}`,
        hardware: `Clock ${i + 1}: shift out bit b${i} = ${rem}. ALU does one subtract-if-odd / right-shift.`,
        bits: remainders
          .slice()
          .reverse()
          .join('')
          .padStart(Math.max(8, remainders.length), '0'),
        bitsLabel: 'Bits collected (MSB left — still growing)',
        rows: [
          { label: 'Quotient', value: String(next), hot: true },
          { label: 'Remainder (new LSB)', value: String(rem), hot: true },
          { label: 'Remainders LSB→MSB', value: remainders.join(', ') },
        ],
        pulse: true,
        stage: 'decimal→binary',
      })
      q = next
      i++
    }
  }

  const bin = toBinary(n, widthFor(n))
  steps.push({
    id: 'd2b-done',
    title: '3 · Read remainders bottom → top',
    explanation: 'The first remainder is the LSB (rightmost). Flip the remainder list to get the usual MSB-left binary string.',
    math: `Remainders LSB-first: ${remainders.join(' ')}\nBinary = ${bin}₂ = ${n}₁₀`,
    hardware: 'Parallel load those bits onto a bus / display register. Weight of bit i is 2ⁱ.',
    bits: bin,
    bitsLabel: 'Final binary',
    rows: [{ label: 'Check', value: `${bin}₂ → ${n}₁₀`, hot: true }],
    stage: 'decimal→binary',
  })
  return steps
}

function binaryToDecimalSteps(n: number): LessonStep[] {
  const w = widthFor(n)
  const bits = toBinary(n, w).split('')
  const steps: LessonStep[] = [
    {
      id: 'b2d-start',
      title: '1 · Positional weights',
      explanation: 'Each bit multiplies a power of two. Sum the weights where the bit is 1 — that is the decimal value.',
      math: `bits = ${bits.join('')}\nvalue = Σ bᵢ · 2ⁱ`,
      hardware: 'Wired shifts + adder tree (or successive double-and-add) implement the same sum on an ALU.',
      bits: bits.join(''),
      bitsLabel: 'Binary register',
      stage: 'binary→decimal',
    },
  ]

  let sum = 0
  const terms: string[] = []
  for (let i = 0; i < bits.length; i++) {
    const power = bits.length - 1 - i
    const bit = Number(bits[i])
    const weight = bit * 2 ** power
    if (bit) {
      sum += weight
      terms.push(`2^${power}`)
    }
    steps.push({
      id: `b2d-${i}`,
      title: `2.${i + 1} · Bit ${bits[i]} at 2^${power}`,
      explanation:
        bit === 1
          ? `Bit is 1 → add ${weight} (2^${power}) to the running total.`
          : `Bit is 0 → this weight is skipped (gate off / mux selects 0).`,
      math: `b_${power} = ${bit} → contribution ${weight}\nRunning sum = ${sum}`,
      hardware: bit ? `Enable addend 2^${power} into the accumulator.` : `Addend 2^${power} gated off.`,
      bits: bits.join(''),
      bitsLabel: 'Source bits',
      rows: [
        { label: 'Weight', value: `2^${power} = ${2 ** power}`, hot: bit === 1 },
        { label: 'Running sum', value: String(sum), hot: true },
        { label: 'Terms', value: terms.join(' + ') || '—' },
      ],
      pulse: bit === 1,
      stage: 'binary→decimal',
    })
  }

  steps.push({
    id: 'b2d-done',
    title: '3 · Decimal result',
    explanation: 'Accumulator holds the decimal interpretation of the same wires.',
    math: `${bits.join('')}₂ = ${terms.join(' + ') || '0'} = ${n}₁₀`,
    hardware: 'Done — binary bus and decimal display are two views of one register.',
    bits: bits.join(''),
    rows: [{ label: 'Decimal', value: String(n), hot: true }],
    stage: 'binary→decimal',
  })
  return steps
}

function binaryGroupSteps(n: number, group: 3 | 4, to: 'hex' | 'octal'): LessonStep[] {
  const name = to === 'hex' ? 'hex' : 'octal'
  const w = Math.ceil(widthFor(n) / group) * group
  const bits = toBinary(n, w)
  const groups: string[] = []
  for (let i = 0; i < bits.length; i += group) groups.push(bits.slice(i, i + group))

  const steps: LessonStep[] = [
    {
      id: 'grp-start',
      title: `1 · Group binary by ${group}`,
      explanation: `${name} digits are just ${group}-bit bundles. Pad on the left so the length is a multiple of ${group}, then read each group as a ${name} digit.`,
      math: `${toBinary(n, widthFor(n))}₂ → pad to ${w} bits → groups of ${group}`,
      hardware: `Wiring only: tap the bus every ${group} bits into a ${name} glyph decoder / 7-seg map. No arithmetic.`,
      bits,
      bitsLabel: 'Padded binary',
      stage: `binary→${to}`,
    },
  ]

  const digits: string[] = []
  groups.forEach((g, i) => {
    const val = parseInt(g, 2)
    const dig = to === 'hex' ? val.toString(16).toUpperCase() : String(val)
    digits.push(dig)
    steps.push({
      id: `grp-${i}`,
      title: `2.${i + 1} · Group ${g} → ${dig}`,
      explanation: `Bits ${g} equal ${val}₁₀, written as ${dig} in ${name}.`,
      math: `${g}₂ = ${val}₁₀ = ${dig}${to === 'hex' ? '₁₆' : '₈'}`,
      hardware: `Nibble/triad ${i} feeds a ROM/PLA that lights the digit “${dig}”.`,
      bits: g,
      bitsLabel: `Group ${i + 1}`,
      rows: [
        { label: 'Groups', value: groups.join(' '), hot: true },
        { label: `${name} so far`, value: digits.join(''), hot: true },
      ],
      pulse: true,
      stage: `binary→${to}`,
    })
  })

  const out = to === 'hex' ? toHex(n) : toOctal(n)
  steps.push({
    id: 'grp-done',
    title: `3 · ${name} result`,
    explanation: `Concatenate the digits. Same value as binary — denser writing for humans and for memory dumps.`,
    math: `${bits}₂ = ${out}${to === 'hex' ? '₁₆' : '₈'} = ${n}₁₀`,
    hardware: `Display / UART often ships bytes as two hex nybbles for exactly this reason.`,
    bits,
    rows: [{ label: name, value: out, hot: true }],
    stage: `binary→${to}`,
  })
  return steps
}

function digitToBinarySteps(n: number, from: 'hex' | 'octal'): LessonStep[] {
  const base = from === 'hex' ? 16 : 8
  const str = from === 'hex' ? toHex(n) : toOctal(n)
  const group = from === 'hex' ? 4 : 3
  const steps: LessonStep[] = [
    {
      id: 'dgt-start',
      title: `1 · Expand each ${from} digit`,
      explanation: `Every ${from} digit becomes a fixed ${group}-bit pattern. Expand digit-by-digit, then concatenate.`,
      math: `${str}${from === 'hex' ? '₁₆' : '₈'} → binary`,
      hardware: `Digit → ${group}-bit LUT, then wire-concat onto the binary bus.`,
      rows: [{ label: from, value: str }],
      stage: `${from}→binary`,
    },
  ]

  const parts: string[] = []
  ;[...str].forEach((ch, i) => {
    const val = parseInt(ch, base)
    const bits = val.toString(2).padStart(group, '0')
    parts.push(bits)
    steps.push({
      id: `dgt-${i}`,
      title: `2.${i + 1} · ‘${ch}’ → ${bits}`,
      explanation: `Digit ${ch} = ${val}₁₀ = ${bits}₂.`,
      math: `${ch} → ${bits}`,
      hardware: `LUT row for glyph ${ch}.`,
      bits,
      bitsLabel: `Digit ${ch}`,
      rows: [{ label: 'Binary so far', value: parts.join(' '), hot: true }],
      pulse: true,
      stage: `${from}→binary`,
    })
  })

  const bin = toBinary(n, widthFor(n))
  steps.push({
    id: 'dgt-done',
    title: '3 · Concatenate',
    explanation: 'Join the groups — that is the binary number (drop leading zeros if you like).',
    math: `${parts.join(' ')} → ${bin}₂ = ${n}₁₀`,
    hardware: 'Barrel of wires — no clock needed for the expansion itself.',
    bits: bin,
    bitsLabel: 'Binary',
    rows: [{ label: 'Decimal check', value: String(n) }],
    stage: `${from}→binary`,
  })
  return steps
}

function decimalDivBaseSteps(n: number, to: 'hex' | 'octal'): LessonStep[] {
  const base = to === 'hex' ? 16 : 8
  const name = to
  const steps: LessonStep[] = [
    {
      id: 'div-start',
      title: `1 · Repeated division by ${base}`,
      explanation: `Same idea as decimal→binary, but divisor is ${base}. Remainders become ${name} digits (LSB first).`,
      math: `${n}₁₀ → ${name}`,
      hardware: `Integer divider with constant divisor ${base}; remainder register is the next digit.`,
      stage: `decimal→${to}`,
    },
  ]

  let q = n
  const rems: string[] = []
  let i = 0
  if (n === 0) rems.push('0')
  while (q > 0) {
    const rem = q % base
    const next = Math.floor(q / base)
    const dig = to === 'hex' ? rem.toString(16).toUpperCase() : String(rem)
    rems.push(dig)
    steps.push({
      id: `div-${i}`,
      title: `2.${i + 1} · ${q} ÷ ${base}`,
      explanation: `Quotient ${next}, remainder ${dig} (new least-significant ${name} digit).`,
      math: `${q} ÷ ${base} = ${next} rem ${dig}\nDigits LSB→…: ${rems.join(' ')}`,
      hardware: `Divider cycle ${i + 1}: capture remainder digit ${dig}.`,
      rows: [
        { label: 'Quotient', value: String(next), hot: true },
        { label: 'Digits LSB-first', value: rems.join(', '), hot: true },
      ],
      pulse: true,
      stage: `decimal→${to}`,
    })
    q = next
    i++
  }

  const out = [...rems].reverse().join('') || '0'
  steps.push({
    id: 'div-done',
    title: '3 · Reverse remainders',
    explanation: 'First remainder is the least-significant digit — reverse for normal writing.',
    math: `${n}₁₀ = ${out}${to === 'hex' ? '₁₆' : '₈'}`,
    hardware: 'Push digits into a stack / shift into a display register from the left.',
    rows: [{ label: name, value: out, hot: true }],
    stage: `decimal→${to}`,
  })
  return steps
}

function polyToDecimalSteps(n: number, from: 'hex' | 'octal'): LessonStep[] {
  const base = from === 'hex' ? 16 : 8
  const str = from === 'hex' ? toHex(n) : toOctal(n)
  const steps: LessonStep[] = [
    {
      id: 'poly-start',
      title: `1 · Powers of ${base}`,
      explanation: `Expand positional notation: each digit × ${base}^position, then sum.`,
      math: `${str}${from === 'hex' ? '₁₆' : '₈'} = Σ dᵢ·${base}ⁱ`,
      hardware: 'Horner’s method on an ALU: acc = acc*base + digit — fewer multiplies.',
      rows: [{ label: from, value: str }],
      stage: `${from}→decimal`,
    },
  ]

  let sum = 0
  const chars = [...str]
  chars.forEach((ch, i) => {
    const power = chars.length - 1 - i
    const d = parseInt(ch, base)
    const term = d * base ** power
    sum += term
    steps.push({
      id: `poly-${i}`,
      title: `2.${i + 1} · ${ch} × ${base}^${power}`,
      explanation: `Digit ${ch} contributes ${term}.`,
      math: `${d} × ${base}^${power} = ${term}\nRunning sum = ${sum}`,
      hardware: power === 0 ? 'Add digit.' : `Shift/multiply accumulator by ${base}, add digit (Horner).`,
      rows: [
        { label: 'Term', value: String(term), hot: true },
        { label: 'Sum', value: String(sum), hot: true },
      ],
      pulse: d !== 0,
      stage: `${from}→decimal`,
    })
  })

  steps.push({
    id: 'poly-done',
    title: '3 · Decimal',
    explanation: 'Sum of weighted digits is the decimal value.',
    math: `${str} = ${n}₁₀`,
    hardware: 'Accumulator output.',
    rows: [{ label: 'Decimal', value: String(n), hot: true }],
    stage: `${from}→decimal`,
  })
  return steps
}

function binaryToGraySteps(n: number): LessonStep[] {
  const w = widthFor(n)
  const b = toBinary(n, w)
  const g = toBinary(binaryToGray(n), w)
  const steps: LessonStep[] = [
    {
      id: 'gray-start',
      title: '1 · Why Gray code?',
      explanation:
        'Adjacent values differ by exactly one bit — critical for rotary encoders so a slight misalignment never invents a wild intermediate code.',
      math: `G = B ⊕ (B ≫ 1)\nB = ${b}`,
      hardware: 'Each Gray bit is XOR of binary bit i and bit i+1 — pure combinational gates.',
      bits: b,
      bitsLabel: 'Binary B',
      stage: 'binary→gray',
    },
  ]
  for (let i = 0; i < w; i++) {
    const bi = b[i]
    const bShift = i === 0 ? '0' : b[i - 1]
    const gi = g[i]
    steps.push({
      id: `gray-${i}`,
      title: `2.${i + 1} · g${w - 1 - i} = b${w - 1 - i} ⊕ b${w - i}`,
      explanation: `XOR bit ${bi} with the bit on its left (${bShift}, or 0 for MSB) → Gray bit ${gi}.`,
      math: `${bi} ⊕ ${bShift} = ${gi}`,
      hardware: `XOR gate on lines b${w - 1 - i} and b${w - i}.`,
      bits: g.slice(0, i + 1).padEnd(w, '0'),
      bitsLabel: 'Gray forming',
      rows: [
        { label: 'Binary', value: b },
        { label: 'Gray so far', value: `${g.slice(0, i + 1)}…`, hot: true },
      ],
      pulse: true,
      stage: 'binary→gray',
    })
  }
  steps.push({
    id: 'gray-done',
    title: '3 · Gray result',
    explanation: `Gray(${n}) = ${g}₂. Only one bit flips when counting in Gray.`,
    math: `${b}₂ → ${g}_Gray`,
    hardware: 'Encoder disk contacts often wired in Gray already.',
    bits: g,
    bitsLabel: 'Gray code',
    stage: 'binary→gray',
  })
  return steps
}

function binaryFromGraySteps(grayBits: string, decimal: number): LessonStep[] {
  const g = grayBits.replace(/\s/g, '')
  const w = g.length
  const bArr: string[] = []
  const steps: LessonStep[] = [
    {
      id: 'g2b-start',
      title: '1 · Decode Gray → binary',
      explanation: 'MSB copies. Each next binary bit is XOR of the previous binary bit with the current Gray bit.',
      math: `b_{n-1} = g_{n-1}\nb_i = b_{i+1} ⊕ g_i`,
      hardware: 'Chain of XOR gates from MSB down to LSB — still combinational.',
      bits: g,
      bitsLabel: 'Gray G',
      stage: 'gray→binary',
    },
  ]

  for (let i = 0; i < w; i++) {
    if (i === 0) bArr.push(g[0])
    else {
      const bit = Number(bArr[i - 1]) ^ Number(g[i])
      bArr.push(String(bit))
    }
    steps.push({
      id: `g2b-${i}`,
      title: i === 0 ? '2.1 · Copy MSB' : `2.${i + 1} · b = prev_b ⊕ g`,
      explanation:
        i === 0
          ? `Binary MSB = Gray MSB = ${g[0]}.`
          : `${bArr[i - 1]} ⊕ ${g[i]} = ${bArr[i]}.`,
      math: i === 0 ? `b_msb = ${g[0]}` : `${bArr[i - 1]} ⊕ ${g[i]} = ${bArr[i]}`,
      hardware: i === 0 ? 'Wire through.' : `XOR stage ${i}.`,
      bits: bArr.join('').padEnd(w, '·'),
      bitsLabel: 'Binary forming',
      rows: [
        { label: 'Gray', value: g },
        { label: 'Binary', value: bArr.join(''), hot: true },
      ],
      pulse: true,
      stage: 'gray→binary',
    })
  }

  steps.push({
    id: 'g2b-done',
    title: '3 · Binary / decimal',
    explanation: 'Decoded binary matches the numeric value.',
    math: `${g}_Gray → ${bArr.join('')}₂ = ${decimal}₁₀`,
    hardware: 'Feed binary into the rest of the digital system.',
    bits: bArr.join(''),
    rows: [{ label: 'Decimal', value: String(decimal), hot: true }],
    stage: 'gray→binary',
  })
  return steps
}

function decimalToBcdSteps(n: number): LessonStep[] {
  const digits = String(n).split('').map(Number)
  const steps: LessonStep[] = [
    {
      id: 'd2bcd-start',
      title: '1 · One nibble per decimal digit',
      explanation:
        'BCD keeps decimal digits honest: each digit 0–9 becomes a 4-bit code 0000–1001. Codes 1010–1111 are illegal.',
      math: `${n}₁₀ → split digits → 4-bit each`,
      hardware: 'Digit register → BCD encoder ROM, or keep decade counters that already count in 0000–1001.',
      rows: [{ label: 'Digits', value: digits.join(' , ') }],
      stage: 'decimal→bcd',
    },
  ]
  const nibs: string[] = []
  digits.forEach((d, i) => {
    const bits = d.toString(2).padStart(4, '0')
    nibs.push(bits)
    steps.push({
      id: `d2bcd-${i}`,
      title: `2.${i + 1} · Digit ${d} → ${bits}`,
      explanation: `Decimal ${d} maps to nibble ${bits}. Never A–F.`,
      math: `${d}₁₀ = ${bits}₂ (BCD)`,
      hardware: `Encoder for digit place 10^${digits.length - 1 - i}.`,
      bits,
      bitsLabel: `Nibble (digit ${d})`,
      rows: [{ label: 'BCD so far', value: nibs.join(' '), hot: true }],
      pulse: true,
      stage: 'decimal→bcd',
    })
  })
  steps.push({
    id: 'd2bcd-done',
    title: '3 · Packed BCD',
    explanation: 'Concatenate nibbles. Displays and RTC chips often speak this format.',
    math: `${n}₁₀ = ${nibs.join(' ')} (BCD)`,
    hardware: 'BCD bus → 7-segment decoder per nibble.',
    bits: nibs.join(''),
    bitsLabel: 'Packed BCD',
    stage: 'decimal→bcd',
  })
  return steps
}

function bcdToDecimalSteps(n: number, bcdBits?: string): LessonStep[] {
  const bits = (bcdBits ?? formatBcdNibbles(n).replace(/\s/g, ''))
  const nibs: string[] = []
  for (let i = 0; i < bits.length; i += 4) nibs.push(bits.slice(i, i + 4))
  const steps: LessonStep[] = [
    {
      id: 'bcd2d-start',
      title: '1 · Split into nibbles',
      explanation: 'Read each 4-bit group as a decimal digit (must be 0–9).',
      math: `BCD ${nibs.join(' ')}`,
      hardware: 'Demux bus into decade digits.',
      bits,
      stage: 'bcd→decimal',
    },
  ]
  const digits: number[] = []
  nibs.forEach((nib, i) => {
    const d = parseInt(nib, 2)
    digits.push(d)
    steps.push({
      id: `bcd2d-${i}`,
      title: `2.${i + 1} · ${nib} → ${d}`,
      explanation: d > 9 ? 'Illegal BCD!' : `Nibble value ${d} is the decimal digit.`,
      math: `${nib}₂ = ${d}₁₀`,
      hardware: 'Range check: flag if nibble > 1001.',
      bits: nib,
      invalid: d > 9,
      rows: [{ label: 'Digits', value: digits.join(''), hot: true }],
      pulse: true,
      stage: 'bcd→decimal',
    })
  })
  steps.push({
    id: 'bcd2d-done',
    title: '3 · Decimal',
    explanation: 'Concatenate digits.',
    math: `${digits.join('')}₁₀ = ${n}`,
    hardware: 'Done.',
    rows: [{ label: 'Decimal', value: String(n), hot: true }],
    stage: 'bcd→decimal',
  })
  return steps
}

function binaryToBcdSteps(n: number): LessonStep[] {
  const frames = buildDoubleDabble(n, widthFor(n, 8))
  return frames.map((f, idx) => ({
    id: `dab-${idx}`,
    title: f.title,
    explanation: f.explanation,
    math: f.math,
    hardware:
      f.action === 'correct'
        ? '+3 before the next shift ≡ +6 after the shift — same illegal-code skip as BCD adders.'
        : 'Shift register + nibble correctors (double dabble / “shift-and-add-3”).',
    bits: f.nibbleBits.join(''),
    bitsLabel: 'BCD nibbles',
    rows: [
      { label: 'Binary left', value: f.binaryLeft || '—' },
      { label: 'Digits', value: f.nibbles.join(' '), hot: f.action === 'correct' },
    ],
    pulse: f.action === 'shift' || f.action === 'correct',
    invalid: f.action === 'correct',
    stage: 'binary→bcd',
  }))
}

function bcdToBinarySteps(n: number): LessonStep[] {
  // Teach via: BCD → decimal weights, then mention binary result (or reverse dabble briefly)
  const digits = String(n).split('').map(Number)
  const steps: LessonStep[] = [
    {
      id: 'bcd2b-start',
      title: '1 · BCD → binary path',
      explanation:
        'Hardware often converts BCD→binary by Horner: start from MSD, repeatedly binary = binary*10 + next_digit (with binary ×10 = (x<<3)+(x<<1)).',
      math: `digits ${digits.join(' ')}\nacc = ((acc×10) + d)`,
      hardware: '×10 shifter-adder + digit add — classic BCD-to-binary converter block.',
      stage: 'bcd→binary',
    },
  ]
  let acc = 0
  digits.forEach((d, i) => {
    const before = acc
    acc = acc * 10 + d
    steps.push({
      id: `bcd2b-${i}`,
      title: `2.${i + 1} · acc×10 + ${d}`,
      explanation: `Previous acc ${before} → ×10 → ${before * 10}, add digit ${d} → ${acc}.`,
      math: `${before} × 10 + ${d} = ${acc}\n(×10 = «3 + «1 in binary)`,
      hardware: `Shifters: ${before}<<3 + ${before}<<1, then add nibble ${d
        .toString(2)
        .padStart(4, '0')}.`,
      bits: toBinary(acc, widthFor(acc)),
      bitsLabel: 'Binary accumulator',
      rows: [{ label: 'acc', value: String(acc), hot: true }],
      pulse: true,
      stage: 'bcd→binary',
    })
  })
  steps.push({
    id: 'bcd2b-done',
    title: '3 · Binary result',
    explanation: 'Accumulator is pure binary.',
    math: `BCD ${formatBcdNibbles(n)} → ${toBinary(n, widthFor(n))}₂ = ${n}₁₀`,
    hardware: 'Output register.',
    bits: toBinary(n, widthFor(n)),
    stage: 'bcd→binary',
  })
  return steps
}

function bridgeStep(from: RadixFormat, via: RadixFormat, value: string): LessonStep {
  return {
    id: `bridge-${from}-${via}`,
    title: `Bridge · ${labelOf(from)} → ${labelOf(via)}`,
    explanation: `No single textbook “gadget” for this pair — we convert through ${labelOf(via)}, which is what hardware usually does too (normalize to binary, then re-encode).`,
    math: `Path: ${labelOf(from)} → ${labelOf(via)} → …\nCurrent value: ${value}`,
    hardware: 'Think of the CPU: almost everything becomes binary on the bus first.',
    rows: [{ label: 'Via', value: labelOf(via), hot: true }],
    stage: 'bridge',
  }
}

function atomicSteps(
  from: RadixFormat,
  to: RadixFormat,
  n: number,
  rawBits?: string,
): LessonStep[] {
  if (from === to) {
    return [
      {
        id: 'same',
        title: 'Already there',
        explanation: 'Start and end formats match — nothing to convert.',
        math: formatOut(n, to),
        hardware: 'Wire-through.',
        rows: [{ label: labelOf(to), value: formatOut(n, to) }],
      },
    ]
  }

  if (from === 'decimal' && to === 'binary') return decimalToBinarySteps(n)
  if (from === 'binary' && to === 'decimal') return binaryToDecimalSteps(n)
  if (from === 'binary' && to === 'hex') return binaryGroupSteps(n, 4, 'hex')
  if (from === 'binary' && to === 'octal') return binaryGroupSteps(n, 3, 'octal')
  if (from === 'hex' && to === 'binary') return digitToBinarySteps(n, 'hex')
  if (from === 'octal' && to === 'binary') return digitToBinarySteps(n, 'octal')
  if (from === 'decimal' && to === 'hex') return decimalDivBaseSteps(n, 'hex')
  if (from === 'decimal' && to === 'octal') return decimalDivBaseSteps(n, 'octal')
  if (from === 'hex' && to === 'decimal') return polyToDecimalSteps(n, 'hex')
  if (from === 'octal' && to === 'decimal') return polyToDecimalSteps(n, 'octal')
  if (from === 'binary' && to === 'gray') return binaryToGraySteps(n)
  if (from === 'gray' && to === 'binary') {
    const gBits = rawBits && /^[01]+$/.test(rawBits.replace(/\s/g, ''))
      ? rawBits.replace(/\s/g, '')
      : toBinary(binaryToGray(n), widthFor(n))
    return binaryFromGraySteps(gBits, n)
  }
  if (from === 'decimal' && to === 'bcd') return decimalToBcdSteps(n)
  if (from === 'bcd' && to === 'decimal') return bcdToDecimalSteps(n, rawBits?.replace(/\s/g, ''))
  if (from === 'binary' && to === 'bcd') return binaryToBcdSteps(n)
  if (from === 'bcd' && to === 'binary') return bcdToBinarySteps(n)

  return [
    {
      id: 'fallback',
      title: 'Convert',
      explanation: `Result in ${labelOf(to)}.`,
      math: formatOut(n, to),
      hardware: 'See bridged path.',
      rows: [{ label: labelOf(to), value: formatOut(n, to) }],
    },
  ]
}

export interface BuildLessonArgs {
  from: RadixFormat
  to: RadixFormat
  /** Decimal meaning of the value */
  value: number
  /** Original bit string when from is binary/gray/bcd */
  rawInput?: string
}

export function buildConversionLesson(args: BuildLessonArgs): LessonStep[] {
  const { from, to, value, rawInput } = args
  const path = route(from, to)
  const steps: LessonStep[] = [
    {
      id: 'intro',
      title: `Convert ${labelOf(from)} → ${labelOf(to)}`,
      explanation: `We will walk every intermediate step — math on the left, what the hardware is doing on the right — not just the final answer.`,
      math: `Input ≈ ${formatOut(value, from === 'gray' ? 'decimal' : from)}\nTarget format: ${labelOf(to)}\nPath: ${path.map(labelOf).join(' → ')}`,
      hardware: path.length > 2
        ? `Multi-stage path via ${labelOf(path[1])} (typical in real machines).`
        : 'Direct conversion algorithm.',
      rows: [
        { label: 'From', value: labelOf(from) },
        { label: 'To', value: labelOf(to), hot: true },
        { label: 'Value', value: String(value) },
      ],
      stage: 'intro',
    },
  ]

  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i]
    const b = path[i + 1]
    if (i > 0) {
      steps.push(bridgeStep(a, b, formatOut(value, a)))
    }
    const raw =
      i === 0
        ? rawInput
        : a === 'binary'
          ? toBinary(value, widthFor(value))
          : a === 'bcd'
            ? formatBcdNibbles(value).replace(/\s/g, '')
            : a === 'gray'
              ? toBinary(binaryToGray(value), widthFor(value))
              : undefined
    const chunk = atomicSteps(a, b, value, raw)
    // renumber-ish by prefixing stage already present
    steps.push(...chunk)
  }

  steps.push({
    id: 'finale',
    title: 'Final answer',
    explanation: `Starting from ${labelOf(from)}, the value in ${labelOf(to)} is ready.`,
    math: `${formatOut(value, from === 'gray' ? 'binary' : from)} → ${formatOut(value, to)}`,
    hardware: 'Latched on the output register / display.',
    bits:
      to === 'binary' || to === 'gray' || to === 'bcd'
        ? formatOut(value, to).replace(/\s/g, '').replace(/^0x|^0o/i, '')
        : toBinary(value, widthFor(value)),
    bitsLabel: labelOf(to),
    rows: [
      { label: labelOf(to), value: formatOut(value, to), hot: true },
      { label: 'Decimal check', value: String(value) },
    ],
    pulse: true,
    stage: 'done',
  })

  return steps
}

/** Optional deep-dive when user wants classic BCD adder +6 */
export function buildPlus6DeepDive(a: number, b: number, cin: number): LessonStep[] {
  return buildPlus6Lesson(a, b, cin).map((s) => ({
    id: s.id,
    title: s.title,
    explanation: s.explanation,
    math: s.math,
    hardware: s.hardware,
    bits: s.highlight === 'plus6' || s.highlight === 'done'
      ? s.digit.toString(2).padStart(4, '0')
      : (s.rawSum & 0xf).toString(2).padStart(4, '0'),
    bitsLabel: 'Digit nibble',
    invalid: s.needsCorrection && (s.highlight === 'check' || s.highlight === 'plus6'),
    rows: [
      { label: 'A', value: `${s.a} (${s.a.toString(2).padStart(4, '0')})` },
      { label: 'B', value: `${s.b} (${s.b.toString(2).padStart(4, '0')})` },
      { label: 'Raw sum', value: String(s.rawSum), hot: s.highlight === 'add' || s.highlight === 'check' },
      { label: 'Carry', value: String(s.carryOut), hot: s.highlight === 'carry' },
      { label: 'Digit', value: String(s.digit), hot: s.highlight === 'done' },
    ],
    pulse: true,
    stage: 'bcd-plus6',
  }))
}
