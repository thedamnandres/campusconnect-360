import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  return token ? <AppLayout>{children}</AppLayout> : <Navigate to="/login" />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/students" element={
          <PrivateRoute><Students /></PrivateRoute>
        } />
        <Route path="/students/new" element={
          <PrivateRoute><StudentForm /></PrivateRoute>
        } />
        <Route path="/students/:id" element={
          <PrivateRoute><StudentDetail /></PrivateRoute>
        } />
        <Route path="/students/:id/enroll" element={
          <PrivateRoute><EnrollmentForm /></PrivateRoute>
        } />
        <Route path="/payments" element={
          <PrivateRoute><Payments /></PrivateRoute>
        } />
        <Route path="/payments/new" element={
          <PrivateRoute><PaymentForm /></PrivateRoute>
        } />
        <Route path="/wellbeing" element={
          <PrivateRoute><AttendanceDashboard /></PrivateRoute>
        } />
        <Route path="/dashboard" element={
          <PrivateRoute><DirectivoDashboard /></PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
