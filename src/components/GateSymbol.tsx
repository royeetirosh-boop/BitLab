import type { GateType } from '../lib/logicSim'

export function gateSize(type: GateType): { w: number; h: number } {
  if (type === 'IN' || type === 'OUT' || type === 'CLK') return { w: 76, h: 68 }
  if (type === 'NOT') return { w: 104, h: 68 }
  return { w: 128, h: 78 }
}

/** Port positions relative to node top-left (CSS px). */
export function gatePortPos(
  type: GateType,
  kind: 'in' | 'out',
  port: number,
): { x: number; y: number } {
  const { w, h } = gateSize(type)
  if (type === 'IN' || type === 'CLK') {
    return { x: w - 4, y: h / 2 - 4 }
  }
  if (type === 'OUT') {
    return { x: 4, y: h / 2 }
  }
  if (type === 'NOT') {
    return kind === 'out' ? { x: w - 4, y: h / 2 } : { x: 4, y: h / 2 }
  }
  if (kind === 'out') return { x: w - 4, y: h / 2 }
  return { x: 4, y: port === 0 ? h * 0.33 : h * 0.67 }
}

type Props = {
  type: GateType
  live?: boolean | undefined
  selected?: boolean
  label?: string
  mini?: boolean
}

/**
 * Traditional ANSI/IEEE distinctive shapes:
 * AND = D, OR = pointed shield, XOR = OR + extra arc, NOT = triangle, * = bubble.
 */
export function GateSymbol({ type, live, selected, label, mini }: Props) {
  const stroke = selected ? '#3ecf9a' : live ? '#d4894a' : '#e8efe9'
  const fill = selected ? 'rgba(62,207,154,0.08)' : 'rgba(10,14,12,0.65)'
  const sw = mini ? 2.4 : 2.6

  if (type === 'IN' || type === 'CLK') {
    const w = mini ? 44 : 76
    const h = mini ? 40 : 68
    return (
      <svg viewBox="0 0 76 68" width={w} height={h} aria-hidden>
        <rect x="6" y="16" width="44" height="36" rx="5" fill={fill} stroke={stroke} strokeWidth={sw} />
        <line x1="50" y1="34" x2="70" y2="34" stroke={stroke} strokeWidth={sw} />
        <circle cx="70" cy="34" r="4" fill={live ? '#3ecf9a' : '#1a2621'} stroke={stroke} strokeWidth={1.6} />
        <text
          x="28"
          y="40"
          textAnchor="middle"
          fill={stroke}
          fontSize="11"
          fontFamily="IBM Plex Mono, monospace"
          fontWeight="600"
        >
          {type === 'CLK' ? 'CLK' : (label ?? 'IN').slice(0, 4)}
        </text>
      </svg>
    )
  }

  if (type === 'OUT') {
    const w = mini ? 44 : 76
    const h = mini ? 40 : 68
    return (
      <svg viewBox="0 0 76 68" width={w} height={h} aria-hidden>
        <line x1="6" y1="34" x2="24" y2="34" stroke={stroke} strokeWidth={sw} />
        <circle
          cx="44"
          cy="34"
          r="17"
          fill={live ? 'rgba(232,184,74,0.28)' : fill}
          stroke={live ? '#e8b84a' : stroke}
          strokeWidth={sw}
        />
        <circle cx="44" cy="34" r={live ? 8 : 4.5} fill={live ? '#e8b84a' : '#24332c'} />
        {!mini && (
          <text x="44" y="62" textAnchor="middle" fill="#8aa397" fontSize="10" fontFamily="IBM Plex Mono, monospace">
            {label ?? 'OUT'}
          </text>
        )}
      </svg>
    )
  }

  if (type === 'NOT') {
    return (
      <svg viewBox="0 0 104 68" width={mini ? 52 : 104} height={mini ? 36 : 68} aria-hidden>
        <line x1="4" y1="34" x2="20" y2="34" stroke={stroke} strokeWidth={sw} />
        <path
          d="M 20 12 L 72 34 L 20 56 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
        <circle cx="80" cy="34" r="6" fill={fill} stroke={stroke} strokeWidth={sw} />
        <line x1="86" y1="34" x2="100" y2="34" stroke={stroke} strokeWidth={sw} />
        {!mini && (
          <text x="48" y="66" textAnchor="middle" fill="#8aa397" fontSize="9" fontFamily="IBM Plex Mono, monospace">
            NOT
          </text>
        )}
      </svg>
    )
  }

  const showBubble = type === 'NAND' || type === 'NOR' || type === 'XNOR'
  const isAndFamily = type === 'AND' || type === 'NAND'
  const isOrFamily = type === 'OR' || type === 'NOR'
  const isXorFamily = type === 'XOR' || type === 'XNOR'

  // Body tip x where output lead / bubble attaches
  const tipX = isAndFamily ? 88 : 92

  return (
    <svg viewBox="0 0 128 78" width={mini ? 64 : 128} height={mini ? 40 : 78} aria-hidden>
      {/* input leads into body */}
      <line
        x1="2"
        y1="26"
        x2={isXorFamily ? 30 : isOrFamily ? 28 : 24}
        y2="26"
        stroke={stroke}
        strokeWidth={sw}
      />
      <line
        x1="2"
        y1="52"
        x2={isXorFamily ? 30 : isOrFamily ? 28 : 24}
        y2="52"
        stroke={stroke}
        strokeWidth={sw}
      />

      {/* AND / NAND — flat back, semicircle front (D-shape) */}
      {isAndFamily && (
        <path
          d="M 24 14 L 58 14 Q 88 14 88 39 Q 88 64 58 64 L 24 64 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      )}

      {/* OR / NOR — concave back, pointed tip */}
      {isOrFamily && (
        <>
          <path
            d="M 28 14
               C 48 14, 72 22, 92 39
               C 72 56, 48 64, 28 64
               C 42 39, 42 39, 28 14 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <path d="M 20 14 Q 36 39 20 64" fill="none" stroke={stroke} strokeWidth={sw} />
        </>
      )}

      {/* XOR / XNOR — OR body + extra input arc */}
      {isXorFamily && (
        <>
          <path d="M 14 14 Q 30 39 14 64" fill="none" stroke={stroke} strokeWidth={sw} />
          <path
            d="M 30 14
               C 50 14, 74 22, 92 39
               C 74 56, 50 64, 30 64
               C 44 39, 44 39, 30 14 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <path d="M 22 14 Q 38 39 22 64" fill="none" stroke={stroke} strokeWidth={sw} />
        </>
      )}

      {showBubble ? (
        <>
          <circle cx={tipX + 7} cy="39" r="6" fill={fill} stroke={stroke} strokeWidth={sw} />
          <line x1={tipX + 13} y1="39" x2="124" y2="39" stroke={stroke} strokeWidth={sw} />
        </>
      ) : (
        <line x1={tipX} y1="39" x2="124" y2="39" stroke={stroke} strokeWidth={sw} />
      )}

      {!mini && (
        <text x="56" y="76" textAnchor="middle" fill="#8aa397" fontSize="9" fontFamily="IBM Plex Mono, monospace">
          {type}
        </text>
      )}
    </svg>
  )
}
