import { useNavigate } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <nav style={{
      background: 'var(--black)',
      padding: '0 32px',
      height: 60,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>

      {/* Logo */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        onClick={() => navigate('/students')}
      >
        <div style={{
          width: 32, height: 32,
          background: 'var(--blue-electric)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{ color: 'white', fontWeight: 700 }}>C</span>
        </div>
        <span style={{ color: 'var(--white)', fontWeight: 600, fontSize: 15 }}>
          CampusConnect <span style={{ color: 'var(--blue-electric)' }}>360</span>
        </span>
      </div>

      {/* Portal label + logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{
          color: 'var(--gray)',
          fontSize: 13,
        }}>
          Portal Académico
        </span>
        <button
          className="btn-secondary"
          style={{ fontSize: 13, padding: '6px 14px' }}
          onClick={handleLogout}
        >
          Cerrar sesión
        </button>
      </div>

    </nav>
  )
}