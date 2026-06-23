import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import Navbar from '../../components/Navbar'

const API = 'http://localhost:8001'

export default function StudentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)

  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const res = await axios.get(`${API}/students/${id}`, { headers })
        setStudent(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchStudent()
  }, [id])

  const getStatusBadge = (status) => {
    const map = {
      al_dia:    { label: 'Al día',    cls: 'badge-active' },
      pendiente: { label: 'Pendiente', cls: 'badge-pending' },
      moroso:    { label: 'Moroso',    cls: 'badge-danger' },
    }
    const s = map[status] || { label: status, cls: 'badge-blue' }
    return <span className={`badge ${s.cls}`}>{s.label}</span>
  }

  const getEnrollmentBadge = (status) => {
    const map = {
      activa:     { label: 'Activa',     cls: 'badge-active' },
      inactiva:   { label: 'Inactiva',   cls: 'badge-pending' },
      suspendida: { label: 'Suspendida', cls: 'badge-danger' },
    }
    const s = map[status] || { label: status, cls: 'badge-blue' }
    return <span className={`badge ${s.cls}`}>{s.label}</span>
  }

  if (loading) return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <p style={{ padding: 32, color: 'var(--gray)' }}>Cargando...</p>
    </div>
  )

  if (!student) return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <p style={{ padding: 32, color: 'var(--red)' }}>Estudiante no encontrado</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />

      <div style={{ padding: '32px', maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button
            className="btn-secondary"
            style={{ fontSize: 13, padding: '6px 12px' }}
            onClick={() => navigate('/students')}
          >
            ← Volver
          </button>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>
              {student.first_name} {student.last_name}
            </h2>
            <p style={{ color: 'var(--gray)', marginTop: 2 }}>
              Cédula: {student.cedula}
            </p>
          </div>
        </div>

        {/* Datos personales */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--gray-border)' }}>
            <h3 style={{ fontWeight: 600 }}>Datos personales</h3>
            {getStatusBadge(student.financial_status)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <InfoRow label="Email" value={student.email} />
            <InfoRow label="Teléfono" value={student.phone || '—'} />
            <InfoRow label="Fecha de nacimiento" value={student.birth_date || '—'} />
            <InfoRow label="Colegio" value={student.school_id} />
          </div>
        </div>

        {/* Representante */}
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontWeight: 600, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--gray-border)' }}>
            Representante
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <InfoRow label="Nombre" value={student.representative_name || '—'} />
            <InfoRow label="Teléfono" value={student.representative_phone || '—'} />
            <InfoRow label="Email" value={student.representative_email || '—'} />
          </div>
        </div>

        {/* Matrículas */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--gray-border)' }}>
            <h3 style={{ fontWeight: 600 }}>Matrículas</h3>
            <button
              className="btn-primary"
              style={{ fontSize: 13, padding: '6px 14px' }}
              onClick={() => navigate(`/students/${id}/enroll`)}
            >
              + Nueva matrícula
            </button>
          </div>

          {student.enrollments.length === 0 ? (
            <p style={{ color: 'var(--gray)', textAlign: 'center', padding: '16px 0' }}>
              Sin matrículas registradas
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--gray-light)' }}>
                  {['Año escolar', 'Grado', 'Sección', 'Estado', 'Fecha'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {student.enrollments.map((e, i) => (
                  <tr
                    key={e.id}
                    style={{ borderTop: '1px solid var(--gray-border)' }}
                  >
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>{e.school_year}</td>
                    <td style={{ padding: '10px 14px' }}>{e.grade}</td>
                    <td style={{ padding: '10px 14px' }}>{e.section || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>{getEnrollmentBadge(e.status)}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--gray)', fontSize: 13 }}>
                      {new Date(e.enrolled_at).toLocaleDateString('es-EC')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 2 }}>{label}</p>
      <p style={{ fontWeight: 500 }}>{value}</p>
    </div>
  )
}