import { Suspense, useEffect, useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import { LayoutDashboard, Newspaper, Settings, LogOut, BarChart3, MessageSquare, ClipboardList, Server, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import AdminSetup from "./AdminSetup";
import AdminLogin from "./AdminLogin";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/conversations", label: "Conversations", icon: MessageSquare },
  { href: "/admin/quiz-leads", label: "Quiz Leads", icon: ClipboardList },
  { href: "/admin/dominical", label: "Dominical", icon: Newspaper },
  { href: "/admin/backends", label: "Backends", icon: Server },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

type AdminStatus = "loading" | "setup_required" | "login" | "authenticated";

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const [status, setStatus] = useState<AdminStatus>("loading");
  const [menuOpen, setMenuOpen] = useState(false);
  const [desktop, setDesktop] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  const drawer = useRef<HTMLElement>(null);
  const menuToggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    const update = () => { setDesktop(media.matches); if (media.matches) setMenuOpen(false); };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!menuOpen || desktop) return;
    const panel = drawer.current;
    const controls = () => Array.from(panel?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])') || []).filter(el => el.getClientRects().length);
    controls()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setMenuOpen(false); menuToggle.current?.focus(); }
      if (event.key === 'Tab') {
        const items = controls(), first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, [menuOpen, desktop]);

  // Close the mobile drawer on navigation
  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/admin/status");
        const data = await res.json();

        if (data.setup_required) {
          setStatus("setup_required");
        } else if (!data.authenticated) {
          setStatus("login");
        } else {
          setStatus("authenticated");
        }
      } catch {
        setStatus("login");
      }
    };

    checkStatus();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // Even if request fails, clear local state
    }
    window.location.href = "/admin";
  };

  if (status === "loading") {
    return (
      <div className="admin-theme flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (status === "setup_required") {
    return (
      <div className="admin-theme">
        <AdminSetup />
      </div>
    );
  }

  if (status === "login") {
    return (
      <div className="admin-theme">
        <AdminLogin />
      </div>
    );
  }

  return (
    <div className="admin-theme flex h-dvh flex-col overflow-hidden md:flex-row">
      {/* Mobile top bar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b bg-gray-900 px-4 text-white md:hidden">
        <p className="flex items-center gap-2 text-lg font-semibold">
          <img src="/favicon.svg" alt="" className="h-6 w-6" />
          Admin Panel
        </p>
        <button
          type="button"
          ref={menuToggle}
          aria-controls="admin-sidebar"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-gray-800"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Overlay behind mobile drawer */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => { setMenuOpen(false); menuToggle.current?.focus(); }}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        id="admin-sidebar"
        ref={drawer}
        inert={!desktop && !menuOpen}
        role={!desktop && menuOpen ? "dialog" : undefined}
        aria-modal={!desktop && menuOpen ? true : undefined}
        aria-label="Admin menu"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(20rem,88vw)] shrink-0 -translate-x-full flex-col overflow-y-auto bg-gray-900 text-white transition-transform duration-200 md:static md:z-auto md:w-64 md:translate-x-0",
          menuOpen && "translate-x-0"
        )}
      >
        <div className="flex h-14 items-center justify-between px-6 md:h-16">
          <p className="flex items-center gap-2 text-lg font-semibold">
            <img src="/favicon.svg" alt="" className="h-6 w-6" />
            Admin Panel
          </p>
          <button
            type="button"
            onClick={() => { setMenuOpen(false); menuToggle.current?.focus(); }}
            aria-label="Close menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-gray-800 md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Admin navigation">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/admin"
                ? location === "/admin"
                : location.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-800 p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-gray-300 hover:bg-gray-800 hover:text-white"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main inert={menuOpen && !desktop} className="flex min-w-0 flex-1 flex-col overflow-auto [overflow-wrap:anywhere] bg-background p-4 sm:p-6 lg:p-8">
        <Suspense
          fallback={
            <div className="flex min-h-[50vh] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            </div>
          }
        >
          {children}
        </Suspense>
      </main>
    </div>
  );
}
