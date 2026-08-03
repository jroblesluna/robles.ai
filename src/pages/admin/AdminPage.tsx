import { useEffect, useState } from "react";
import AdminSetup from "./AdminSetup";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";
import AdminLayout from "./AdminLayout";

type AdminStatus = "loading" | "setup_required" | "login" | "authenticated";

export default function AdminPage() {
  const [status, setStatus] = useState<AdminStatus>("loading");

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

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (status === "setup_required") {
    return <AdminSetup />;
  }

  if (status === "login") {
    return <AdminLogin />;
  }

  return (
    <AdminLayout>
      <AdminDashboard />
    </AdminLayout>
  );
}
