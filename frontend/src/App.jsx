/**
 * DEVSIGHTAI — App Entry Point
 *
 * React Router configuration with ThemeProvider and DashboardLayout shell.
 * All pages render inside the DashboardLayout via nested routes.
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import DashboardLayout from './layouts/DashboardLayout'
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
            <Route element={<DashboardLayout />}>
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
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
