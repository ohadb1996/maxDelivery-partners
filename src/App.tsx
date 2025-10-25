import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import ActiveJob from './pages/ActiveJob'
import History from './pages/History'
import Profile from './pages/Profile'
import JobDetails from './pages/JobDetails'
import Login from './pages/Login'
import Register from './pages/Register'

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected Routes */}
          <Route path="/" element={
            <Layout>
              <Dashboard />
            </Layout>
          } />
          <Route path="/active" element={
            <Layout>
              <ActiveJob />
            </Layout>
          } />
          <Route path="/history" element={
            <Layout>
              <History />
            </Layout>
          } />
          <Route path="/profile" element={
            <Layout>
              <Profile />
            </Layout>
          } />
          <Route path="/job/:id" element={
            <Layout>
              <JobDetails />
            </Layout>
          } />
        </Routes>
      </Router>
    </AuthProvider>
    </LanguageProvider>
  )
}

export default App
