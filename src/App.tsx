import { useState, useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Careers from "@/pages/Careers";
import Apply from "@/pages/Apply";
import OTP from "@/pages/OTP";
import BlogList from "@/pages/BlogList";
import BlogPost from "@/pages/BlogPost";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { initAnalytics } from "@/lib/analytics";
import { useTranslation } from "react-i18next";
import TryIdentity from "@/pages/TryIdentity";
import TryLangChain from "@/pages/TryLangChain";
import TryRAG from "@/pages/TryRAG";
import TryMedical from "@/pages/TryMedical";

function App() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Initialize Analytics once when the app mounts
  useEffect(() => {
    initAnalytics(); // 👈 Llamada para inicializar
  }, []); // 👈 Solo una vez al montar (array vacío)

  // Close mobile menu when location changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const { i18n } = useTranslation();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    if (i18n.language) {
      document.documentElement.lang = i18n.language;
    }
  }, [i18n.language]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        <Header isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <main className="flex-grow pt-[68px]">
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/careers" component={Careers} />
            <Route path="/apply" component={Apply} />
            <Route path="/try-identity" component={TryIdentity} />
            <Route path="/try-langchain" component={TryLangChain} />
            <Route path="/try-rag" component={TryRAG} />
            <Route path="/try-medical" component={TryMedical} />
            <Route path="/otp" component={OTP} />
            <Route path="/blog" component={BlogList} />
            <Route path="/blog/:slug" component={BlogPost} />
            <Route component={NotFound} />
          </Switch>
        </main>
        <Footer />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;
