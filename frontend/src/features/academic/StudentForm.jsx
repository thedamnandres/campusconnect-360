import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Navbar from '../../components/Navbar'

const API = 'http://localhost:8001'

export default function StudentForm() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    cedula: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    birth_date: '',
    representative_name: '',
    representative_email: '',
    representative_phone: '',
  })

  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}` }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await axios.post(`${API}/students`, form, { headers })
      navigate(`/students/${res.data.id}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al registrar estudiante')
    } finally {
      setLoading(false)
    }
  }

  const Field = ({ label, name, type = 'text', required = false }) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
        {label} {required && <span style={{ color: 'var(--red)' }}>*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={form[name]}
        onChange={handleChange}
        required={required}
      />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />

      <div style={{ padding: '32px', maxWidth: 720, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button
            className="btn-secondary"
            style={{ fontSize: 13, padding: '6px 12px' }}
            onClick={() => navigate('/students')}
          >
            ← Volver
          </button>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Nuevo estudiante</h2>
        </div>

        <form onSubmit={handleSubmit}>

          {/* Datos personales */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontWeight: 600, marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--gray-border)' }}>
              Datos personales
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Cédula" name="cedula" required />
              <Field label="Fecha de nacimiento" name="birth_date" type="date" />
              <Field label="Nombres" name="first_name" required />
              <Field label="Apellidos" name="last_name" required />
              <Field label="Email" name="email" type="email" required />
              <Field label="Teléfono" name="phone" />
            </div>
          </div>

          {/* Datos del representante */}
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ fontWeight: 600, marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--gray-border)' }}>
              Representante
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Nombre completo" name="representative_name" />
              </div>
              <Field label="Email" name="representative_email" type="email" />
              <Field label="Teléfono" name="representative_phone" />
            </div>
          </div>

          {error && (
            <p style={{ color: 'var(--red)', marginBottom: 16, fontSize: 13 }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/students')}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Registrando...' : 'Registrar estudiante'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}