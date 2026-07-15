import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { academicApi } from '../../lib/api'
import { getSchoolName } from '../../lib/schools'

export default function Students() {
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchStudents = async (q = '') => {
    setLoading(true)
    try {
      const res = await academicApi.listStudents(q)
      setStudents(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStudents()
  }, [])

  const handleSearch = (e) => {
    const q = e.target.value
    setSearch(q)
    if (q.length === 0 || q.length >= 3) fetchStudents(q)
  }

  const getStatusBadge = (status) => {
    const map = {
      al_dia:   { label: 'Al día',   cls: 'badge-active' },
      pendiente: { label: 'Pendiente', cls: 'badge-pending' },
      moroso:   { label: 'Moroso',   cls: 'badge-danger' },
    }
    const s = map[status] || { label: status, cls: 'badge-blue' }
    return <span className={`badge ${s.cls}`}>{s.label}</span>
  }

  return (
    <div>
      <div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>Estudiantes</h2>
            <p style={{ color: 'var(--gray)', marginTop: 2 }}>
              {students.length} estudiante{students.length !== 1 ? 's' : ''} registrado{students.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            className="btn-primary"
            onClick={() => navigate('/students/new')}
          >
            + Nuevo estudiante
          </button>
        </div>

        {/* Búsqueda */}
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <input
            type="text"
            placeholder="Buscar por nombre, cédula o correo electrónico..."
            value={search}
            onChange={handleSearch}
          />
        </div>

        {/* Tabla */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <p style={{ padding: 24, color: 'var(--gray)', textAlign: 'center' }}>
              Cargando...
            </p>
          ) : students.length === 0 ? (
            <p style={{ padding: 24, color: 'var(--gray)', textAlign: 'center' }}>
              No hay estudiantes registrados
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--gray-light)', borderBottom: '1px solid var(--gray-border)' }}>
                  {['Cédula', 'Nombre', 'Correo electrónico', 'Colegio', 'Estado financiero', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr
                    key={s.id}
                    style={{
                      borderBottom: i < students.length - 1 ? '1px solid var(--gray-border)' : 'none',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-light)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{s.cedula}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                      {s.first_name} {s.last_name}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--gray)' }}>{s.email}</td>
                    <td style={{ padding: '12px 16px' }}>{getSchoolName(s.school_id)}</td>
                    <td style={{ padding: '12px 16px' }}>{getStatusBadge(s.financial_status)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        className="btn-secondary"
                        style={{ fontSize: 12, padding: '5px 12px' }}
                        onClick={() => navigate(`/students/${s.id}`)}
                      >
                        Ver ficha
                      </button>
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
