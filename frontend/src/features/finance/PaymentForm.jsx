import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../../components/Icons'
import { academicApi, paymentApi } from '../../lib/api'
import { getSchoolName } from '../../lib/schools'

const FINANCIAL_STATUS_LABELS = {
  al_dia: 'Al día',
  pendiente: 'Pendiente',
  moroso: 'Moroso',
}

export default function PaymentForm() {
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [form, setForm] = useState({
    student_id: '',
    concept: 'Matrícula inicial',
    amount: '180',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    academicApi.listStudents()
      .then(({ data }) => {
        setStudents(data)
        setForm((current) => ({ ...current, student_id: current.student_id || data[0]?.id || '' }))
      })
      .catch((err) => setError(err.response?.data?.detail || 'No se pudieron cargar los estudiantes'))
  }, [])

  const selected = students.find((student) => student.id === form.student_id)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await paymentApi.createPayment({
        ...form,
        amount: Number(form.amount),
      })
      navigate('/payments')
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo registrar la obligación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="cc-content-title">
        <h1>Nueva obligación de pago</h1>
        <div className="cc-page-actions">
          <button type="button" className="cc-button secondary" onClick={() => navigate('/payments')}>Volver</button>
        </div>
      </div>

      <section className="cc-grid cc-form-workspace">
        <form className="cc-card" onSubmit={handleSubmit}>
          <div className="cc-card-header">
            <div className="cc-card-title"><span className="cc-card-icon"><Icon name="payments" /></span>Registrar obligación</div>
          </div>

          {error && <div className="cc-message error" style={{ marginBottom: 16 }}>{error}</div>}

          <div className="cc-form-grid">
            <div className="cc-field" style={{ gridColumn: '1 / -1' }}>
              <label>Estudiante</label>
              <select value={form.student_id} onChange={(event) => setForm({ ...form, student_id: event.target.value })} required>
                <option value="">Seleccionar estudiante...</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.first_name} {student.last_name} · {student.cedula}
                  </option>
                ))}
              </select>
              {selected && (
                <small style={{ color: 'var(--cc-muted)' }}>
                  Colegio: {getSchoolName(selected.school_id)} (definido al registrar al estudiante)
                </small>
              )}
            </div>
            <div className="cc-field">
              <label>Concepto de pago</label>
              <input
                value={form.concept}
                onChange={(event) => setForm({ ...form, concept: event.target.value })}
                placeholder="Ej. Matrícula 2026, Pensión enero..."
                required
              />
            </div>
            <div className="cc-field">
              <label>Valor a pagar (USD)</label>
              <input type="number" min="1" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required />
            </div>
          </div>

          <button type="submit" className="cc-button primary" style={{ marginTop: 22 }} disabled={loading || !form.student_id}>
            {loading ? 'Registrando...' : 'Registrar obligación de pago'}
          </button>
        </form>

        <aside className="cc-card">
          <div className="cc-card-title"><span className="cc-card-icon"><Icon name="students" /></span>Estudiante seleccionado</div>
          {selected ? (
            <div style={{ marginTop: 22 }}>
              <h2 style={{ fontSize: 24 }}>{selected.first_name} {selected.last_name}</h2>
              <p style={{ color: 'var(--cc-muted)', marginTop: 8 }}>{selected.email}</p>
              <dl style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 14, marginTop: 24 }}>
                <dt style={{ color: 'var(--cc-muted)' }}>Financiero</dt>
                <dd>
                  <span className={selected.financial_status === 'al_dia' ? 'cc-chip green' : 'cc-chip red'}>
                    {FINANCIAL_STATUS_LABELS[selected.financial_status] || selected.financial_status}
                  </span>
                </dd>
                <dt style={{ color: 'var(--cc-muted)' }}>Institución</dt>
                <dd>{getSchoolName(selected.school_id)}</dd>
                <dt style={{ color: 'var(--cc-muted)' }}>Representante</dt>
                <dd>{selected.representative_name || 'Sin representante'}</dd>
              </dl>
            </div>
          ) : (
            <p className="cc-empty">Selecciona un estudiante matriculado.</p>
          )}
        </aside>
      </section>
    </>
  )
}
