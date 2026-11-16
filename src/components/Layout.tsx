import { NavLink, Outlet } from 'react-router-dom'
import { UpdatePrompt } from './UpdatePrompt'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/convert', label: 'Convert' },
  { to: '/lesson', label: 'Lesson' },
  { to: '/kmap', label: 'K-map' },
  { to: '/mccluskey', label: 'McCluskey' },
  { to: '/boolean', label: 'Boolean' },
  { to: '/logic', label: 'Logic' },
  { to: '/seq', label: 'Seq' },
  { to: '/circuits', label: 'Circuits' },
  { to: '/tools', label: 'Tools' },
  { to: '/about', label: 'About' },
]

export function Layout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          Bit<span>Lab</span>
          <small>EE toolkit</small>
        </div>
        <nav className="nav">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      <UpdatePrompt />
    </div>
  )
}
