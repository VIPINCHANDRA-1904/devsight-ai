/**
 * DEVSIGHTAI — App Entry Point
 *
 * React Router configuration with:
 * - ThemeProvider & AuthProvider
 * - Public routes: /login, /register
 * - Protected routes: / and all telemetry sub-pages guarded by ProtectedRoute
 * - DashboardLayout shell for authenticated views
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardLayout from './layouts/DashboardLayout'

// Public Authentication Pages
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

// Protected Platform Pages
import OverviewPage from './pages/OverviewPage'
import MetricsPage from './pages/MetricsPage'
import LogsPage from './pages/LogsPage'
import IncidentsPage from './pages/IncidentsPage'
import DeploymentsPage from './pages/DeploymentsPage'
import ServicesPage from './pages/ServicesPage'
import SlaPage from './pages/SlaPage'
import ReportsPage from './pages/ReportsPage'
import DemoPage from './pages/DemoPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Authentication Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected Application Routes */}
            <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<OverviewPage />} />
              <Route path="/metrics" element={<MetricsPage />} />
              <Route path="/logs" element={<LogsPage />} />
              <Route path="/incidents" element={<IncidentsPage />} />
              <Route path="/deployments" element={<DeploymentsPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/sla" element={<SlaPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/demo" element={<DemoPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
            </Route>

            {/* Fallback Catch-All */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
