import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Login from './features/academic/Login'
import Students from './features/academic/Students'
import StudentDetail from './features/academic/StudentDetail'
import StudentForm from './features/academic/StudentForm'
import EnrollmentForm from './features/academic/EnrollmentForm'
import AppLayout from './components/AppLayout'
import Payments from './features/finance/Payments'
import PaymentForm from './features/finance/PaymentForm'
import AttendanceDashboard from './features/attendance/AttendanceDashboard'
import DirectivoDashboard from './features/dashboard/DirectivoDashboard'
import { getSession } from './lib/session'
import { canAccess, getHomeForRole } from './lib/access'

// Guards each screen behind two checks: is there a valid session, and does
// that session's role (issued by the backend JWT, not guessed client-side)
// belong to the section being requested.
const ProtectedRoute = ({ children }) => {
  const location = useLocation()
  const session = getSession()

  if (!session) {
    return <Navigate to="/login" replace />
  }
  if (!canAccess(session.role, location.pathname)) {
    return <Navigate to={getHomeForRole(session.role)} replace />
  }
  return <AppLayout>{children}</AppLayout>
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/students" element={
          <ProtectedRoute><Students /></ProtectedRoute>
        } />
        <Route path="/students/new" element={
          <ProtectedRoute><StudentForm /></ProtectedRoute>
        } />
        <Route path="/students/:id" element={
          <ProtectedRoute><StudentDetail /></ProtectedRoute>
        } />
        <Route path="/students/:id/enroll" element={
          <ProtectedRoute><EnrollmentForm /></ProtectedRoute>
        } />
        <Route path="/payments" element={
          <ProtectedRoute><Payments /></ProtectedRoute>
        } />
        <Route path="/payments/new" element={
          <ProtectedRoute><PaymentForm /></ProtectedRoute>
        } />
        <Route path="/wellbeing" element={
          <ProtectedRoute><AttendanceDashboard /></ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute><DirectivoDashboard /></ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
