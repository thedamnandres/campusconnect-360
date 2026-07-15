import axios from 'axios'
import { clearSession } from './session'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:80'

export const api = axios.create({
  baseURL: API_BASE_URL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const detail = error.response?.data?.detail
    const authExpired = error.response?.status === 401
      || detail === 'Not authenticated'
      || detail === 'Token inválido o expirado'

    if (authExpired && window.location.pathname !== '/login') {
      clearSession()
      window.location.assign('/login')
    }

    return Promise.reject(error)
  },
)

export const academicApi = {
  login: (credentials) => api.post('/api/academic/auth/login', credentials),
  listStudents: (q = '') => api.get(q ? `/api/academic/students?q=${encodeURIComponent(q)}` : '/api/academic/students'),
  listEnrolledStudents: () => api.get('/api/academic/students/enrolled'),
  getStudent: (id) => api.get(`/api/academic/students/${id}`),
  createStudent: (payload) => api.post('/api/academic/students', payload),
  enrollStudent: (payload) => api.post('/api/academic/enrollments', payload),
}

export const paymentApi = {
  listPayments: () => api.get('/api/payments/payments'),
  listPending: () => api.get('/api/payments/payments/pending'),
  getStudentPayments: (studentId) => api.get(`/api/payments/payments/student/${studentId}`),
  createPayment: (payload) => api.post('/api/payments/payments', payload),
  confirmPayment: (paymentId) => api.post(`/api/payments/payments/${paymentId}/confirm`),
}

export const attendanceApi = {
  listStudents: () => api.get('/api/attendance/students'),
  registerAttendance: (payload) => api.post('/api/attendance/attendance', payload),
  getStudentAttendance: (studentId) => api.get(`/api/attendance/attendance/student/${studentId}`),
  reportIncident: (payload) => api.post('/api/attendance/incidents', payload),
  getStudentIncidents: (studentId) => api.get(`/api/attendance/incidents/student/${studentId}`),
}

export const notificationApi = {
  listNotifications: () => api.get('/api/notifications/notifications'),
  listStudentNotifications: (studentId) => api.get(`/api/notifications/notifications/student/${studentId}`),
  listFailed: () => api.get('/api/notifications/notifications/failed'),
  retry: (id) => api.post(`/api/notifications/notifications/${id}/retry`),
  dlqStatus: () => api.get('/api/notifications/dlq/status'),
  replayDlq: (limit = 100) => api.post(`/api/notifications/dlq/replay?limit=${limit}`),
}

export const analyticsApi = {
  dashboard: (schoolId = '') => api.get(
    schoolId ? `/api/analytics/dashboard?school_id=${encodeURIComponent(schoolId)}` : '/api/analytics/dashboard',
  ),
  recentEvents: (schoolId = '', limit = 20) => api.get(
    `/api/analytics/events?limit=${limit}${schoolId ? `&school_id=${encodeURIComponent(schoolId)}` : ''}`,
  ),
}

export const healthApi = {
  gateway: () => api.get('/health'),
  academic: () => api.get('/api/academic/health'),
  payment: () => api.get('/api/payments/health'),
  notification: () => api.get('/api/notifications/health'),
  attendance: () => api.get('/api/attendance/health'),
  analytics: () => api.get('/api/analytics/health'),
}
