import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../../components/Icons'
import { analyticsApi, healthApi, notificationApi } from '../../lib/api'
import { SCHOOLS } from '../../lib/schools'

const SERVICE_LABELS = {
  academic: 'Académico',
  payment: 'Pagos',
  notification: 'Notificaciones',
  attendance: 'Asistencia',
  analytics: 'Analítica',
}

const DEFAULT_DASHBOARD = {
  total_students: 0,
  total_payments_confirmed: 0,
  total_payments_pending: 0,
  total_attendances: 0,
  total_absences: 0,
  total_incidents: 0,
  total_notifications_sent: 0,
  total_notifications_failed: 0,
  total_events_processed: 0,
  last_updated: null,
}

function MetricCard({ icon, label, value, tone = 'green', chip = 'Actualizado' }) {
  return (
    <article className="cc-card">
      <div className="cc-card-title"><span className="cc-card-icon"><Icon name={icon} /></span>{label}</div>
      <div className="cc-metric-value">{value}<span className={`cc-chip ${tone}`}>{chip}</span></div>
    </article>
  )
}

export default function DirectivoDashboard() {
  const [schoolId, setSchoolId] = useState('')
  const [dashboard, setDashboard] = useState(DEFAULT_DASHBOARD)
  const [failedNotifications, setFailedNotifications] = useState([])
  const [dlq, setDlq] = useState({ messages: 0, queue: 'q.notification.dlq' })
  const [eventTraces, setEventTraces] = useState([])
  const [health, setHealth] = useState([])
  const [loading, setLoading] = useState(true)
  const [replaying, setReplaying] = useState(false)
  const [resilienceMessage, setResilienceMessage] = useState('')
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [dashboardRes, failedRes, dlqRes, tracesRes, healthResults] = await Promise.all([
        analyticsApi.dashboard(schoolId),
        notificationApi.listFailed().catch(() => ({ data: [] })),
        notificationApi.dlqStatus().catch(() => ({ data: { messages: 0, queue: 'q.notification.dlq' } })),
        analyticsApi.recentEvents(schoolId).catch(() => ({ data: [] })),
        Promise.allSettled([
          healthApi.academic(),
          healthApi.payment(),
          healthApi.notification(),
          healthApi.attendance(),
          healthApi.analytics(),
        ]),
      ])

      setDashboard({ ...DEFAULT_DASHBOARD, ...dashboardRes.data })
      setFailedNotifications(schoolId ? failedRes.data.filter((n) => n.school_id === schoolId) : failedRes.data)
      setDlq(dlqRes.data)
      setEventTraces(tracesRes.data)
      setHealth(
        ['academic', 'payment', 'notification', 'attendance', 'analytics'].map((service, index) => ({
          service,
          status: healthResults[index].status === 'fulfilled' && healthResults[index].value.data.status === 'ok' ? 'OK' : 'Degradado',
          dependencies: healthResults[index].status === 'fulfilled' ? healthResults[index].value.data.dependencies : null,
          outboxPending: healthResults[index].status === 'fulfilled' ? healthResults[index].value.data.outbox_pending : null,
        })),
      )
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo cargar el dashboard directivo')
    } finally {
      setLoading(false)
    }
  }, [schoolId])

  // Carga inicial y cada vez que cambia el colegio seleccionado
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboard()
  }, [loadDashboard])

  // Auto-refresh cada 30 segundos para reflejar nuevos eventos en tiempo casi-real
  const intervalRef = useRef(null)
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      loadDashboard()
    }, 30_000)
    return () => clearInterval(intervalRef.current)
  }, [loadDashboard])

  const eventRows = useMemo(() => ([
    { label: 'Estudiante matriculado', count: dashboard.total_students },
    { label: 'Pago confirmado', count: dashboard.total_payments_confirmed },
    { label: 'Asistencia registrada', count: dashboard.total_attendances },
    { label: 'Incidente reportado', count: dashboard.total_incidents },
    { label: 'Notificación fallida', count: dashboard.total_notifications_failed },
  ]), [dashboard])

  const maxEvents = Math.max(...eventRows.map((row) => row.count), 1)
  const ecosystemOk = health.length > 0
    && health.every((item) => item.status === 'OK')
    && failedNotifications.length === 0
    && Number(dlq.messages || 0) === 0

  const handleReplayDlq = async () => {
    setReplaying(true)
    setError('')
    setResilienceMessage('')
    try {
      const { data } = await notificationApi.replayDlq()
      setResilienceMessage(`Reprocesamiento solicitado: ${data.replayed} evento(s). La idempotencia evita duplicados.`)
      await loadDashboard()
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo reprocesar la DLQ')
    } finally {
      setReplaying(false)
    }
  }

  return (
    <>
      <div className="cc-content-title">
        <h1>Panel directivo</h1>
        <div className="cc-page-actions">
          <select
            value={schoolId}
            onChange={(event) => setSchoolId(event.target.value)}
            style={{ maxWidth: 220 }}
            aria-label="Filtrar por colegio"
          >
            <option value="">Todos los colegios</option>
            {SCHOOLS.map((school) => (
              <option key={school.id} value={school.id}>{school.name}</option>
            ))}
          </select>
          <span className={`cc-chip ${ecosystemOk ? 'green' : 'red'}`}>
            {ecosystemOk ? 'Ecosistema operativo' : 'Revisar alertas'}
          </span>
          <button type="button" className="cc-button secondary" onClick={loadDashboard}>Actualizar</button>
        </div>
      </div>

      {error && <div className="cc-message error" style={{ marginBottom: 18 }}>{error}</div>}
      {resilienceMessage && <div className="cc-message success" style={{ marginBottom: 18 }}>{resilienceMessage}</div>}

      <section className="cc-grid cc-metrics">
        <MetricCard icon="students" label="Estudiantes matriculados" value={dashboard.total_students} />
        <MetricCard icon="payments" label="Pagos confirmados" value={dashboard.total_payments_confirmed} />
        <MetricCard icon="alert" label="Pagos pendientes" value={dashboard.total_payments_pending} tone={dashboard.total_payments_pending > 0 ? 'red' : 'green'} chip={dashboard.total_payments_pending > 0 ? 'Revisar' : 'Al día'} />
      </section>

      <section className="cc-grid cc-dashboard-workspace" style={{ marginTop: 18 }}>
        <article className="cc-card cc-flow-card">
          <div className="cc-card-header">
            <div className="cc-card-title"><span className="cc-card-icon"><Icon name="chart" /></span>Resumen operativo</div>
          </div>
          <div className="cc-metric-value">
            {dashboard.total_events_processed}
            <span className="cc-chip green">Eventos procesados</span>
          </div>
          <div style={{ display: 'grid', gap: 16, marginTop: 28 }}>
            {eventRows.map((row) => (
              <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 60px', alignItems: 'center', gap: 14 }}>
                <strong style={{ fontSize: 12 }}>{row.label}</strong>
                <span className="cc-rate-bar" style={{ width: '100%' }}>
                  <span style={{ width: `${Math.max((row.count / maxEvents) * 100, row.count ? 8 : 0)}%` }} />
                </span>
                <span style={{ color: 'var(--cc-muted)', fontSize: 12, textAlign: 'right' }}>{row.count}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="cc-card">
          <div className="cc-card-header">
            <div className="cc-card-title"><span className="cc-card-icon"><Icon name="activity" /></span>Actividad consolidada</div>
            <span className="cc-chip green">Actual</span>
          </div>
          <div className="cc-metric-value">{dashboard.total_attendances}<span className="cc-chip green">Asistencias</span></div>
          <div className="cc-bars-week">
            {[
              ['Est.', dashboard.total_students],
              ['Pagos', dashboard.total_payments_confirmed],
              ['Asist.', dashboard.total_attendances],
              ['Inas.', dashboard.total_absences],
              ['Inc.', dashboard.total_incidents],
              ['Notif.', dashboard.total_notifications_sent],
              ['Fallos', dashboard.total_notifications_failed],
            ].map(([label, value], index) => (
              <span className="cc-weekbar-wrap" key={label}>
                <span
                  className={`cc-weekbar ${index === 2 ? 'active' : ''}`}
                  style={{ height: `${Math.max(34, Math.min(158, 34 + Number(value || 0) * 2))}px` }}
                />
                {label}
              </span>
            ))}
          </div>
        </article>
      </section>

      <section className="cc-grid cc-dashboard-workspace inverse" style={{ marginTop: 18 }}>
        <article className="cc-card">
          <div className="cc-card-header">
            <div className="cc-card-title"><span className="cc-card-icon"><Icon name="health" /></span>Estado general del ecosistema</div>
          </div>
          {loading ? (
            <p className="cc-loading">Cargando salud de servicios...</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {health.map((item) => (
                <div className="cc-card" style={{ padding: 12 }} key={item.service}>
                  <strong>{SERVICE_LABELS[item.service] || item.service}</strong>
                  <span className={`cc-chip ${item.status === 'OK' ? 'green' : 'red'}`} style={{ float: 'right' }}>
                    {item.status === 'OK' ? 'Operativo' : 'Degradado'}
                  </span>
                  {item.dependencies && (
                    <small style={{ display: 'block', marginTop: 10, color: 'var(--cc-muted)' }}>
                      DB: {item.dependencies.database} · RabbitMQ: {item.dependencies.rabbitmq}
                      {item.outboxPending !== null && item.outboxPending !== undefined ? ` · Outbox: ${item.outboxPending}` : ''}
                    </small>
                  )}
                </div>
              ))}
            </div>
          )}
          <p style={{ marginTop: 18, color: 'var(--cc-muted)', fontSize: 12 }}>
            Última actualización: {dashboard.last_updated ? new Date(dashboard.last_updated).toLocaleString('es-EC') : 'sin eventos todavía'}
          </p>
        </article>

        <article className="cc-card">
          <div className="cc-card-header">
            <div className="cc-card-title"><span className="cc-card-icon"><Icon name="list" /></span>Servicios integrados</div>
            <button type="button" className="cc-button secondary" onClick={loadDashboard}>Actualizar</button>
          </div>
          <table className="cc-table">
            <thead>
              <tr>
                <th>SERVICIO</th>
                <th>MÓDULO</th>
                <th>INDICADOR</th>
                <th>RESULTADO</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Académico</strong></td>
                <td>Gestión académica</td>
                <td>
                  {(() => {
                    const pct = Math.min(dashboard.total_students * 10, 100)
                    return <span className="cc-rate"><span className="cc-rate-bar"><span style={{ width: `${pct}%` }} /></span>{pct}%</span>
                  })()}
                </td>
                <td>{dashboard.total_students} estudiantes</td>
              </tr>
              <tr>
                <td><strong>Pagos</strong></td>
                <td>Finanzas</td>
                <td>
                  {(() => {
                    const total = dashboard.total_payments_confirmed + dashboard.total_payments_pending
                    const pct = total > 0 ? Math.round((dashboard.total_payments_confirmed / total) * 100) : 0
                    return <span className="cc-rate"><span className="cc-rate-bar"><span style={{ width: `${pct}%` }} /></span>{pct}%</span>
                  })()}
                </td>
                <td>{dashboard.total_payments_confirmed} confirmados</td>
              </tr>
              <tr>
                <td><strong>Notificaciones</strong></td>
                <td>Mensajería</td>
                <td>
                  {(() => {
                    const total = dashboard.total_notifications_sent + dashboard.total_notifications_failed
                    const pct = total > 0 ? Math.round((dashboard.total_notifications_sent / total) * 100) : 100
                    return <span className="cc-rate"><span className="cc-rate-bar"><span style={{ width: `${pct}%` }} /></span>{pct}%</span>
                  })()}
                </td>
                <td>{failedNotifications.length} fallidas</td>
              </tr>
            </tbody>
          </table>
        </article>
      </section>

      <section className="cc-grid cc-dashboard-workspace" style={{ marginTop: 18 }}>
        <article className="cc-card">
          <div className="cc-card-header">
            <div className="cc-card-title"><span className="cc-card-icon"><Icon name="alert" /></span>Resiliencia y Dead Letter Queue</div>
            <span className={`cc-chip ${Number(dlq.messages || 0) === 0 ? 'green' : 'red'}`}>
              {dlq.messages || 0} pendiente(s)
            </span>
          </div>
          <p style={{ color: 'var(--cc-muted)', marginTop: 12 }}>
            Cola: <strong>{dlq.queue || 'q.notification.dlq'}</strong>. Los eventos fallidos se conservan para un reprocesamiento seguro.
          </p>
          <button
            type="button"
            className="cc-button primary"
            style={{ marginTop: 18 }}
            disabled={replaying || Number(dlq.messages || 0) === 0}
            onClick={handleReplayDlq}
          >
            {replaying ? 'Reprocesando...' : 'Reprocesar eventos de la DLQ'}
          </button>
        </article>

        <article className="cc-card">
          <div className="cc-card-header">
            <div className="cc-card-title"><span className="cc-card-icon"><Icon name="activity" /></span>Trazabilidad reciente</div>
            <span className="cc-chip green">{eventTraces.length} eventos</span>
          </div>
          {eventTraces.length === 0 ? (
            <p className="cc-empty">Aún no hay eventos procesados para mostrar.</p>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: 300, overflowY: 'auto' }}>
              <table className="cc-table">
                <thead><tr><th>EVENTO</th><th>CORRELACIÓN</th><th>ESTADO</th><th>HORA</th></tr></thead>
                <tbody>
                  {eventTraces.map((trace) => (
                    <tr key={trace.event_id}>
                      <td><strong>{trace.event_type}</strong><small style={{ display: 'block' }}>{trace.event_id.slice(0, 8)}</small></td>
                      <td><small>{trace.correlation_id}</small></td>
                      <td><span className="cc-chip green">{trace.status}</span></td>
                      <td>{new Date(trace.processed_at).toLocaleTimeString('es-EC')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </>
  )
}
