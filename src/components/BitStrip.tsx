export function BitStrip({
  bits,
  invalid,
  pulse,
  carryIndex,
}: {
  bits: string
  invalid?: boolean
  pulse?: boolean
  carryIndex?: number
}) {
  const clean = bits.replace(/\s/g, '')
  return (
    <div className="bits" aria-label={`bits ${clean}`}>
      {clean.split('').map((b, i) => {
        const on = b === '1'
        const classes = [
          'bit',
          on ? 'on' : '',
          pulse ? 'pulse' : '',
          invalid ? 'invalid' : '',
          carryIndex === i ? 'carry' : '',
        ]
          .filter(Boolean)
          .join(' ')
        return (
          <div key={`${i}-${b}`} className={classes}>
            {b}
          </div>
        )
      })}
    </div>
  )
}
