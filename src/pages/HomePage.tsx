import { Link } from 'react-router-dom'
import { CURRICULUM } from '../lib/eeCalcs'

export function HomePage() {
  return (
    <div className="page">
      <section className="hero">
        <div className="kicker">Ultimate EE student toolkit</div>
        <h1>
          Bit<span style={{ color: 'var(--copper)' }}>Lab</span>
          <br />
          <em>degree-shaped.</em>
        </h1>
        <p>
          From number bases and מפות קרנו to gates, flip-flops, DC circuits, Ohm’s law, and AC
          phasors — one lab for the skills that show up across an electrical engineering degree.
        </p>
      </section>

      {CURRICULUM.map((section) => (
        <div key={section.area} style={{ marginTop: '1.75rem' }}>
          <div className="kicker">{section.area}</div>
          <div className="grid-cards" style={{ marginTop: '0.65rem' }}>
            {section.items.map((item) => (
              <Link key={item.to} className="card-link" to={item.to}>
                <strong>{item.title}</strong>
                <span>{item.blurb}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}

      <div className="panel" style={{ marginTop: '1.75rem' }}>
        <h2 className="step-title">What’s covered vs still growing</h2>
        <p className="explain">
          <strong style={{ color: 'var(--teal)' }}>Ready now:</strong> digital (bases, BCD +6, K-maps,
          truth tables, gate lab, flip-flops), DC circuit studio with traditional symbols, resistor
          color code, Ohm/power, series RLC phasors, formula sheet.
        </p>
        <p className="explain">
          <strong style={{ color: 'var(--copper)' }}>Natural next labs:</strong> counters/FSM builder,
          op-amp ideal circuits, Thevenin/Norton trainer, Bode plots, three-phase power, Laplace
          transform crib — tell me which course you’re in and we’ll prioritize.
        </p>
      </div>
    </div>
  )
}
