import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import Navbar from '../../components/Navbar'

const API = 'http://localhost:8001'

const GRADES = [
  '1ro EGB', '2do EGB', '3ro EGB', '4to EGB', '5to EGB',
  '6to EGB', '7mo EGB', '8vo EGB', '9no EGB', '10mo EGB',
  '1ro BGU', '2do BGU', '3ro BGU'
]

export default function EnrollmentForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    student_id: id,
    grade: '',
    section: '',
    school_year: '2025-2026',
    notes: '',
  })

  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const res = await axios.get(`${API}/students/${id}`, { headers })
        setStudent(res.data)
      } catch (err) {
        console.error(err)
      }
    }
    fetchStudent()
  }, [id])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await axios.post(`${API}/enrollments`, form, { headers })
      navigate(`/students/${id}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al crear matrícula')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />

      <div style={{ padding: '32px', maxWidth: 600, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button
            className="btn-secondary"
            style={{ fontSize: 13, padding: '6px 12px' }}
            onClick={() => navigate(`/students/${id}`)}
          >
            ← Volver
          </button>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>Nueva matrícula</h2>
            {student && (
              <p style={{ color: 'var(--gray)', marginTop: 2 }}>
                {student.first_name} {student.last_name} · {student.cedula}
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card">

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
                Año escolar <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <input
                name="school_year"
                value={form.school_year}
                onChange={handleChange}
                placeholder="2025-2026"
                required
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
                Grado <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <select
                name="grade"
                value={form.grade}
                onChange={handleChange}
                required
              >
                <option value="">Seleccionar grado...</option>
                {GRADES.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
                Sección / Paralelo
              </label>
              <select
                name="section"
                value={form.section}
                onChange={handleChange}
              >
                <option value="">Seleccionar sección...</option>
                {['A', 'B', 'C', 'D'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
                Observaciones
              </label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={3}
                style={{ resize: 'vertical' }}
                placeholder="Observaciones opcionales..."
              />
            </div>

          </div>

          {error && (
            <p style={{ color: 'var(--red)', margin: '16px 0', fontSize: 13 }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate(`/students/${id}`)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Matriculando...' : 'Crear matrícula'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}