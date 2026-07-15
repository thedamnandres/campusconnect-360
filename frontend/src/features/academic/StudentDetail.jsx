import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { academicApi, attendanceApi, notificationApi, paymentApi } from '../../lib/api'
import { getSchoolName } from '../../lib/schools'

export default function StudentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [payments, setPayments] = useState([])
  const [attendances, setAttendances] = useState([])
  const [incidents, setIncidents] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const [studentRes, paymentRes, attendanceRes, incidentRes, notificationRes] = await Promise.all([
          academicApi.getStudent(id),
          paymentApi.getStudentPayments(id).catch(() => ({ data: [] })),
          attendanceApi.getStudentAttendance(id).catch(() => ({ data: [] })),
          attendanceApi.getStudentIncidents(id).catch(() => ({ data: [] })),
          notificationApi.listStudentNotifications(id).catch(() => ({ data: [] })),
        ])
        setStudent(studentRes.data)
        setPayments(paymentRes.data)
        setAttendances(attendanceRes.data)
        setIncidents(incidentRes.data)
        setNotifications(notificationRes.data)
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
    <div>
      <p style={{ padding: 32, color: 'var(--gray)' }}>Cargando...</p>
    </div>
  )

  if (!student) return (
    <div>
      <p style={{ padding: 32, color: 'var(--red)' }}>Estudiante no encontrado</p>
    </div>
  )

  return (
    <div>
      <div style={{ maxWidth: 900 }}>

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
            <InfoRow label="Correo electrónico" value={student.email} />
            <InfoRow label="Teléfono" value={student.phone || '—'} />
            <InfoRow label="Fecha de nacimiento" value={student.birth_date || '—'} />
            <InfoRow label="Institución" value={getSchoolName(student.school_id)} />
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
            <InfoRow label="Correo electrónico" value={student.representative_email || '—'} />
          </div>
        </div>

        {/* Matrículas */}
        <div className="card" style={{ marginBottom: 16 }}>
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
                {student.enrollments.map((e) => (
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

        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--gray-border)' }}>
            Historial básico de eventos asociados
          </h3>
          <table className="cc-table">
            <thead>
              <tr>
                <th>ORIGEN</th>
                <th>DETALLE</th>
                <th>ESTADO / EVENTO</th>
              </tr>
            </thead>
            <tbody>
              {payments.slice(0, 2).map((payment) => (
                <tr key={payment.id}>
                  <td><strong>Pagos</strong></td>
                  <td>{payment.concept} · ${payment.amount}</td>
                  <td><span className={payment.status === 'confirmado' ? 'cc-chip green' : 'cc-chip red'}>{payment.status}</span></td>
                </tr>
              ))}
              {attendances.slice(0, 2).map((attendance) => (
                <tr key={attendance.id}>
                  <td><strong>Asistencia</strong></td>
                  <td>{attendance.date}</td>
                  <td><span className="cc-chip purple">Asistencia registrada</span></td>
                </tr>
              ))}
              {incidents.slice(0, 2).map((incident) => (
                <tr key={incident.id}>
                  <td><strong>Bienestar</strong></td>
                  <td>{incident.type} · {incident.severity}</td>
                  <td><span className="cc-chip red">Incidente reportado</span></td>
                </tr>
              ))}
              {notifications.slice(0, 2).map((notification) => (
                <tr key={notification.id}>
                  <td><strong>Notificación</strong></td>
                  <td>{notification.message}</td>
                  <td><span className={notification.status === 'enviada' ? 'cc-chip green' : 'cc-chip red'}>{notification.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {payments.length + attendances.length + incidents.length + notifications.length === 0 && (
            <p className="cc-empty">Sin eventos asociados todavía.</p>
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
