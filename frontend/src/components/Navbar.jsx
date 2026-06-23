import { useNavigate, useLocation } from 'react-router-dom'

const NAV_LINKS = [
  { label: 'Estudiantes', path: '/students' },
]

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const username = localStorage.getItem('username') || 'U'
  const initials = username.slice(0, 2).toUpperCase()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    navigate('/login')
  }

  const isActive = (path) => location.pathname.startsWith(path)

  return (
    <nav style={{
      background: 'var(--black)',
      padding: '0 32px',
      height: 60,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>

      {/* Logo + nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          onClick={() => navigate('/students')}
        >
          <div style={{
            width: 32, height: 32,
            background: 'var(--blue-electric)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ color: 'white', fontWeight: 800, fontSize: 15 }}>C</span>
          </div>
          <span style={{ color: 'var(--white)', fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px' }}>
            CampusConnect <span style={{ color: 'var(--blue-electric)' }}>360</span>
          </span>
        </div>

        {/* Links de navegación */}
        <div style={{ display: 'flex', gap: 4 }}>
          {NAV_LINKS.map(link => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              style={{
                background: isActive(link.path) ? 'rgba(0,71,255,0.18)' : 'transparent',
                color: isActive(link.path) ? 'var(--white)' : 'var(--gray)',
                border: 'none',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: 13,
                fontWeight: isActive(link.path) ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!isActive(link.path)) e.currentTarget.style.color = 'var(--white)' }}
              onMouseLeave={e => { if (!isActive(link.path)) e.currentTarget.style.color = 'var(--gray)' }}
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>

      {/* Usuario + logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Avatar con iniciales */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32,
            borderRadius: '50%',
            background: 'rgba(0,71,255,0.25)',
            border: '1px solid rgba(0,71,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ color: 'var(--white)', fontSize: 12, fontWeight: 700 }}>{initials}</span>
          </div>
          <span style={{ color: 'var(--gray)', fontSize: 13 }}>{username}</span>
        </div>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />

        <button
          style={{
            background: 'transparent',
            color: 'var(--gray)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6,
            padding: '5px 12px',
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--white)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--gray)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
          }}
          onClick={handleLogout}
        >
          Cerrar sesión
        </button>
      </div>

    </nav>
  )
}
