import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../../components/Icons'
import { paymentApi } from '../../lib/api'

function money(value) {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(Number(value || 0))
}

function paymentAvance(status) {
  if (status === 'confirmado') return 100
  if (status === 'pendiente') return 50
  return 0 // fallido
}

function lastThreeMonths() {
  const now = new Date()
  return [2, 1, 0].map((offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    return d.toLocaleString('es-EC', { month: 'short' })
  })
}

function statusChip(status) {
  if (status === 'confirmado') return <span className="cc-chip green">Confirmado</span>
  if (status === 'fallido') return <span className="cc-chip red">Fallido</span>
  return <span className="cc-chip red">Pendiente</span>
}

export default function Payments() {
  const navigate = useNavigate()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [confirmingId, setConfirmingId] = useState(null)

  const loadPayments = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await paymentApi.listPayments()
      setPayments(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudieron cargar los pagos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPayments()
  }, [loadPayments])

  const metrics = useMemo(() => {
    const pending = payments.filter((payment) => payment.status === 'pendiente')
    const confirmed = payments.filter((payment) => payment.status === 'confirmado')
    const failed = payments.filter((payment) => payment.status === 'fallido')
    return {
      pending: pending.length,
      confirmed: confirmed.length,
      failed: failed.length,
      pendingAmount: pending.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    }
  }, [payments])

  const pendingPayments = useMemo(
    () => payments.filter((payment) => payment.status === 'pendiente'),
    [payments],
  )

  // Cada obligación pendiente se confirma de forma independiente: no hay
  // "una obligación seleccionada", sino N acciones posibles a la vez.
  const confirmPayment = async (paymentId) => {
    setConfirmingId(paymentId)
    setError('')
    setMessage('')
    try {
      await paymentApi.confirmPayment(paymentId)
      setMessage('Pago confirmado. Se publicó el evento de pago confirmado para académico, notificaciones y analítica.')
      await loadPayments()
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo confirmar el pago')
    } finally {
      setConfirmingId(null)
    }
  }

  const rows = payments.slice(0, 8)

  return (
    <>
      <div className="cc-content-title">
        <h1>Portal financiero</h1>
        <div className="cc-page-actions">
          <button type="button" className="cc-button secondary" onClick={loadPayments}>Actualizar</button>
          <button type="button" className="cc-button primary" onClick={() => navigate('/payments/new')}>
            Nueva obligación de pago
          </button>
        </div>
      </div>

      <section className="cc-grid cc-metrics">
        <article className="cc-card">
          <div className="cc-card-title"><span className="cc-card-icon"><Icon name="payments" /></span>Pagos pendientes</div>
          <div className="cc-metric-value">{metrics.pending}<span className="cc-chip red">{money(metrics.pendingAmount)}</span></div>
        </article>
        <article className="cc-card">
          <div className="cc-card-title"><span className="cc-card-icon"><Icon name="check" /></span>Pagos confirmados</div>
          <div className="cc-metric-value">{metrics.confirmed}<span className="cc-chip green">Actual</span></div>
        </article>
        <article className="cc-card">
          <div className="cc-card-title"><span className="cc-card-icon"><Icon name="activity" /></span>Evento de pago confirmado</div>
          <div className="cc-metric-value">{metrics.confirmed}<span className="cc-chip green">Eventos</span></div>
        </article>
      </section>

      {(error || message) && (
        <div style={{ marginTop: 18 }} className={`cc-message ${error ? 'error' : 'success'}`}>
          {error || message}
        </div>
      )}

      <section className="cc-grid cc-payment-workspace" style={{ marginTop: 18 }}>
        <article className="cc-card cc-flow-card">
          <div className="cc-card-header">
            <div className="cc-card-title"><span className="cc-card-icon"><Icon name="chart" /></span>Resumen del flujo financiero</div>
          </div>
          <div className="cc-metric-value">{money(metrics.pendingAmount)}<span className="cc-chip red">Pendiente</span></div>
          <div className="cc-bars" aria-hidden="true">
            {lastThreeMonths().map((label, index) => {
              const count = index === 0 ? (metrics.pending || 1) : index === 1 ? Math.max(metrics.confirmed, 1) : Math.max(metrics.pending + metrics.confirmed, 1)
              return (
                <div key={label}>
                  <div className="cc-stack">
                    {['var(--cc-purple)', 'var(--cc-purple-2)', 'var(--cc-blue)', 'var(--cc-teal)', 'var(--cc-mint)'].map((color, i) => (
                      <span key={color} style={{ background: color, opacity: index === 1 && i > count % 5 ? 0.35 : 1 }} />
                    ))}
                  </div>
                  <p className="cc-stack-label">{label}</p>
                </div>
              )
            })}
          </div>
        </article>

        <aside className="cc-card">
          <div className="cc-card-header">
            <div className="cc-card-title"><span className="cc-card-icon"><Icon name="payments" /></span>Pagos pendientes por confirmar</div>
            <span className="cc-chip red">{pendingPayments.length}</span>
          </div>
          {pendingPayments.length === 0 ? (
            <p className="cc-empty">No hay pagos pendientes por confirmar.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10, marginTop: 16, maxHeight: 360, overflowY: 'auto', paddingRight: 4 }}>
              {pendingPayments.map((payment) => (
                <div key={payment.id} className="cc-card" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      <strong>{payment.student_name}</strong>
                      <p style={{ color: 'var(--cc-muted)', fontSize: 12, marginTop: 2 }}>{payment.concept}</p>
                    </div>
                    <strong style={{ whiteSpace: 'nowrap' }}>{money(payment.amount)}</strong>
                  </div>
                  <button
                    type="button"
                    className="cc-button primary"
                    style={{ marginTop: 12, width: '100%' }}
                    disabled={confirmingId === payment.id}
                    onClick={() => confirmPayment(payment.id)}
                  >
                    {confirmingId === payment.id ? 'Confirmando...' : 'Confirmar pago'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>
      </section>

      <section className="cc-card" style={{ marginTop: 18 }}>
        <div className="cc-card-header">
          <div className="cc-card-title"><span className="cc-card-icon"><Icon name="list" /></span>Listado de obligaciones de pago</div>
          <button type="button" className="cc-button secondary" onClick={loadPayments}>Actualizar</button>
        </div>
        {loading ? (
          <p className="cc-loading">Cargando pagos...</p>
        ) : rows.length === 0 ? (
          <p className="cc-empty">No hay obligaciones registradas.</p>
        ) : (
          <table className="cc-table">
            <thead>
              <tr>
                <th>ESTUDIANTE</th>
                <th>CONCEPTO</th>
                <th>AVANCE</th>
                <th>VALOR</th>
                <th>ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((payment) => (
                <tr key={payment.id}>
                  <td><strong>{payment.student_name}</strong></td>
                  <td>{payment.concept}</td>
                  <td>
                    <span className="cc-rate">
                      <span className="cc-rate-bar"><span style={{ width: `${paymentAvance(payment.status)}%` }} /></span>
                      {paymentAvance(payment.status)}%
                    </span>
                  </td>
                  <td>{money(payment.amount)}</td>
                  <td>{statusChip(payment.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p style={{ marginTop: 12, fontSize: 12, color: 'var(--cc-muted)' }}>
          Para confirmar un pago, usa el panel «Pagos pendientes por confirmar» arriba.
        </p>
      </section>
    </>
  )
}
