import { useState, useEffect, Suspense, lazy } from 'react';
import { Route, Switch, useLocation, useSearch } from 'wouter';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { queryClient } from './lib/queryClient';
import { Toaster } from '@/components/ui/toaster';
import NotFound from '@/pages/not-found';
import Home from '@/pages/Home';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { initAnalytics, trackPageView } from '@/lib/analytics';
import { useTranslation } from 'react-i18next';
import ChatbotWidget from '@/components/chat/ChatbotWidget';
import { useSEO } from '@/hooks/useSEO';
import { STATIC_PAGES, explicitLanguage } from '@shared/seoPolicy';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { DemoGate } from '@/components/demo/DemoGate';
import DemosSkeleton from '@/components/DemosSkeleton';
import QuizSkeleton from '@/components/quiz/QuizSkeleton';
import CareersSkeleton from '@/components/CareersSkeleton';
import { BlogListSkeleton, BlogPostSkeleton } from '@/components/BlogSkeleton';

// Lazy-loaded routes (code-split into separate chunks)
const BlogRoute = lazy(() => import('@/pages/BlogRoute'));
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
const TryObjectDetection = lazy(() => import('@/pages/TryObjectDetection'));
const TryEmotion = lazy(() => import('@/pages/TryEmotion'));
const TryTranscription = lazy(() => import('@/pages/TryTranscription'));
const TryChatbot = lazy(() => import('@/pages/TryChatbot'));
const TryDocExtract = lazy(() => import('@/pages/TryDocExtract'));
const TryForecast = lazy(() => import('@/pages/TryForecast'));
const TryTTS = lazy(() => import('@/pages/TryTTS'));
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings'));
const AdminDominicalList = lazy(() => import('@/pages/admin/AdminDominicalList'));
const AdminDominicalDetail = lazy(() => import('@/pages/admin/AdminDominicalDetail'));
const AdminAnalytics = lazy(() => import('@/pages/admin/AdminAnalytics'));
const AdminConversationList = lazy(() => import('@/pages/admin/AdminConversationList'));
const AdminConversationDetail = lazy(() => import('@/pages/admin/AdminConversationDetail'));
const AdminQuizLeads = lazy(() => import('@/pages/admin/AdminQuizLeads'));
const AdminContactSubmissions = lazy(() => import('@/pages/admin/AdminContactSubmissions'));
const AdminBackends = lazy(() => import('@/pages/admin/AdminBackends'));
const AdminApiKeys = lazy(() => import('@/pages/admin/AdminApiKeys'));
const AdminMonitoring = lazy(() => import('@/pages/admin/AdminMonitoring'));

function App({ client = queryClient }: { client?: QueryClient } = {}) {
  const [clientReady, setClientReady] = useState(false);
  useEffect(() => { setClientReady(true); }, []);
  const search = useSearch();
  const [location] = useLocation(); // 👈 de wouter
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { i18n } = useTranslation();

  const isAdminRoute = location.startsWith('/admin');

  // Indexable static URLs declare their language; stored/browser preferences cannot override them.
  useEffect(() => {
    if (STATIC_PAGES[location]) {
      const lang = explicitLanguage(new URLSearchParams(search).get('lang')) ?? 'en';
      if (i18n.language !== lang) void i18n.changeLanguage(lang);
    }
  }, [location, search, i18n]);

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

  // Scroll to top on new navigation, restore position on back/forward.
  useScrollRestoration(location);

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
      <QueryClientProvider client={client}>
        <MotionConfig reducedMotion="user">
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
              <Route path="/admin/contact-submissions" component={AdminContactSubmissions} />
              <Route path="/admin/quiz-leads" component={AdminQuizLeads} />
              <Route path="/admin/backends" component={AdminBackends} />
              <Route path="/admin/api-keys" component={AdminApiKeys} />
              <Route path="/admin/monitoring" component={AdminMonitoring} />
              <Route component={NotFound} />
            </Switch>
          </AdminLayout>
        </Suspense>
        <Toaster />
        </MotionConfig>
      </QueryClientProvider>
    );
  }

  // Public routes — with Header, Footer, and ChatbotWidget
  return (
    <QueryClientProvider client={client}>
      <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen flex-col">
        <Header
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
        <main className="flex-grow pt-[var(--header-h)]">
          <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>}>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/demos">{() => <Suspense fallback={<DemosSkeleton />}><Demos /></Suspense>}</Route>
              <Route path="/careers">{() => <Suspense fallback={<CareersSkeleton />}><Careers /></Suspense>}</Route>
              <Route path="/apply" component={Apply} />
              <Route path="/try-identity">{() => <DemoGate api="identity"><TryIdentity /></DemoGate>}</Route>
              <Route path="/try-langchain">{() => <DemoGate api="langchain"><TryLangChain /></DemoGate>}</Route>
              <Route path="/try-rag">{() => <DemoGate api="rag"><TryRAG /></DemoGate>}</Route>
              <Route path="/try-medical" component={TryMedical} />
              <Route path="/try-object-detection" component={TryObjectDetection} />
              <Route path="/try-emotion" component={TryEmotion} />
              <Route path="/try-transcription">{() => <DemoGate api="transcription"><TryTranscription /></DemoGate>}</Route>
              <Route path="/try-chatbot">{() => <DemoGate api="chatbot"><TryChatbot /></DemoGate>}</Route>
              <Route path="/try-docextract">{() => <DemoGate api="docextract"><TryDocExtract /></DemoGate>}</Route>
              <Route path="/try-forecast" component={TryForecast} />
              <Route path="/try-tts">{() => <DemoGate api="tts"><TryTTS /></DemoGate>}</Route>
              <Route path="/get-started" component={Landing} />
              <Route path="/diagnostico-ia">{() => <Suspense fallback={<QuizSkeleton />}><Quiz /></Suspense>}</Route>
              <Route path="/otp" component={OTP} />
              {/* Single route for /blog and /blog/:slug so BlogList stays
                  mounted while the in-page modal pushes a /blog/:slug URL.
                  BlogRoute decides list+modal vs. the full cold-load post. */}
              <Route path="/blog/:slug?">{(params) => <Suspense fallback={params.slug ? <BlogPostSkeleton /> : <BlogListSkeleton />}><BlogRoute /></Suspense>}</Route>
              <Route component={NotFound} />
            </Switch>
          </Suspense>
        </main>
        <Footer />
        {clientReady && <ChatbotWidget hideForMobileMenu={isMobileMenuOpen} />}
        <Toaster />
      </div>
      </MotionConfig>
    </QueryClientProvider>
  );
}

export default App;
