import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import Navbar from '../../components/Navbar'

const API = 'http://localhost:8001'

const GRADES = [
  '1ro EGB', '2do EGB', '3ro EGB', '4to EGB', '5to EGB',
  '6to EGB', '7mo EGB', '8vo EGB', '9no EGB', '10mo EGB',
  '1ro BGU', '2do BGU', '3ro BGU',
]

const SECTIONS = ['A', 'B', 'C', 'D']

// Genera opciones de año escolar: 3 años atrás y 2 adelante desde el actual
function getSchoolYears() {
  const current = new Date().getFullYear()
  const years = []
  for (let y = current - 3; y <= current + 2; y++) {
    years.push(`${y}-${y + 1}`)
  }
  return years
}

const SCHOOL_YEARS = getSchoolYears()
const CURRENT_YEAR = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`

// Devuelve la matrícula más reciente del estudiante según año escolar
function getLatestEnrollment(enrollments = []) {
  if (!enrollments.length) return null
  return [...enrollments].sort((a, b) =>
    b.school_year.localeCompare(a.school_year)
  )[0]
}

// Valida si el nuevo grado+año tiene sentido respecto al historial
function validateEnrollment(form, enrollments = []) {
  const newGradeIdx = GRADES.indexOf(form.grade)
  if (newGradeIdx === -1 || !form.school_year) return null

  // Detectar matrícula duplicada: mismo año y mismo grado
  const duplicate = enrollments.find(
    e => e.school_year === form.school_year && e.grade === form.grade
  )
  if (duplicate) {
    return {
      type: 'error',
      message: `Ya existe una matrícula de ${form.grade} en el año ${form.school_year}.`,
    }
  }

  // Detectar duplicado de año escolar (mismo año, diferente grado)
  const sameYear = enrollments.find(e => e.school_year === form.school_year)
  if (sameYear) {
    return {
      type: 'error',
      message: `El estudiante ya tiene una matrícula en ${form.school_year} (${sameYear.grade}). No puede tener dos matrículas en el mismo año escolar.`,
    }
  }

  const latest = getLatestEnrollment(enrollments)
  if (!latest) return null

  const latestGradeIdx = GRADES.indexOf(latest.grade)
  const expectedNextIdx = latestGradeIdx + 1

  // El nuevo grado es menor al último registrado → retroceso
  if (newGradeIdx < latestGradeIdx) {
    return {
      type: 'warning',
      message: `El estudiante cursó ${latest.grade} en ${latest.school_year}. Estás registrando un grado anterior (${form.grade}), lo cual podría ser un error.`,
    }
  }

  // Salta más de un grado
  if (newGradeIdx > expectedNextIdx) {
    const expected = GRADES[expectedNextIdx]
    return {
      type: 'warning',
      message: `El grado esperado tras ${latest.grade} sería ${expected}. Estás saltando al ${form.grade}, ¿es correcto?`,
    }
  }

  // El año escolar es anterior al de la última matrícula
  if (form.school_year < latest.school_year) {
    return {
      type: 'warning',
      message: `El año escolar ${form.school_year} es anterior a la última matrícula (${latest.school_year}).`,
    }
  }

  return null
}

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
    school_year: CURRENT_YEAR,
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

  const validation = student ? validateEnrollment(form, student.enrollments) : null
  const isBlocked = validation?.type === 'error'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isBlocked) return
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

      <div style={{ padding: '32px', maxWidth: 640, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <button
            className="btn-secondary"
            style={{ fontSize: 13, padding: '6px 12px', flexShrink: 0 }}
            onClick={() => navigate(`/students/${id}`)}
          >
            ← Volver
          </button>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>Nueva matrícula</h2>
            {student && (
              <p style={{ color: 'var(--gray)', marginTop: 2, fontSize: 13 }}>
                {student.first_name} {student.last_name}
                <span style={{
                  marginLeft: 8,
                  fontFamily: 'monospace',
                  background: 'var(--gray-light)',
                  padding: '1px 6px',
                  borderRadius: 4,
                  fontSize: 12,
                }}>
                  {student.cedula}
                </span>
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card">

            {/* Año escolar */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
                Año escolar <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SCHOOL_YEARS.map(year => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => setForm({ ...form, school_year: year })}
                    style={{
                      padding: '7px 16px',
                      borderRadius: 6,
                      border: form.school_year === year
                        ? '2px solid var(--blue-electric)'
                        : '2px solid var(--gray-border)',
                      background: form.school_year === year
                        ? 'rgba(0,71,255,0.08)'
                        : 'var(--white)',
                      color: form.school_year === year
                        ? 'var(--blue-electric)'
                        : 'var(--black)',
                      fontWeight: form.school_year === year ? 700 : 400,
                      fontSize: 13,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      position: 'relative',
                    }}
                  >
                    {year}
                    {year === CURRENT_YEAR && (
                      <span style={{
                        position: 'absolute',
                        top: -6, right: -6,
                        background: 'var(--green)',
                        color: 'white',
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '1px 4px',
                        borderRadius: 4,
                        lineHeight: 1.4,
                      }}>
                        HOY
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <p style={{ marginTop: 8, fontSize: 12, color: 'var(--gray)' }}>
                Seleccionado: <strong>{form.school_year}</strong>
              </p>
            </div>

            <div style={{ height: 1, background: 'var(--gray-border)', margin: '4px 0 20px' }} />

            {/* Grado y sección en grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
                  Grado <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <select
                  name="grade"
                  value={form.grade}
                  onChange={handleChange}
                  required
                >
                  <option value="">Seleccionar grado...</option>
                  <optgroup label="Educación General Básica">
                    {GRADES.filter(g => g.includes('EGB')).map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Bachillerato General Unificado">
                    {GRADES.filter(g => g.includes('BGU')).map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
                  Sección / Paralelo
                </label>
                <select
                  name="section"
                  value={form.section}
                  onChange={handleChange}
                >
                  <option value="">Sin sección</option>
                  {SECTIONS.map(s => (
                    <option key={s} value={s}>Paralelo {s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Resumen visual del destino */}
            {form.grade && (
              <div style={{
                background: 'var(--gray-light)',
                border: '1px solid var(--gray-border)',
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
                <div style={{
                  width: 36, height: 36,
                  background: 'var(--blue-electric)',
                  borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span style={{ color: 'white', fontSize: 16 }}>📚</span>
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>
                    {form.grade}{form.section ? ` — Paralelo ${form.section}` : ''}
                  </p>
                  <p style={{ color: 'var(--gray)', fontSize: 12, marginTop: 1 }}>
                    Año escolar {form.school_year}
                  </p>
                </div>
              </div>
            )}

            {/* Observaciones */}
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
                Observaciones
              </label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={3}
                style={{ resize: 'vertical' }}
                placeholder="Observaciones opcionales sobre esta matrícula..."
              />
            </div>

          </div>

          {/* Alerta de validación de progresión académica */}
          {validation && (
            <div style={{
              background: validation.type === 'error' ? '#FEF2F2' : '#FFFBEB',
              border: `1px solid ${validation.type === 'error' ? '#FECACA' : '#FDE68A'}`,
              color: validation.type === 'error' ? 'var(--red)' : '#92400E',
              padding: '12px 14px',
              borderRadius: 8,
              marginTop: 16,
              fontSize: 13,
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>
                {validation.type === 'error' ? '⛔' : '⚠️'}
              </span>
              <div>
                <p style={{ fontWeight: 600, marginBottom: 2 }}>
                  {validation.type === 'error' ? 'No se puede crear la matrícula' : 'Advertencia de progresión'}
                </p>
                <p style={{ lineHeight: 1.5 }}>{validation.message}</p>
              </div>
            </div>
          )}

          {error && (
            <div style={{
              background: '#FEF2F2',
              color: 'var(--red)',
              padding: '10px 14px',
              borderRadius: 6,
              marginTop: 16,
              fontSize: 13,
              fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
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
              disabled={loading || !form.grade || isBlocked}
            >
              {loading ? 'Matriculando...' : 'Crear matrícula'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
