import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { academicApi } from '../../lib/api'
import { SCHOOLS } from '../../lib/schools'

// Definido FUERA del componente para que su referencia sea estable entre renders.
// Si se define dentro, React remonta el input en cada tecla y se pierde el foco.
function Field({ label, name, type = 'text', required = false, value, onChange, ...rest }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
        {label} {required && <span style={{ color: 'var(--red)' }}>*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        {...rest}
      />
    </div>
  )
}

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
    school_id: '',
    representative_name: '',
    representative_email: '',
    representative_phone: '',
  })

  const NUMERIC_FIELDS = ['cedula', 'phone', 'representative_phone']

  const handleChange = (e) => {
    const { name, value } = e.target
    const cleaned = NUMERIC_FIELDS.includes(name) ? value.replace(/\D/g, '') : value
    setForm({ ...form, [name]: cleaned })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await academicApi.createStudent(form)
      navigate(`/students/${res.data.id}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al registrar estudiante')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div style={{ maxWidth: 720 }}>

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
              <div style={{ gridColumn: '1 / -1', marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
                  Colegio <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <select name="school_id" value={form.school_id} onChange={handleChange} required>
                  <option value="">Seleccionar colegio...</option>
                  {SCHOOLS.map((school) => (
                    <option key={school.id} value={school.id}>{school.name}</option>
                  ))}
                </select>
                <p style={{ fontSize: 12, color: 'var(--gray)', marginTop: 4 }}>
                  El colegio se define al registrar al estudiante y aplicará automáticamente al resto de sus trámites (matrícula, pagos, asistencia).
                </p>
              </div>
              <Field
                label="Cédula" name="cedula" required
                value={form.cedula} onChange={handleChange}
                inputMode="numeric" maxLength={10} placeholder="10 dígitos"
              />
              <Field
                label="Fecha de nacimiento" name="birth_date" type="date"
                value={form.birth_date} onChange={handleChange}
              />
              <Field
                label="Nombres" name="first_name" required
                value={form.first_name} onChange={handleChange}
              />
              <Field
                label="Apellidos" name="last_name" required
                value={form.last_name} onChange={handleChange}
              />
              <Field
                label="Correo electrónico" name="email" type="email" required
                value={form.email} onChange={handleChange}
                placeholder="correo@dominio.com"
              />
              <Field
                label="Teléfono" name="phone"
                value={form.phone} onChange={handleChange}
                inputMode="tel" maxLength={10} placeholder="0999999999"
              />
            </div>
          </div>

          {/* Datos del representante */}
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ fontWeight: 600, marginBottom: 4, paddingBottom: 12, borderBottom: '1px solid var(--gray-border)' }}>
              Representante <span style={{ fontWeight: 400, color: 'var(--gray)', fontSize: 13 }}>(opcional)</span>
            </h3>
            <p style={{ color: 'var(--gray)', fontSize: 13, margin: '12px 0 20px' }}>
              Se usará para enviar notificaciones sobre matrículas, pagos y novedades del estudiante.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field
                  label="Nombre completo" name="representative_name"
                  value={form.representative_name} onChange={handleChange}
                  placeholder="Nombre del padre, madre o tutor"
                />
              </div>
              <Field
                label="Correo electrónico" name="representative_email" type="email"
                value={form.representative_email} onChange={handleChange}
                placeholder="correo@dominio.com"
              />
              <Field
                label="Teléfono" name="representative_phone"
                value={form.representative_phone} onChange={handleChange}
                inputMode="tel" maxLength={10} placeholder="0999999999"
              />
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
