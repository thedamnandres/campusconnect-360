import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../../components/Icons'
import { paymentApi } from '../../lib/api'

function money(value) {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(Number(value || 0))
}

function statusChip(status) {
  if (status === 'confirmado') return <span className="cc-chip green">Confirmado</span>
  if (status === 'fallido') return <span className="cc-chip red">Fallido</span>
  return <span className="cc-chip red">Pendiente</span>
}

export default function Payments() {
  const navigate = useNavigate()
  const [payments, setPayments] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)

  const loadPayments = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await paymentApi.listPayments()
      setPayments(data)
      setSelectedId((current) => current || data[0]?.id || null)
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

  const selected = payments.find((payment) => payment.id === selectedId) || payments[0]

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

  const confirmPayment = async () => {
    if (!selected || selected.status !== 'pendiente') return
    setConfirming(true)
    setError('')
    setMessage('')
    try {
      await paymentApi.confirmPayment(selected.id)
      setMessage('Pago confirmado. Se publicó el evento de pago confirmado para académico, notificaciones y analítica.')
      await loadPayments()
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo confirmar el pago')
    } finally {
      setConfirming(false)
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
            Nueva obligación
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
            {[
              [metrics.pending || 1, 'Oct'],
              [Math.max(metrics.confirmed, 1), 'Nov'],
              [Math.max(metrics.pending + metrics.confirmed, 1), 'Dic'],
            ].map(([count, label], index) => (
              <div key={label}>
                <div className="cc-stack">
                  {['var(--cc-purple)', 'var(--cc-purple-2)', 'var(--cc-blue)', 'var(--cc-teal)', 'var(--cc-mint)'].map((color, i) => (
                    <span key={color} style={{ background: color, opacity: index === 1 && i > count % 5 ? 0.35 : 1 }} />
                  ))}
                </div>
                <p className="cc-stack-label">{label}</p>
              </div>
            ))}
          </div>
        </article>

        <aside className="cc-card">
          <div className="cc-card-header">
            <div className="cc-card-title"><span className="cc-card-icon"><Icon name="payments" /></span>Obligación seleccionada</div>
            {selected && statusChip(selected.status)}
          </div>
          {selected ? (
            <>
              <h2 style={{ fontSize: 24, marginBottom: 8 }}>{selected.student_name}</h2>
              <p style={{ color: 'var(--cc-muted)', fontSize: 12, lineHeight: 1.45 }}>
                {selected.school_id} · {selected.concept}
              </p>
              <dl style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16, marginTop: 28, fontSize: 13 }}>
                <dt style={{ color: 'var(--cc-muted)' }}>Valor</dt>
                <dd><strong>{money(selected.amount)}</strong></dd>
                <dt style={{ color: 'var(--cc-muted)' }}>ID de pago</dt>
                <dd>{selected.id}</dd>
                <dt style={{ color: 'var(--cc-muted)' }}>Registrado</dt>
                <dd>{new Date(selected.created_at).toLocaleString('es-EC')}</dd>
                <dt style={{ color: 'var(--cc-muted)' }}>Evento</dt>
                <dd><span className="cc-chip purple">Pago confirmado</span></dd>
              </dl>
              <button
                type="button"
                className="cc-button primary"
                style={{ marginTop: 30 }}
                disabled={selected.status !== 'pendiente' || confirming}
                onClick={confirmPayment}
              >
                {confirming ? 'Confirmando...' : 'Confirmar pago'}
              </button>
            </>
          ) : (
            <p className="cc-empty">Registra una obligación para iniciar el flujo de pagos.</p>
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
                <th>ACCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((payment) => (
                <tr key={payment.id}>
                  <td><strong>{payment.student_name}</strong></td>
                  <td>{payment.concept}</td>
                  <td>
                    <span className="cc-rate">
                      <span className="cc-rate-bar"><span style={{ width: payment.status === 'confirmado' ? '80%' : '35%' }} /></span>
                      {payment.status === 'confirmado' ? '80%' : '35%'}
                    </span>
                  </td>
                  <td>{money(payment.amount)}</td>
                  <td>{statusChip(payment.status)}</td>
                  <td>
                    <button type="button" className="cc-button secondary" onClick={() => setSelectedId(payment.id)}>
                      Seleccionar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  )
}
