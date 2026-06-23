import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = 'http://localhost:8001'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await axios.post(`${API}/auth/login`, form)
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('username', form.username)
      navigate('/students')
    } catch (err) {
      setError('Usuario o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--white)' }}>

      {/* Panel izquierdo - branding (oculto en móvil) */}
      <div className="login-brand">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
            <div style={{
              width: 44, height: 44,
              background: 'var(--white)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ color: 'var(--blue-electric)', fontSize: 22, fontWeight: 800 }}>C</span>
            </div>
            <span style={{ color: 'var(--white)', fontWeight: 700, fontSize: 18 }}>
              CampusConnect 360
            </span>
          </div>

          <h1 style={{ color: 'var(--white)', fontSize: 38, fontWeight: 800, lineHeight: 1.15, marginBottom: 16 }}>
            Gestión académica<br />sin complicaciones.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, lineHeight: 1.6, maxWidth: 380 }}>
            Administra estudiantes, matrículas y asistencia desde un solo lugar.
            Rápido, claro y siempre disponible.
          </p>

          <div style={{ display: 'flex', gap: 28, marginTop: 48 }}>
            {[
              { n: 'Estudiantes', d: 'Registro completo' },
              { n: 'Matrículas', d: 'Año lectivo activo' },
              { n: 'Asistencia', d: 'Control diario' },
            ].map((f) => (
              <div key={f.n}>
                <p style={{ color: 'var(--white)', fontWeight: 700, fontSize: 14 }}>{f.n}</p>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }}>{f.d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Decoración */}
        <div style={{
          position: 'absolute', bottom: -120, right: -120,
          width: 360, height: 360, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
        }} />
        <div style={{
          position: 'absolute', top: -80, right: 40,
          width: 200, height: 200, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
        }} />
      </div>

      {/* Panel derecho - formulario */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>

          {/* Logo solo en móvil */}
          <div className="login-mobile-logo">
            <div style={{
              width: 48, height: 48,
              background: 'var(--blue-electric)',
              borderRadius: 12,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}>
              <span style={{ color: 'white', fontSize: 22, fontWeight: 800 }}>C</span>
            </div>
          </div>

          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>
            Bienvenido de nuevo
          </h2>
          <p style={{ color: 'var(--gray)', marginBottom: 32, fontSize: 14 }}>
            Ingresa tus credenciales para continuar
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
                Usuario
              </label>
              <input
                type="text"
                placeholder="secretaria"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                autoComplete="username"
                autoFocus
                required
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  autoComplete="current-password"
                  style={{ paddingRight: 70 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                    background: 'transparent', color: 'var(--blue-electric)',
                    fontSize: 12, fontWeight: 600, padding: '6px 8px',
                  }}
                >
                  {showPassword ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                background: '#FEF2F2',
                color: 'var(--red)',
                padding: '10px 12px',
                borderRadius: 6,
                marginBottom: 16,
                fontSize: 13,
                fontWeight: 500,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', padding: '11px' }}
              disabled={loading}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p style={{ color: 'var(--gray)', fontSize: 12, textAlign: 'center', marginTop: 32 }}>
            CampusConnect 360 · Portal Académico
          </p>
        </div>
      </div>
    </div>
  )
}