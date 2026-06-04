import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useSubscriptionStore } from '@/store/subscription'
import AppLayout from '@/components/layout/AppLayout'
import AuthLayout from '@/components/layout/AuthLayout'

// Auth pages — small, loaded eagerly so login is instant
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'
import VerifyEmailPage from '@/pages/auth/VerifyEmailPage'

// App pages — lazy loaded
const DashboardPage       = lazy(() => import('@/pages/DashboardPage'))
const PatientsPage        = lazy(() => import('@/pages/PatientsPage'))
const PatientDetailPage   = lazy(() => import('@/pages/PatientDetailPage'))
const AgendaPage          = lazy(() => import('@/pages/AgendaPage'))
const SessionsPage        = lazy(() => import('@/pages/SessionsPage'))
const FinancialPage       = lazy(() => import('@/pages/FinancialPage'))
const SettingsPage        = lazy(() => import('@/pages/SettingsPage'))
const BookingManagePage   = lazy(() => import('@/pages/BookingManagePage'))
const DocumentosPage      = lazy(() => import('@/pages/DocumentosPage'))
const ProntuarioPage      = lazy(() => import('@/pages/ProntuarioPage'))
const PricingPage         = lazy(() => import('@/pages/PricingPage'))
const LandingPage         = lazy(() => import('@/pages/LandingPage'))
const LegalPage           = lazy(() => import('@/pages/LegalPage'))
const InstrumentosPage    = lazy(() => import('@/pages/InstrumentosPage'))

// Public pages — lazy loaded
const BookingPage         = lazy(() => import('@/pages/public/BookingPage'))
const BookingConfirmPage  = lazy(() => import('@/pages/public/BookingConfirmPage'))
const VerifyDocumentPage  = lazy(() => import('@/pages/public/VerifyDocumentPage'))
const InstrumentResponsePage = lazy(() => import('@/pages/public/InstrumentResponsePage'))

function PageLoader() {
  return (
    <div className="flex h-48 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-sage-200 border-t-sage-600" />
    </div>
  )
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function SubscriptionRoute({ children }: { children: React.ReactNode }) {
  const subscription = useSubscriptionStore((s) => s.subscription)
  const isLoaded = useSubscriptionStore((s) => s.isLoaded)

  if (!isLoaded) return null
  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    return <Navigate to="/pricing" replace />
  }

  return <>{children}</>
}

function ProOnlyRoute({ children }: { children: React.ReactNode }) {
  const subscription = useSubscriptionStore((s) => s.subscription)
  const isLoaded = useSubscriptionStore((s) => s.isLoaded)
  const plan = String(subscription.planId ?? subscription.plan ?? 'free')

  if (!isLoaded) return null
  if (plan !== 'pro') return <Navigate to="/planos" replace />

  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/plataforma" element={<LandingPage />} />
        <Route path="/inicio" element={<Navigate to="/plataforma" replace />} />
        <Route path="/venda" element={<Navigate to="/plataforma" replace />} />
        <Route path="/privacidade" element={<LegalPage type="privacy" />} />
        <Route path="/termos" element={<LegalPage type="terms" />} />

        {/* ── Rotas públicas de autenticação ──────────────────────── */}
        <Route element={<PublicRoute><AuthLayout /></PublicRoute>}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />
          <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
        </Route>

        {/* Reset de senha — acessível mesmo logado (token na URL) */}
        <Route element={<AuthLayout />}>
          <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
          <Route path="/verificar-email" element={<VerifyEmailPage />} />
        </Route>

        {/* ── Páginas públicas (sem auth, sem layout interno) ── */}
        <Route path="/agendar/:slug" element={<BookingPage />} />
        <Route path="/agendar/:action/:token" element={<BookingConfirmPage />} />
        <Route path="/c/:token" element={<BookingConfirmPage fixedAction="cancelar" />} />
        <Route path="/instrumentos/responder/:token" element={<InstrumentResponsePage />} />
        <Route path="/verificar/:code" element={<VerifyDocumentPage />} />

        {/* ── App interno (autenticado) ────────────────────────────── */}
        <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route path="pricing" element={<PricingPage />} />
        </Route>

        <Route element={<PrivateRoute><SubscriptionRoute><AppLayout /></SubscriptionRoute></PrivateRoute>}>
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
          <Route path="instrumentos" element={<ProOnlyRoute><InstrumentosPage /></ProOnlyRoute>} />
          <Route path="planos" element={<PricingPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
