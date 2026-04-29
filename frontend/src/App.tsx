import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import AppLayout from '@/components/layout/AppLayout'
import AuthLayout from '@/components/layout/AuthLayout'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'
import DashboardPage from '@/pages/DashboardPage'
import PatientsPage from '@/pages/PatientsPage'
import PatientDetailPage from '@/pages/PatientDetailPage'
import AgendaPage from '@/pages/AgendaPage'
import SessionsPage from '@/pages/SessionsPage'
import FinancialPage from '@/pages/FinancialPage'
import SettingsPage from '@/pages/SettingsPage'
import BookingManagePage from '@/pages/BookingManagePage'
import BookingPage from '@/pages/public/BookingPage'
import BookingConfirmPage from '@/pages/public/BookingConfirmPage'
import VerifyDocumentPage from '@/pages/public/VerifyDocumentPage'
import ProntuarioPage from '@/pages/ProntuarioPage'
import DocumentosPage from '@/pages/DocumentosPage'
import PlansPage from '@/pages/PlansPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>
}

export default function App() {
  return (
    <Routes>
      {/* ── Rotas públicas de autenticação ──────────────────────── */}
      <Route element={<PublicRoute><AuthLayout /></PublicRoute>}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<RegisterPage />} />
        <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
      </Route>

      {/* Reset de senha — acessível mesmo logado (token na URL) */}
      <Route element={<AuthLayout />}>
        <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
      </Route>

      {/* ── Página pública de agendamento (sem auth, sem layout interno) ── */}
      <Route path="/agendar/:slug" element={<BookingPage />} />
      <Route path="/agendar/:action/:token" element={<BookingConfirmPage />} />
      <Route path="/verificar/:code" element={<VerifyDocumentPage />} />

      {/* ── App interno (autenticado) ────────────────────────────── */}
      <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="pacientes" element={<PatientsPage />} />
        <Route path="pacientes/:id" element={<PatientDetailPage />} />
        <Route path="prontuario/:id" element={<ProntuarioPage />} />
        <Route path="documentos" element={<DocumentosPage />} />
        <Route path="agenda" element={<AgendaPage />} />
        <Route path="agendamentos" element={<BookingManagePage />} />
        <Route path="sessoes" element={<SessionsPage />} />
        <Route path="financeiro" element={<FinancialPage />} />
        <Route path="configuracoes" element={<SettingsPage />} />
        <Route path="planos" element={<PlansPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
