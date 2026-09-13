import { useState, useEffect, Suspense, lazy } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { Toaster } from '@/components/ui/toaster';
import NotFound from '@/pages/not-found';
import Home from '@/pages/Home';
import BlogList from '@/pages/BlogList';
import BlogPost from '@/pages/BlogPost';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { initAnalytics, trackPageView } from '@/lib/analytics';
import { useTranslation } from 'react-i18next';
import ChatbotWidget from '@/components/chat/ChatbotWidget';
import { useSEO } from '@/hooks/useSEO';

// Lazy-loaded routes (code-split into separate chunks)
const Careers = lazy(() => import('@/pages/Careers'));
const Apply = lazy(() => import('@/pages/Apply'));
const OTP = lazy(() => import('@/pages/OTP'));
const Landing = lazy(() => import('@/pages/Landing'));
const Quiz = lazy(() => import('@/pages/Quiz'));
const Demos = lazy(() => import('@/pages/Demos'));
const TryIdentity = lazy(() => import('@/pages/TryIdentity'));
const TryLangChain = lazy(() => import('@/pages/TryLangChain'));
const TryRAG = lazy(() => import('@/pages/TryRAG'));
const TryMedical = lazy(() => import('@/pages/TryMedical'));
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings'));
const AdminDominicalList = lazy(() => import('@/pages/admin/AdminDominicalList'));
const AdminDominicalDetail = lazy(() => import('@/pages/admin/AdminDominicalDetail'));
const AdminAnalytics = lazy(() => import('@/pages/admin/AdminAnalytics'));
const AdminConversationList = lazy(() => import('@/pages/admin/AdminConversationList'));
const AdminConversationDetail = lazy(() => import('@/pages/admin/AdminConversationDetail'));
const AdminQuizLeads = lazy(() => import('@/pages/admin/AdminQuizLeads'));

function App() {
  const [location] = useLocation(); // 👈 de wouter
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { i18n } = useTranslation();

  const isAdminRoute = location.startsWith('/admin');

  // Initialize Analytics once when the app mounts
  useEffect(() => {
    initAnalytics();
  }, []);

  // SEO: dynamic title and meta per route
  useSEO();

  // Track page views on location change
  useEffect(() => {
    trackPageView(location); // 👈 en wouter "location" ya es un string con la ruta
  }, [location]);

  // Close mobile menu when location changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Set HTML lang when i18n changes
  useEffect(() => {
    if (i18n.language) {
      document.documentElement.lang = i18n.language;
    }
  }, [i18n.language]);

  // Admin routes — no Header, Footer, or ChatbotWidget.
  // AdminLayout mounts once for the whole admin section (it owns the
  // setup/login/authenticated gating), so switching between sub-pages swaps
  // only the inner content instead of remounting the sidebar and re-running
  // the auth check — which used to look like a full page reload.
  if (isAdminRoute) {
    return (
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>}>
          <AdminLayout>
            <Switch>
              <Route path="/admin" component={AdminDashboard} />
              <Route path="/admin/settings" component={AdminSettings} />
              <Route path="/admin/dominical" component={AdminDominicalList} />
              <Route path="/admin/dominical/:id" component={AdminDominicalDetail} />
              <Route path="/admin/analytics" component={AdminAnalytics} />
              <Route path="/admin/conversations/:id" component={AdminConversationDetail} />
              <Route path="/admin/conversations" component={AdminConversationList} />
              <Route path="/admin/quiz-leads" component={AdminQuizLeads} />
              <Route component={NotFound} />
            </Switch>
          </AdminLayout>
        </Suspense>
        <Toaster />
      </QueryClientProvider>
    );
  }

  // Public routes — with Header, Footer, and ChatbotWidget
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        <Header
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
        <main className="flex-grow pt-[68px]">
          <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>}>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/demos" component={Demos} />
              <Route path="/careers" component={Careers} />
              <Route path="/apply" component={Apply} />
              <Route path="/try-identity" component={TryIdentity} />
              <Route path="/try-langchain" component={TryLangChain} />
              <Route path="/try-rag" component={TryRAG} />
              <Route path="/try-medical" component={TryMedical} />
              <Route path="/get-started" component={Landing} />
              <Route path="/diagnostico-ia" component={Quiz} />
              <Route path="/otp" component={OTP} />
              <Route path="/blog" component={BlogList} />
              <Route path="/blog/:slug" component={BlogPost} />
              <Route component={NotFound} />
            </Switch>
          </Suspense>
        </main>
        <Footer />
        <ChatbotWidget hideForMobileMenu={isMobileMenuOpen} />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;
