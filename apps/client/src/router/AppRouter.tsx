import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import LandingPageV2 from "../pages/LandingPageV2";
import SafeAIUIPage from "../pages/SafeAIUIPage";
import NotFound from "../pages/NotFound";
import OrganizationUsersPage from "../pages/OrganizationUsersPage";
import ContactPage from "../pages/ContactPage";
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
import HubIntroPage from "../pages/HubIntroPage";
import PlatformIntroPage from "../pages/PlatformIntroPage";
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
        {/* Intro pages for each platform, linked from the gateway. Full-bleed
            pages with their own header — outside SiteLayout's top navigation. */}
        <Route path={ROUTES.welcome.hub} element={<HubIntroPage />} />
        <Route path={ROUTES.welcome.platform} element={<PlatformIntroPage />} />

        {/* SafeAI Platform — using SafeAI as an AI provider. The index is the
            intro page for guests; everything else requires login. */}
        <Route path={ROUTES.platform.root}>
          <Route
            index
            element={
              <PublicRoute redirectTo={ROUTES.platform.dashboard}>
                <PlatformIntroPage />
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
          <Route path={ROUTES.hub.forum} element={<ForumPage />} />
          <Route path={ROUTES.hub.forumPost} element={<PostThreadPage />} />
          <Route path={ROUTES.hub.news} element={<AiNewsPage />} />
          <Route path={ROUTES.hub.newsItem} element={<AiNewsDetailsPage />} />
          <Route path={ROUTES.hub.articles} element={<ArticlesPage />} />
          <Route path={ROUTES.hub.article} element={<ArticlePage />} />
          <Route path={ROUTES.hub.courses} element={<CoursesPage />} />
          <Route path={ROUTES.hub.guides} element={<RecommendedGuidesPage />} />
          <Route path={ROUTES.hub.projects} element={<TenderBoardPage />} />
          <Route path={ROUTES.hub.agents} element={<AgentsIndexPage />}>
            <Route index element={<AgentsMarketplace />} />
            <Route
              path={ROUTES.hub.agentsSubmit}
              element={
                <ProtectedRoute>
                  <AgentSubmitPage />
                </ProtectedRoute>
              }
            />
            <Route path={ROUTES.hub.agentsStats} element={<AgentStatsPage />} />
            <Route path={ROUTES.hub.agentsDownload} element={<DownloadAgentsPage />} />
            <Route path={ROUTES.hub.agent} element={<AgentDetailPage />} />
          </Route>
          <Route
            path={ROUTES.hub.adminArticles}
            element={
              <ProtectedRoute>
                <AdminArticlesPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Moved URLs → their new location */}
        {LEGACY_REDIRECTS.map(({ from, to }) => (
          <Route key={from} path={from} element={<LegacyRedirect to={to} />} />
        ))}

        {/* Gateway-level pages, with the global top navigation */}
        <Route element={<SiteLayout />}>
          <Route path={ROUTES.home} element={<LandingPageV2 />} />
          <Route path={ROUTES.becomeOrgOwner} element={<PublicOrgOwnerSignup />} />

          {/* Auth — guests only, except email links and change-password */}
          <Route
            path={ROUTES.login}
            element={
              <PublicRoute>
                <LoginForm />
              </PublicRoute>
            }
          />

          <Route
            path={ROUTES.register}
            element={
              <PublicRoute>
                <RegisterForm />
              </PublicRoute>
            }
          />
          <Route
            path={ROUTES.registerSuccess}
            element={
              <PublicRoute>
                <RegisterFormSuccess />
              </PublicRoute>
            }
          />

          <Route path={ROUTES.verifyEmail} element={<EmailVerification />} />

          <Route
            path={ROUTES.forgotPassword}
            element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            }
          />

          <Route path={ROUTES.resetPassword} element={<ResetPassword />} />

          <Route
            path={ROUTES.changePassword}
            element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            }
          />

          {/* PayMe wallet top-up result pages (PayMe redirects the browser here) */}
          <Route
            path={ROUTES.paymeSuccess}
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <PaymeResultPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.paymeFail}
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <PaymeResultPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          {/* General pages */}
          <Route path={ROUTES.about} element={<AboutPage />} />
          <Route path={ROUTES.privacy} element={<PrivacyPolicyPage />} />
          <Route path={ROUTES.contact} element={<ContactPage />} />

          {/* Catch all - 404 */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>

      <Footer />
    </BrowserRouter>
    </HelmetProvider>
  );
}