export type RadixFormat = 'decimal' | 'binary' | 'bcd' | 'gray' | 'hex' | 'octal'

export function toBinary(n: number, width = 8): string {
  if (!Number.isFinite(n) || n < 0) return '0'.repeat(width)
  return Math.floor(n).toString(2).padStart(width, '0')
}

export function toHex(n: number): string {
  return Math.floor(Math.max(0, n)).toString(16).toUpperCase()
}

export function toOctal(n: number): string {
  return Math.floor(Math.max(0, n)).toString(8)
}

/** Binary → Gray: G = B ⊕ (B >> 1) */
export function binaryToGray(n: number): number {
  const b = Math.floor(Math.max(0, n))
  return b ^ (b >> 1)
}

export function grayToBinary(g: number): number {
  let gray = Math.floor(Math.max(0, g))
  let b = gray
  while (gray >>= 1) b ^= gray
  return b
}

/** Packed BCD: each decimal digit in a 4-bit nibble */
export function decimalToBcd(n: number): number {
  const d = Math.floor(Math.max(0, n))
  const digits = String(d).split('').map(Number)
  let bcd = 0
  for (const digit of digits) {
    bcd = (bcd << 4) | digit
  }
  return bcd
}

export function bcdToDecimal(bcd: number): number {
  let value = 0
  let x = Math.floor(Math.max(0, bcd))
  const nibbles: number[] = []
  if (x === 0) return 0
  while (x > 0) {
    nibbles.unshift(x & 0xf)
    x >>= 4
  }
  for (const n of nibbles) {
    if (n > 9) return NaN
    value = value * 10 + n
  }
  return value
}

export function formatBcdNibbles(n: number, digitCount?: number): string {
  const d = Math.floor(Math.max(0, n))
  const str = String(d)
  const count = digitCount ?? str.length
  const padded = str.padStart(count, '0')
  return padded
    .split('')
    .map((ch) => Number(ch).toString(2).padStart(4, '0'))
    .join(' ')
}

export function parseFlexibleInput(raw: string, format: RadixFormat): number | null {
  const s = raw.trim().replace(/\s+/g, '')
  if (!s) return null
  try {
    switch (format) {
      case 'decimal': {
        const n = Number(s)
        return Number.isInteger(n) && n >= 0 ? n : null
      }
      case 'binary': {
        if (!/^[01]+$/.test(s)) return null
        return parseInt(s, 2)
      }
      case 'hex': {
        if (!/^[0-9a-fA-F]+$/.test(s)) return null
        return parseInt(s, 16)
      }
      case 'octal': {
        if (!/^[0-7]+$/.test(s)) return null
        return parseInt(s, 8)
      }
      case 'gray': {
        if (!/^[01]+$/.test(s)) return null
        return grayToBinary(parseInt(s, 2))
      }
      case 'bcd': {
        if (s.length % 4 !== 0 || !/^[01]+$/.test(s)) return null
        let bcd = 0
        for (let i = 0; i < s.length; i += 4) {
          const nib = parseInt(s.slice(i, i + 4), 2)
          if (nib > 9) return null
          bcd = bcd * 10 + nib
        }
        return bcd
      }
      default:
        return null
    }
  } catch {
    return null
  }
}

export function convertAll(decimal: number) {
  const n = Math.floor(Math.max(0, decimal))
  const width = Math.max(8, n.toString(2).length)
  const gray = binaryToGray(n)
  return {
    decimal: n,
    binary: toBinary(n, width),
    hex: toHex(n),
    octal: toOctal(n),
    gray: toBinary(gray, width),
    grayDecimal: gray,
    bcd: formatBcdNibbles(n),
    bcdPacked: decimalToBcd(n),
  }
}
