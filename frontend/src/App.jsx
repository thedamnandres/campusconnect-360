import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './features/academic/Login'
import Students from './features/academic/Students'
import StudentDetail from './features/academic/StudentDetail'
import StudentForm from './features/academic/StudentForm'
import EnrollmentForm from './features/academic/EnrollmentForm'

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/students" />} />
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
      </Routes>
    </BrowserRouter>
  )
}

export default App