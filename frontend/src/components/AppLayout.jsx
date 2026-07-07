import { useLocation, useNavigate } from 'react-router-dom'
import {
  AttendanceIcon,
  BrandIcon,
  DashboardIcon,
  LogoutIcon,
  PaymentIcon,
  StudentsIcon,
} from './Icons'

const NAV_ITEMS = [
  { label: 'Directivo', path: '/dashboard', icon: DashboardIcon },
  { label: 'Estudiantes', path: '/students', icon: StudentsIcon },
  { label: 'Pagos', path: '/payments', icon: PaymentIcon },
  { label: 'Bienestar', path: '/wellbeing', icon: AttendanceIcon },
]

function getTeam(pathname) {
  if (pathname.startsWith('/payments')) return 'Finanzas'
  if (pathname.startsWith('/wellbeing')) return 'Docente'
  if (pathname.startsWith('/dashboard')) return 'Dirección'
  return 'Académico'
}

function getSectionName(pathname) {
  if (pathname.startsWith('/payments')) return 'Portal financiero'
  if (pathname.startsWith('/wellbeing')) return 'Portal docente'
  if (pathname.startsWith('/dashboard')) return 'Panel directivo'
  return 'Portal académico'
}

function NavItem({ item }) {
  const navigate = useNavigate()
  const location = useLocation()
  const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
  const ItemIcon = item.icon

  return (
    <button
      type="button"
      className={`cc-nav-item ${active ? 'is-active' : ''}`}
      onClick={() => navigate(item.path)}
    >
      <span className="cc-nav-icon"><ItemIcon /></span>
      <span>{item.label}</span>
    </button>
  )
}

export default function AppLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const username = localStorage.getItem('username') || 'demo'
  const team = getTeam(location.pathname)
  const initials = username.slice(0, 2).toUpperCase()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    localStorage.removeItem('role')
    navigate('/login')
  }

  return (
    <div className="cc-desktop">
      <div className="cc-shell">
        <aside className="cc-sidebar">
          <div className="cc-brand">
            <span className="cc-brand-mark"><BrandIcon /></span>
            <span className="cc-brand-word">
              <strong>CampusConnect</strong>
              <small>360</small>
            </span>
          </div>

          <nav className="cc-nav-main" aria-label="Navegación principal">
            {NAV_ITEMS.map((item) => <NavItem item={item} key={item.path} />)}
          </nav>

          <div className="cc-sidebar-footer">
            <span className="cc-role-label">Rol actual</span>
            <strong>{team}</strong>
            <small>CampusConnect 360</small>
          </div>
        </aside>

        <main className="cc-main">
          <header className="cc-topbar">
            <div className="cc-topbar-title">
              <span>{team}</span>
              <strong>{getSectionName(location.pathname)}</strong>
            </div>

            <div className="cc-user">
              <span className="cc-avatar">{initials}</span>
              <span>
                <strong>{username}</strong>
                <small>{team}</small>
              </span>
            </div>
            <button type="button" className="cc-logout" onClick={handleLogout}>
              <LogoutIcon />
              Salir
            </button>
          </header>

          <div className="cc-content">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
