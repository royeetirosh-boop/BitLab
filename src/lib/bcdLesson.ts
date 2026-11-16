/** Step-by-step models for BCD +6 correction and Double Dabble (binary→BCD). */

export interface Plus6Step {
  id: string
  title: string
  explanation: string
  math: string
  hardware: string
  a: number
  b: number
  rawSum: number
  rawBits: string
  needsCorrection: boolean
  corrected: number
  digit: number
  carryOut: number
  highlight: 'add' | 'check' | 'plus6' | 'carry' | 'done'
}

/**
 * Simulate one-digit BCD addition with +6 hardware correction.
 * Classic 4-bit adder → invalid-code detector → +0110 corrector.
 */
export function buildPlus6Lesson(aDigit: number, bDigit: number, cin = 0): Plus6Step[] {
  const a = Math.min(9, Math.max(0, aDigit))
  const b = Math.min(9, Math.max(0, bDigit))
  const c = cin ? 1 : 0
  const rawSum = a + b + c
  const rawBits = (rawSum & 0x1f).toString(2).padStart(5, '0')
  const needsCorrection = rawSum > 9
  const outDigit = needsCorrection ? (rawSum + 6) & 0xf : rawSum & 0xf
  const outCarry = needsCorrection ? 1 : 0

  const steps: Plus6Step[] = [
    {
      id: 'inputs',
      title: '1 · Load BCD digits into the adder',
      explanation:
        'Each decimal digit lives in a 4-bit nibble (0000–1001). The ALU does not know about “decimal” yet — it only sees binary.',
      math: `A = ${a}₁₀ = ${a.toString(2).padStart(4, '0')}₂\nB = ${b}₁₀ = ${b.toString(2).padStart(4, '0')}₂\nCin = ${c}`,
      hardware: 'Two 4-bit registers feed a binary full-adder chain (bit0→bit3) with carry ripple.',
      a,
      b,
      rawSum,
      rawBits,
      needsCorrection,
      corrected: needsCorrection ? rawSum + 6 : rawSum,
      digit: outDigit,
      carryOut: outCarry,
      highlight: 'add',
    },
    {
      id: 'binary-add',
      title: '2 · Binary add (what the hardware does first)',
      explanation:
        'The adder computes A+B+Cin in pure binary. Valid BCD digits only go up to 9, but binary can produce 10–19. Codes 1010–1111 are illegal in BCD.',
      math: `${a} + ${b} + ${c} = ${rawSum}₁₀ = ${rawBits}₂`,
      hardware: '4-bit ripple-carry adder. Sum bits S3–S0 (+ optional Cout). No BCD logic yet.',
      a,
      b,
      rawSum,
      rawBits,
      needsCorrection,
      corrected: needsCorrection ? rawSum + 6 : rawSum,
      digit: outDigit,
      carryOut: outCarry,
      highlight: 'add',
    },
    {
      id: 'check',
      title: '3 · Is the sum a legal BCD digit?',
      explanation: needsCorrection
        ? `Result ${rawSum} > 9 → illegal BCD (binary codes A–F). Hardware must correct it before the next stage sees it.`
        : `Result ${rawSum} ≤ 9 → already a legal BCD digit. Correction block stays idle (add 0000).`,
      math: needsCorrection
        ? `${rawSum} > 9  ⇒  INVALID BCD  ⇒  enable +6`
        : `${rawSum} ≤ 9  ⇒  VALID BCD  ⇒  skip +6`,
      hardware:
        'Detector: Cout OR (S3·S2) OR (S3·S1). If true, digit ≥10 — classic “invalid BCD” flag that enables the +6 corrector.',
      a,
      b,
      rawSum,
      rawBits,
      needsCorrection,
      corrected: needsCorrection ? rawSum + 6 : rawSum,
      digit: outDigit,
      carryOut: outCarry,
      highlight: 'check',
    },
  ]

  if (needsCorrection) {
    steps.push({
      id: 'plus6',
      title: '4 · Add six (0110) — skip the illegal codes',
      explanation:
        'Binary wastes six patterns between 9 and 16 (A–F). Adding 6 jumps over them so the low nibble becomes the correct decimal digit, and a carry appears for the next BCD digit.',
      math: `${rawSum} + 6 = ${rawSum + 6}\n${(rawSum & 0xf).toString(2).padStart(4, '0')} + 0110 = ${outDigit.toString(2).padStart(4, '0')} with carry ${outCarry}`,
      hardware:
        'Second 4-bit adder adds either 0000 or 0110 depending on the invalid flag. Carry-out of this stage is the BCD decade carry.',
      a,
      b,
      rawSum,
      rawBits,
      needsCorrection,
      corrected: rawSum + 6,
      digit: outDigit,
      carryOut: outCarry,
      highlight: 'plus6',
    })
    steps.push({
      id: 'carry',
      title: '5 · Decade carry to the next digit',
      explanation: `Carry ${outCarry} means “+10 to the next higher decimal place”. Digit out = ${outDigit}. Together they encode ${a}+${b}+${c} = ${rawSum} in BCD.`,
      math: `BCD result = ${outCarry} | ${outDigit.toString(2).padStart(4, '0')}  →  digits ${outCarry}${outDigit}`,
      hardware: 'Carry wire feeds Cin of the next BCD digit slice (cascaded BCD adder).',
      a,
      b,
      rawSum,
      rawBits,
      needsCorrection,
      corrected: rawSum + 6,
      digit: outDigit,
      carryOut: outCarry,
      highlight: 'carry',
    })
  }

  steps.push({
    id: 'done',
    title: needsCorrection ? '6 · Final BCD result' : '4 · Final BCD result',
    explanation: `Decimal ${a}+${b}+${c}=${rawSum} is stored as BCD digit ${outDigit} with carry ${outCarry}. Same wires, just interpreted as decades.`,
    math: `Sum₁₀ = ${rawSum}\nBCD = carry ${outCarry}, digit ${outDigit}\nCheck: ${outCarry}*10 + ${outDigit} = ${outCarry * 10 + outDigit}`,
    hardware: 'Output nibble + carry flag — same idea as a BCD ALU / classic BCD adder block.',
    a,
    b,
    rawSum,
    rawBits,
    needsCorrection,
    corrected: needsCorrection ? rawSum + 6 : rawSum,
    digit: outDigit,
    carryOut: outCarry,
    highlight: 'done',
  })

  return steps
}

export interface DabbleFrame {
  step: number
  title: string
  explanation: string
  math: string
  binaryLeft: string
  nibbles: number[]
  nibbleBits: string[]
  action: 'init' | 'shift' | 'correct' | 'done'
  correctedIndex?: number
}

/**
 * Double dabble (shift-and-add-3): standard binary → BCD algorithm.
 * After each left shift, any nibble ≥ 5 gets +3 (prep for next shift = +6 effect).
 */
export function buildDoubleDabble(value: number, bitWidth = 8): DabbleFrame[] {
  const n = Math.floor(Math.max(0, Math.min(value, 2 ** bitWidth - 1)))
  const digitCount = Math.max(2, Math.ceil(bitWidth / 3))
  const binStr = n.toString(2).padStart(bitWidth, '0')
  const bitQueue = binStr.split('').map((c) => Number(c))
  let nibbles = Array.from({ length: digitCount }, () => 0)

  const snap = (
    step: number,
    title: string,
    explanation: string,
    math: string,
    action: DabbleFrame['action'],
    correctedIndex?: number,
    bitsLeft = '',
  ): DabbleFrame => ({
    step,
    title,
    explanation,
    math,
    binaryLeft: bitsLeft,
    nibbles: [...nibbles],
    nibbleBits: nibbles.map((d) => d.toString(2).padStart(4, '0')),
    action,
    correctedIndex,
  })

  const frames: DabbleFrame[] = [
    snap(
      0,
      'Start · Binary register + empty BCD',
      'Double dabble shifts binary bits left into BCD decades. “+3 before the next shift” is the same math as “+6 after an illegal digit” — both skip the six illegal BCD codes (A–F).',
      `Input = ${n}₁₀ = ${binStr}₂\nBCD nibbles start at 0000`,
      'init',
      undefined,
      binStr,
    ),
  ]

  let step = 1
  for (let i = 0; i < bitWidth; i++) {
    let carry = bitQueue[i]
    for (let d = digitCount - 1; d >= 0; d--) {
      const combined = (nibbles[d] << 1) | carry
      carry = combined >> 4
      nibbles[d] = combined & 0xf
    }

    const left = bitQueue
      .slice(i + 1)
      .join('')
      .padStart(bitWidth - i - 1, '0')

    frames.push(
      snap(
        step++,
        `Shift ${i + 1}/${bitWidth} · Pull in next binary bit`,
        `Shift everything one bit left. Incoming bit = ${bitQueue[i]}. The BCD register absorbs that bit from the right (LSD side).`,
        `bit in = ${bitQueue[i]}\nBCD = ${nibbles.map((d) => d.toString(2).padStart(4, '0')).join(' ')}`,
        'shift',
        undefined,
        left,
      ),
    )

    if (i < bitWidth - 1) {
      for (let d = 0; d < digitCount; d++) {
        if (nibbles[d] >= 5) {
          const before = nibbles[d]
          nibbles[d] += 3
          frames.push(
            snap(
              step++,
              `Correct nibble · +3 (because ≥ 5)`,
              `Nibble was ${before} (≥5). Adding 3 now means after the *next* left-shift it behaves like +6 — the same illegal-code skip used in BCD adders.`,
              `${before} + 3 = ${nibbles[d]}\n${before.toString(2).padStart(4, '0')} + 0011 = ${nibbles[d].toString(2).padStart(4, '0')}\n(Why +3? Next shift ×2 → effect of +6)`,
              'correct',
              d,
              left,
            ),
          )
        }
      }
    }
  }

  frames.push(
    snap(
      step,
      'Done · Packed BCD',
      `Binary ${n} is now BCD digits [${nibbles.join(', ')}]. Read each nibble as a decimal digit.`,
      `${n}₁₀ → BCD ${nibbles.join(' ')} → check ${nibbles.reduce((a, d) => a * 10 + d, 0)}`,
      'done',
      undefined,
      '',
    ),
  )

  return frames
}
