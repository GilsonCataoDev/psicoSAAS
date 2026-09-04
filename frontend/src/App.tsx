import { lazy, Suspense } from 'react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { hasPsychologyModules } from '@/lib/professions'
import { useSubscriptionStore } from '@/store/subscription'
import AuthLayout from '@/components/layout/AuthLayout'

// Auth pages — small, loaded eagerly so login is instant
import LoginPage from '@/pages/auth/LoginPage'

// App pages — lazy loaded
const AppLayout           = lazy(() => import('@/components/layout/AppLayout'))
const RegisterPage        = lazy(() => import('@/pages/auth/RegisterPage'))
const ForgotPasswordPage  = lazy(() => import('@/pages/auth/ForgotPasswordPage'))
const ResetPasswordPage   = lazy(() => import('@/pages/auth/ResetPasswordPage'))
const VerifyEmailPage     = lazy(() => import('@/pages/auth/VerifyEmailPage'))
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
const SecurityPage        = lazy(() => import('@/pages/SecurityPage'))
const DpaPage             = lazy(() => import('@/pages/DpaPage'))
const AccessibilityPage   = lazy(() => import('@/pages/AccessibilityPage'))
const BlogPage            = lazy(() => import('@/pages/BlogPage'))
const BlogPostPage        = lazy(() => import('@/pages/BlogPostPage'))
const InstrumentosPage    = lazy(() => import('@/pages/InstrumentosPage'))
const AdminPage           = lazy(() => import('@/pages/AdminPage'))
const TestimonialsPage    = lazy(() => import('@/pages/admin/TestimonialsPage'))
const ChurnPage           = lazy(() => import('@/pages/admin/ChurnPage'))
const NeuropsychAssessmentsPage = lazy(() => import('@/pages/NeuropsychAssessmentsPage'))
const NeuropsychAssessmentPage = lazy(() => import('@/pages/NeuropsychAssessmentPage'))
const ProspectingPage     = lazy(() => import('@/pages/admin/ProspectingPage'))
const RelatoriosPage      = lazy(() => import('@/pages/RelatoriosPage'))
const CRMPage             = lazy(() => import('@/pages/CRMPage'))

// Public pages — lazy loaded
const BookingPage         = lazy(() => import('@/pages/public/BookingPage'))
const BookingConfirmPage  = lazy(() => import('@/pages/public/BookingConfirmPage'))
const VerifyDocumentPage  = lazy(() => import('@/pages/public/VerifyDocumentPage'))
const InstrumentResponsePage = lazy(() => import('@/pages/public/InstrumentResponsePage'))
const EvolucaoPsicologicaPage = lazy(() => import('@/pages/public/EvolucaoPsicologicaPage'))
const PatientPortalPage   = lazy(() => import('@/pages/public/PatientPortalPage'))
const NpsSurveyPage       = lazy(() => import('@/pages/NpsSurveyPage'))
const NeuropsychShareLaudoPage = lazy(() => import('@/pages/public/NeuropsychShareLaudoPage'))

function PageLoader() {
  return (
    <div className="flex min-h-[240px] items-center justify-center">
      <div className="rounded-2xl border border-sage-100 bg-white px-5 py-4 shadow-card dark:border-white/10 dark:bg-cognia-panel">
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-sage-200 border-t-sage-600" />
        <p className="mt-3 text-sm font-medium text-neutral-500 dark:text-neutral-300">Carregando...</p>
      </div>
    </div>
  )
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function SubscriptionRoute() {
  const subscription = useSubscriptionStore((s) => s.subscription)
  const isLoaded = useSubscriptionStore((s) => s.isLoaded)

  if (!isLoaded) return <PageLoader />
  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    return <Navigate to="/planos" replace />
  }

  return <Outlet />
}

function ProOnlyRoute({ children }: { children: React.ReactNode }) {
  const subscription = useSubscriptionStore((s) => s.subscription)
  const isLoaded = useSubscriptionStore((s) => s.isLoaded)
  const plan = String(subscription.planId ?? subscription.plan ?? 'free')

  if (!isLoaded) return <PageLoader />
  if (plan !== 'pro') return <Navigate to="/planos" replace />

  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAdmin = useAuthStore(state => state.user?.isAdmin === true)
  return isAdmin ? <>{children}</> : <Navigate to="/dashboard" replace />
}

/**
 * Módulos exclusivos de psicologia (instrumentos psicométricos, laudo
 * neuropsicológico). Esconder o link do menu não basta — sem isto a URL
 * continuaria acessível para outras profissões.
 */
function PsychologyOnlyRoute({ children }: { children: React.ReactNode }) {
  const profession = useAuthStore(state => state.user?.profession)
  return hasPsychologyModules(profession) ? <>{children}</> : <Navigate to="/dashboard" replace />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>
}

function HomeRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />
}

export default function App() {
  return (
    <ErrorBoundary>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route index element={<HomeRoute />} />
        <Route path="/plataforma" element={<LandingPage />} />
        <Route path="/inicio" element={<Navigate to="/plataforma" replace />} />
        <Route path="/venda" element={<Navigate to="/plataforma" replace />} />
        <Route path="/privacidade" element={<LegalPage type="privacy" />} />
        <Route path="/termos" element={<LegalPage type="terms" />} />
        <Route path="/seguranca" element={<SecurityPage />} />
        <Route path="/dpa" element={<DpaPage />} />
        <Route path="/acessibilidade" element={<AccessibilityPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        <Route path="/precos" element={<PricingPage publicView />} />

        {/* ── Rotas públicas de autenticação ──────────────────────── */}
        <Route path="/register" element={<Navigate to="/cadastro" replace />} />
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
        <Route path="/ferramenta/evolucao" element={<EvolucaoPsicologicaPage />} />
        <Route path="/portal/:token" element={<PatientPortalPage />} />
        <Route path="/avaliar/:token" element={<NpsSurveyPage />} />
        <Route path="/laudo/:token" element={<NeuropsychShareLaudoPage />} />

        {/* ── App interno (autenticado) ────────────────────────────── */}
        <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route path="pricing" element={<Navigate to="/planos" replace />} />
          <Route path="planos" element={<PricingPage />} />
          <Route path="admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
          <Route path="admin/depoimentos" element={<AdminRoute><TestimonialsPage /></AdminRoute>} />
          <Route path="admin/churn" element={<AdminRoute><ChurnPage /></AdminRoute>} />
          <Route path="admin/prospeccao" element={<AdminRoute><ProspectingPage /></AdminRoute>} />
          <Route element={<SubscriptionRoute />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="pacientes" element={<PatientsPage />} />
            <Route path="pacientes/:id" element={<PatientDetailPage />} />
            <Route path="prontuario/:id" element={<ProntuarioPage />} />
            <Route path="documentos" element={<DocumentosPage />} />
            <Route path="agenda" element={<AgendaPage />} />
            <Route path="agendamentos" element={<BookingManagePage />} />
            <Route path="sessoes" element={<SessionsPage />} />
            <Route path="financeiro" element={<FinancialPage />} />
            <Route path="configuracoes" element={<SettingsPage />} />
            <Route path="relatorios" element={<RelatoriosPage />} />
            <Route path="crm" element={<CRMPage />} />
            <Route path="instrumentos" element={<PsychologyOnlyRoute><ProOnlyRoute><InstrumentosPage /></ProOnlyRoute></PsychologyOnlyRoute>} />
            <Route path="avaliacoes" element={<PsychologyOnlyRoute><ProOnlyRoute><NeuropsychAssessmentsPage /></ProOnlyRoute></PsychologyOnlyRoute>} />
            <Route path="avaliacoes/:id" element={<PsychologyOnlyRoute><ProOnlyRoute><NeuropsychAssessmentPage /></ProOnlyRoute></PsychologyOnlyRoute>} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
    </ErrorBoundary>
  )
}
