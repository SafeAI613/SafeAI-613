import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import LandingPageV2 from "../pages/LandingPageV2";
import SafeAIUIPage from "../pages/SafeAIUIPage";
import NotFound from "../pages/NotFound";
import OrganizationUsersPage from "../pages/OrganizationUsersPage";
import ContactPage from "../pages/ContactPage";
import DocsPage from "../pages/DocsPage";
import ArticlesPage from "../pages/ArticlesPage";
import ArticlePage from "../pages/ArticlePage";
import AdminArticlesPage from "../pages/AdminArticlesPage";
import RecommendedGuidesPage from "../pages/RecommendedGuidesPage";
import CoursesPage from "../pages/CoursesPage";
import ActivityLogPage from "../pages/ActivityLogPage";
import AboutPage from "../pages/AboutPage";
import PrivacyPolicyPage from "../pages/PrivacyPolicyPage";
import TenderBoardPage from "../pages/TenderBoardPage";
import DownloadAgentsPage from "../pages/AgentDownloadsPage";
import AgentsIndexPage from "../features/agents/AgentsIndexPage";
import AgentsMarketplace from "../features/agents/AgentsMarketplace";
import AgentDetailPage from "../features/agents/AgentDetailPage";
import AgentSubmitPage from "../features/agents/AgentSubmitPage";
import AgentStatsPage from "../features/agents/AgentStatsPage";
import LoginForm from "../features/auth/LoginForm";
import RegisterForm from "../features/auth/RegisterForm";
import ApiKeyDisplay from "../features/auth/ApiKeyDisplay";
import EmailVerification from "../features/auth/EmailVerification";
import ForgotPassword from "../features/auth/ForgotPassword";
import ResetPassword from "../features/auth/ResetPassword";
import ChangePassword from "../features/auth/ChangePassword";
import RegisterFormSuccess from "../features/auth/RegisterFormSuccess";
import Footer from "../components/Footer";
import { PublicOrgOwnerSignup } from "../features/organizations/PublicOrgOwnerSignup";
import RequestDetails from "../features/safeai-ui/RequestDetails";
import AiNewsPage from "../pages/AiNewsPage";
import AiNewsDetailsPage from "../pages/AiNewsDetailsPage";
import ErrorBoundary from "../components/ErrorBoundary";
import ForumPage from '../features/forum/ForumPage';
import { PostThreadPage } from '../features/forum/PostThreadPage';
import PaymeResultPage from '../features/organizations/PaymeResultPage';
import OrganizationInvoicesPage from '../features/organizations/pages/OrganizationInvoicesPage';
import SafeAIHubHomePage from "../pages/SafeAIHubHomePage";
import SafeAIPlatformHomePage from "../pages/SafeAIPlatformHomePage";
import PlatformTeaserPage from "../pages/PlatformTeaserPage";
import SiteLayout from "../layout/SiteLayout";
import PlatformLayout from "../layout/PlatformLayout";
import HubLayout from "../layout/HubLayout";
import { ProtectedRoute, PublicRoute } from "./guards";
import LegacyRedirect from "./LegacyRedirect";
import { ROUTES, LEGACY_REDIRECTS } from "./paths";

const ROUTER_BASE = import.meta.env.VITE_BASE_PATH?.replace(/\/$/, "") || "";

export default function AppRouter() {
  return (
    <HelmetProvider>
    <BrowserRouter basename={ROUTER_BASE}>
      <Routes>
        {/* SafeAI Platform — using SafeAI as an AI provider. The index is a
            public teaser for guests; everything else requires login. */}
        <Route path={ROUTES.platform.root}>
          <Route
            index
            element={
              <PublicRoute redirectTo={ROUTES.platform.dashboard}>
                <PlatformTeaserPage />
              </PublicRoute>
            }
          />
          <Route
            element={
              <ProtectedRoute>
                <PlatformLayout />
              </ProtectedRoute>
            }
          >
            <Route path={ROUTES.platform.dashboard} element={<SafeAIPlatformHomePage />} />
            <Route path={`${ROUTES.platform.account}/:section?`} element={<SafeAIUIPage area="account" />} />
            <Route path={`${ROUTES.platform.admin}/:section?`} element={<SafeAIUIPage area="admin" />} />
            <Route path={ROUTES.platform.requestDetails} element={<RequestDetails />} />
            <Route path={ROUTES.platform.organizationUsers} element={<OrganizationUsersPage />} />
            <Route path={ROUTES.platform.organizationInvoices} element={<OrganizationInvoicesPage />} />
            <Route path={ROUTES.platform.changelog} element={<ActivityLogPage />} />
            <Route path={ROUTES.platform.apiKeyCreated} element={<ApiKeyDisplay />} />
          </Route>
        </Route>

        {/* SafeAI Hub — knowledge & community. Public for reading; actions
            inside pages require login. */}
        <Route path={ROUTES.hub.root} element={<HubLayout />}>
          <Route index element={<SafeAIHubHomePage />} />
        </Route>

        {/* Moved URLs → their new location */}
        {LEGACY_REDIRECTS.map(({ from, to }) => (
          <Route key={from} path={from} element={<LegacyRedirect to={to} />} />
        ))}

        {/* Gateway-level pages, with the global top navigation */}
        <Route element={<SiteLayout />}>
          {/* Public Routes */}
          <Route path={ROUTES.home} element={<LandingPageV2 />} />
          <Route path="/become-org-owner" element={<PublicOrgOwnerSignup />} />

          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginForm />
              </PublicRoute>
            }
          />

          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterForm />
              </PublicRoute>
            }
          />
          <Route
            path="/register-success"
            element={
              <PublicRoute>
                <RegisterFormSuccess />
              </PublicRoute>
            }
          />

          <Route path="/verify-email/:token" element={<EmailVerification />} />

          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            }
          />

          <Route path="/reset-password/:token" element={<ResetPassword />} />

          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            }
          />

          <Route
            path="/forum"
            element={
                <ForumPage />
            }
          />

          {/* Organization Routes */}
           <Route
            path="/ai-news"
            element={
             <ProtectedRoute>
               <AiNewsPage />
             </ProtectedRoute>
            }
          />
          <Route
            path="/ai-news/:id"
            element={
             <ProtectedRoute>
               <AiNewsDetailsPage />
             </ProtectedRoute>
            }
          />

          {/* Organization Routes */}

          {/* PayMe wallet top-up result pages (PayMe redirects the browser here) */}
          <Route
            path="/organizations/:id/wallet/payme/success"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <PaymeResultPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizations/:id/wallet/payme/fail"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <PaymeResultPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/articles"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <AdminArticlesPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />



          {/* New Pages Routes */}
          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/docs" element={<ArticlesPage />} />
          <Route path="/docs/:slug" element={<ArticlePage />} />
          <Route path="/docs-old" element={<DocsPage />} />
          <Route path="/recommended-guides" element={<RecommendedGuidesPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/tender-board" element={<TenderBoardPage />} />
          <Route path="/download-agents" element={<DownloadAgentsPage />} />

          {/* Agents Marketplace — community-submitted agents, separate from the desktop-app download page above */}
          <Route path="/agents-marketplace" element={<AgentsIndexPage />}>
            <Route index element={<AgentsMarketplace />} />
            <Route path="submit" element={<AgentSubmitPage />} />
            <Route path="stats" element={<AgentStatsPage />} />
            <Route path=":id" element={<AgentDetailPage />} />
          </Route>

          <Route path="/forum/post/:id" element={<PostThreadPage />} />

          {/* Catch all - 404 */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>

      <Footer />
    </BrowserRouter>
    </HelmetProvider>
  );
}