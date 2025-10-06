import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import ActiveJob from './pages/ActiveJob'
import History from './pages/History'
import Profile from './pages/Profile'
import JobDetails from './pages/JobDetails'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/active" element={<ActiveJob />} />
          <Route path="/history" element={<History />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/job/:id" element={<JobDetails />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
