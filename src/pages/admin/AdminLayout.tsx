import { Suspense, useEffect, useState } from "react";
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
    <div className="admin-theme flex h-screen flex-col overflow-hidden md:flex-row">
      {/* Mobile top bar */}
      <div className="flex h-14 items-center justify-between border-b bg-gray-900 px-4 text-white md:hidden">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <img src="/favicon.svg" alt="" className="h-6 w-6" />
          Admin Panel
        </h1>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className="rounded-md p-2 hover:bg-gray-800"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Overlay behind mobile drawer */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-full -translate-x-full flex-col bg-gray-900 text-white transition-transform duration-200 md:static md:z-auto md:w-64 md:translate-x-0",
          menuOpen && "translate-x-0"
        )}
      >
        <div className="flex h-14 items-center justify-between px-6 md:h-16">
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <img src="/favicon.svg" alt="" className="h-6 w-6" />
            Admin Panel
          </h1>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="rounded-md p-1 hover:bg-gray-800 md:hidden"
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
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
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
      <main className="flex flex-1 flex-col overflow-auto bg-background p-4 sm:p-6 lg:p-8">
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
