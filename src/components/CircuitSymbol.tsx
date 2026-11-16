import type { PartType } from '../lib/circuitSim'

export function partSize(type: PartType): { w: number; h: number } {
  if (type === 'ground') return { w: 72, h: 70 }
  return { w: 110, h: 70 }
}

export function partPortPos(type: PartType, port: 0 | 1): { x: number; y: number } {
  const { w, h } = partSize(type)
  if (type === 'ground') {
    return port === 0 ? { x: w / 2, y: 8 } : { x: w / 2, y: 8 }
  }
  return { x: port === 0 ? 4 : w - 4, y: h / 2 - 4 }
}

type Props = {
  type: PartType
  on?: boolean
  lit?: boolean
  selected?: boolean
  value?: number
  label?: string
  mini?: boolean
  running?: boolean
}

/** Traditional schematic symbols (ANSI-style zigzag R, cell battery, lamp, switch…). */
export function CircuitSymbol({ type, on, lit, selected, value, label, mini, running }: Props) {
  const stroke = selected ? '#3ecf9a' : running ? '#e8b84a' : '#e8efe9'
  const sw = mini ? 2.2 : 2.5
  const w = mini ? 56 : partSize(type).w
  const h = mini ? 36 : partSize(type).h

  if (type === 'battery') {
    return (
      <svg viewBox="0 0 110 70" width={w} height={h} aria-hidden>
        <line x1="6" y1="35" x2="34" y2="35" stroke={stroke} strokeWidth={sw} />
        {/* − short thick, + long thin (IEC/ANSI cell) */}
        <line x1="38" y1="22" x2="38" y2="48" stroke={stroke} strokeWidth={4} />
        <line x1="50" y1="14" x2="50" y2="56" stroke={stroke} strokeWidth={2.2} />
        <line x1="54" y1="35" x2="104" y2="35" stroke={stroke} strokeWidth={sw} />
        {!mini && (
          <text x="55" y="68" textAnchor="middle" fill="#8aa397" fontSize="10" fontFamily="IBM Plex Mono, monospace">
            {value != null ? `${value}V` : 'BAT'} +
          </text>
        )}
      </svg>
    )
  }

  if (type === 'resistor') {
    // Zig-zag ANSI
    return (
      <svg viewBox="0 0 110 70" width={w} height={h} aria-hidden>
        <line x1="6" y1="35" x2="22" y2="35" stroke={stroke} strokeWidth={sw} />
        <polyline
          points="22,35 30,20 38,50 46,20 54,50 62,20 70,50 78,35"
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
        <line x1="78" y1="35" x2="104" y2="35" stroke={stroke} strokeWidth={sw} />
        {!mini && (
          <text x="55" y="68" textAnchor="middle" fill="#8aa397" fontSize="10" fontFamily="IBM Plex Mono, monospace">
            {value != null ? `${value}Ω` : 'R'}
          </text>
        )}
      </svg>
    )
  }

  if (type === 'led' || type === 'bulb') {
    // Lamp: circle with X
    return (
      <svg viewBox="0 0 110 70" width={w} height={h} aria-hidden>
        <line x1="6" y1="35" x2="28" y2="35" stroke={stroke} strokeWidth={sw} />
        <circle
          cx="55"
          cy="35"
          r="18"
          fill={lit ? 'rgba(232,184,74,0.25)' : 'transparent'}
          stroke={lit ? '#e8b84a' : stroke}
          strokeWidth={sw}
        />
        <line x1="42" y1="22" x2="68" y2="48" stroke={lit ? '#e8b84a' : stroke} strokeWidth={sw} />
        <line x1="68" y1="22" x2="42" y2="48" stroke={lit ? '#e8b84a' : stroke} strokeWidth={sw} />
        <line x1="82" y1="35" x2="104" y2="35" stroke={stroke} strokeWidth={sw} />
        {!mini && (
          <text x="55" y="68" textAnchor="middle" fill="#8aa397" fontSize="10" fontFamily="IBM Plex Mono, monospace">
            {label ?? 'LAMP'}
          </text>
        )}
      </svg>
    )
  }

  if (type === 'switch') {
    return (
      <svg viewBox="0 0 110 70" width={w} height={h} aria-hidden>
        <line x1="6" y1="42" x2="30" y2="42" stroke={stroke} strokeWidth={sw} />
        <circle cx="34" cy="42" r="3.5" fill="#0c1210" stroke={stroke} strokeWidth={sw} />
        {on ? (
          <line x1="34" y1="42" x2="76" y2="42" stroke={stroke} strokeWidth={sw} />
        ) : (
          <line x1="34" y1="42" x2="70" y2="18" stroke={stroke} strokeWidth={sw} />
        )}
        <circle cx="76" cy="42" r="3.5" fill="#0c1210" stroke={stroke} strokeWidth={sw} />
        <line x1="76" y1="42" x2="104" y2="42" stroke={stroke} strokeWidth={sw} />
        {!mini && (
          <text x="55" y="68" textAnchor="middle" fill="#8aa397" fontSize="10" fontFamily="IBM Plex Mono, monospace">
            {on ? 'CLOSED' : 'OPEN'}
          </text>
        )}
      </svg>
    )
  }

  if (type === 'ground') {
    return (
      <svg viewBox="0 0 72 70" width={mini ? 40 : 72} height={mini ? 36 : 70} aria-hidden>
        <line x1="36" y1="8" x2="36" y2="28" stroke={stroke} strokeWidth={sw} />
        <line x1="18" y1="28" x2="54" y2="28" stroke={stroke} strokeWidth={sw} />
        <line x1="24" y1="36" x2="48" y2="36" stroke={stroke} strokeWidth={sw} />
        <line x1="30" y1="44" x2="42" y2="44" stroke={stroke} strokeWidth={sw} />
        {!mini && (
          <text x="36" y="62" textAnchor="middle" fill="#8aa397" fontSize="10" fontFamily="IBM Plex Mono, monospace">
            GND
          </text>
        )}
      </svg>
    )
  }

  if (type === 'diode') {
    return (
      <svg viewBox="0 0 110 70" width={w} height={h} aria-hidden>
        <line x1="6" y1="35" x2="38" y2="35" stroke={stroke} strokeWidth={sw} />
        <path d="M 38 18 L 70 35 L 38 52 Z" fill="transparent" stroke={stroke} strokeWidth={sw} />
        <line x1="70" y1="18" x2="70" y2="52" stroke={stroke} strokeWidth={sw} />
        <line x1="70" y1="35" x2="104" y2="35" stroke={stroke} strokeWidth={sw} />
        {!mini && (
          <text x="55" y="68" textAnchor="middle" fill="#8aa397" fontSize="10" fontFamily="IBM Plex Mono, monospace">
            DIODE
          </text>
        )}
      </svg>
    )
  }

  if (type === 'fuse') {
    return (
      <svg viewBox="0 0 110 70" width={w} height={h} aria-hidden>
        <line x1="6" y1="35" x2="28" y2="35" stroke={stroke} strokeWidth={sw} />
        <rect x="28" y="22" width="54" height="26" fill="transparent" stroke={stroke} strokeWidth={sw} />
        <line x1="28" y1="35" x2="82" y2="35" stroke={stroke} strokeWidth={sw} />
        <line x1="82" y1="35" x2="104" y2="35" stroke={stroke} strokeWidth={sw} />
        {!mini && (
          <text x="55" y="68" textAnchor="middle" fill="#8aa397" fontSize="10" fontFamily="IBM Plex Mono, monospace">
            FUSE
          </text>
        )}
      </svg>
    )
  }

  if (type === 'ammeter' || type === 'voltmeter') {
    const letter = type === 'ammeter' ? 'A' : 'V'
    return (
      <svg viewBox="0 0 110 70" width={w} height={h} aria-hidden>
        <line x1="6" y1="35" x2="30" y2="35" stroke={stroke} strokeWidth={sw} />
        <circle cx="55" cy="35" r="20" fill="transparent" stroke={stroke} strokeWidth={sw} />
        <text
          x="55"
          y="41"
          textAnchor="middle"
          fill={stroke}
          fontSize="18"
          fontFamily="IBM Plex Mono, monospace"
          fontWeight="600"
        >
          {letter}
        </text>
        <line x1="80" y1="35" x2="104" y2="35" stroke={stroke} strokeWidth={sw} />
      </svg>
    )
  }

  // junction / wire node
  return (
    <svg viewBox="0 0 110 70" width={w} height={h} aria-hidden>
      <line x1="6" y1="35" x2="104" y2="35" stroke={stroke} strokeWidth={sw} />
      <circle cx="55" cy="35" r="5" fill={stroke} />
      {!mini && (
        <text x="55" y="60" textAnchor="middle" fill="#8aa397" fontSize="10" fontFamily="IBM Plex Mono, monospace">
          WIRE
        </text>
      )}
    </svg>
  )
}
