import { useCallback, useEffect, useMemo, useState } from 'react'
import { Icon } from '../../components/Icons'
import { attendanceApi } from '../../lib/api'

const today = new Date().toISOString().slice(0, 10)

function fullName(student) {
  return `${student.first_name || ''} ${student.last_name || ''}`.trim()
}

function eventChip(type) {
  if (type === 'IncidentReported') return <span className="cc-chip red">Incidente reportado</span>
  return <span className="cc-chip purple">Asistencia registrada</span>
}

export default function AttendanceDashboard() {
  const [students, setStudents] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [attendanceHistory, setAttendanceHistory] = useState([])
  const [incidentHistory, setIncidentHistory] = useState([])
  const [attendanceForm, setAttendanceForm] = useState({ date: today, status: 'presente' })
  const [incidentForm, setIncidentForm] = useState({ type: 'bienestar', severity: 'media', description: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const selected = students.find((student) => student.id === selectedId)

  const loadStudents = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await attendanceApi.listStudents()
      setStudents(data)
      setSelectedId((current) => current || data[0]?.id || '')
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudieron cargar los estudiantes')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadHistory = useCallback(async (studentId) => {
    if (!studentId) return
    try {
      const [attendanceRes, incidentRes] = await Promise.all([
        attendanceApi.getStudentAttendance(studentId),
        attendanceApi.getStudentIncidents(studentId),
      ])
      setAttendanceHistory(attendanceRes.data)
      setIncidentHistory(incidentRes.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo cargar el historial del estudiante')
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStudents()
  }, [loadStudents])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHistory(selectedId)
  }, [selectedId, loadHistory])

  const historyRows = useMemo(() => {
    const attendances = attendanceHistory.map((item) => ({
      id: item.id,
      date: item.date,
      type: 'Asistencia',
      detail: item.status,
      event: 'AttendanceRecorded',
    }))
    const incidents = incidentHistory.map((item) => ({
      id: item.id,
      date: item.created_at,
      type: item.type,
      detail: item.severity,
      event: 'IncidentReported',
    }))
    return [...attendances, ...incidents]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8)
  }, [attendanceHistory, incidentHistory])

  function getAvance(row) {
    if (row.event === 'AttendanceRecorded') {
      if (row.detail === 'presente') return 100
      if (row.detail === 'tardanza') return 60
      return 0 // ausente
    }
    // IncidentReported: severidad como indicador de atención requerida
    if (row.detail === 'alta') return 100
    if (row.detail === 'media') return 60
    return 30 // baja
  }

  const saveAttendance = async (event) => {
    event.preventDefault()
    if (!selected) return
    setSaving('attendance')
    setMessage('')
    setError('')
    try {
      await attendanceApi.registerAttendance({
        student_id: selected.id,
        student_name: fullName(selected),
        date: attendanceForm.date,
        status: attendanceForm.status,
        school_id: selected.school_id,
      })
      setMessage('Asistencia registrada. Se publicó el evento de asistencia registrada.')
      await loadHistory(selected.id)
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo registrar la asistencia')
    } finally {
      setSaving('')
    }
  }

  const saveIncident = async (event) => {
    event.preventDefault()
    if (!selected) return
    setSaving('incident')
    setMessage('')
    setError('')
    try {
      await attendanceApi.reportIncident({
        student_id: selected.id,
        student_name: fullName(selected),
        type: incidentForm.type,
        severity: incidentForm.severity,
        description: incidentForm.description,
        school_id: selected.school_id,
      })
      setIncidentForm({ type: 'bienestar', severity: 'media', description: '' })
      setMessage('Incidente registrado. Se publicó el evento de incidente reportado y se generó la notificación cuando aplica.')
      await loadHistory(selected.id)
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo registrar el incidente')
    } finally {
      setSaving('')
    }
  }

  return (
    <>
      <div className="cc-content-title">
        <h1>Portal docente</h1>
        <div className="cc-page-actions">
          <button type="button" className="cc-button secondary" onClick={loadStudents}>Actualizar</button>
        </div>
      </div>

      <section className="cc-grid cc-metrics">
        <article className="cc-card">
          <div className="cc-card-title"><span className="cc-card-icon"><Icon name="attendance" /></span>Registros de asistencia</div>
          <div className="cc-metric-value">{attendanceHistory.length}<span className="cc-chip green">Actual</span></div>
        </article>
        <article className="cc-card">
          <div className="cc-card-title"><span className="cc-card-icon"><Icon name="alert" /></span>Inasistencias</div>
          <div className="cc-metric-value">{attendanceHistory.filter((a) => a.status === 'ausente').length}<span className="cc-chip red">Revisar</span></div>
        </article>
        <article className="cc-card">
          <div className="cc-card-title"><span className="cc-card-icon"><Icon name="activity" /></span>Incidentes registrados</div>
          <div className="cc-metric-value">{incidentHistory.length}<span className="cc-chip green">Eventos</span></div>
        </article>
      </section>

      {(error || message) && (
        <div style={{ marginTop: 18 }} className={`cc-message ${error ? 'error' : 'success'}`}>
          {error || message}
        </div>
      )}

      <section className="cc-grid cc-attendance-workspace" style={{ marginTop: 18 }}>
        <aside className="cc-card">
          <div className="cc-card-header">
            <div className="cc-card-title"><span className="cc-card-icon"><Icon name="students" /></span>Estudiantes</div>
          </div>
          {loading ? (
            <p className="cc-loading">Cargando estudiantes...</p>
          ) : students.length === 0 ? (
            <p className="cc-empty">No hay estudiantes registrados.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {students.slice(0, 8).map((student) => (
                <button
                  type="button"
                  key={student.id}
                  className="cc-card"
                  style={{
                    padding: 14,
                    textAlign: 'left',
                    background: selectedId === student.id ? 'var(--cc-active)' : 'var(--cc-app)',
                  }}
                  onClick={() => setSelectedId(student.id)}
                >
                  <strong>{fullName(student)}</strong>
                  <small style={{ display: 'block', marginTop: 4, color: 'var(--cc-muted)' }}>
                    {student.school_id} · {student.cedula}
                  </small>
                </button>
              ))}
            </div>
          )}
        </aside>

        <form className="cc-card" onSubmit={saveAttendance}>
          <div className="cc-card-header">
            <div className="cc-card-title"><span className="cc-card-icon"><Icon name="attendance" /></span>Registrar asistencia</div>
          </div>
          <div className="cc-form-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="cc-field">
              <label>Fecha</label>
              <input type="date" value={attendanceForm.date} onChange={(event) => setAttendanceForm({ ...attendanceForm, date: event.target.value })} required />
            </div>
            <div className="cc-field">
              <label>Estado</label>
              <select value={attendanceForm.status} onChange={(event) => setAttendanceForm({ ...attendanceForm, status: event.target.value })}>
                <option value="presente">Presente</option>
                <option value="ausente">Ausente</option>
                <option value="tardanza">Tardanza</option>
              </select>
            </div>
          </div>
          <button type="submit" className="cc-button primary" style={{ marginTop: 22 }} disabled={!selected || saving === 'attendance'}>
            {saving === 'attendance' ? 'Guardando...' : 'Guardar asistencia'}
          </button>
        </form>

        <form className="cc-card" onSubmit={saveIncident}>
          <div className="cc-card-header">
            <div className="cc-card-title"><span className="cc-card-icon"><Icon name="alert" /></span>Registrar incidente</div>
          </div>
          <div className="cc-form-grid">
            <div className="cc-field">
              <label>Tipo</label>
              <select value={incidentForm.type} onChange={(event) => setIncidentForm({ ...incidentForm, type: event.target.value })}>
                <option value="academico">Académico</option>
                <option value="conductual">Conductual</option>
                <option value="bienestar">Bienestar</option>
              </select>
            </div>
            <div className="cc-field">
              <label>Severidad</label>
              <select value={incidentForm.severity} onChange={(event) => setIncidentForm({ ...incidentForm, severity: event.target.value })}>
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
            </div>
            <div className="cc-field" style={{ gridColumn: '1 / -1' }}>
              <label>Descripción</label>
              <textarea
                value={incidentForm.description}
                onChange={(event) => setIncidentForm({ ...incidentForm, description: event.target.value })}
                placeholder="Describe la novedad o incidente..."
                required
              />
            </div>
          </div>
          <button type="submit" className="cc-button primary" style={{ marginTop: 18 }} disabled={!selected || saving === 'incident'}>
            {saving === 'incident' ? 'Registrando...' : 'Registrar incidente'}
          </button>
        </form>
      </section>

      <section className="cc-card" style={{ marginTop: 18 }}>
        <div className="cc-card-header">
          <div className="cc-card-title"><span className="cc-card-icon"><Icon name="list" /></span>Historial del estudiante</div>
          {selected && <span className="cc-chip purple">{fullName(selected)}</span>}
        </div>
        {historyRows.length === 0 ? (
          <p className="cc-empty">Selecciona un estudiante o registra asistencia/incidentes para ver historial.</p>
        ) : (
          <table className="cc-table">
            <thead>
              <tr>
                <th>FECHA</th>
                <th>TIPO</th>
                <th>AVANCE</th>
                <th>DETALLE</th>
                <th>EVENTO</th>
              </tr>
            </thead>
            <tbody>
              {historyRows.map((row) => (
                <tr key={`${row.event}-${row.id}`}>
                  <td><strong>{new Date(row.date).toLocaleDateString('es-EC')}</strong></td>
                  <td>{row.type}</td>
                  <td>
                    <span className="cc-rate">
                      <span className="cc-rate-bar"><span style={{ width: `${getAvance(row)}%` }} /></span>
                      {getAvance(row)}%
                    </span>
                  </td>
                  <td>{row.detail}</td>
                  <td>{eventChip(row.event)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  )
}
