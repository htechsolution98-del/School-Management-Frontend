"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  GraduationCap,
  CreditCard,
  LayoutDashboard,
  Sparkles,
  MessageSquare,
  TrendingUp,
  Smartphone,
  Cpu,
  CheckSquare,
  LayoutGrid,
  HelpCircle,
  ListCollapse,
} from "lucide-react";
import { AppShell, type SidebarLink } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const menuItems: SidebarLink[] = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
  { title: "Features Manager", href: "/admin/features", icon: GraduationCap },
  { title: "Modules Manager", href: "/admin/modules", icon: CreditCard },
  { title: "Why Choose Us", href: "/admin/why-choose-us", icon: Sparkles },
  { title: "Stats Manager", href: "/admin/stats", icon: TrendingUp },
  { title: "Mobile App Roles", href: "/admin/mobile-app", icon: Smartphone },
  { title: "Mobile Infrastructure", href: "/admin/mobile-infrastructure", icon: Cpu },
  { title: "Modules Hero Tags", href: "/admin/modules-hero-tags", icon: CheckSquare },
  { title: "Modules Grid Cards", href: "/admin/modules-grid", icon: LayoutGrid },
  { title: "Testimonials Manager", href: "/admin/testimonials", icon: Sparkles },
  { title: "About Manager", href: "/admin/about", icon: Sparkles },
  { title: "Why Choose Us", href: "/admin/why-choose", icon: HelpCircle },
  { title: "Counters Manager", href: "/admin/stats", icon: TrendingUp },
  { title: "Mobile Ecosystem", href: "/admin/mobile", icon: Smartphone },
  { title: "Capabilities Manager", href: "/admin/capabilities", icon: ListCollapse },
  { title: "Contact Inquiries", href: "/admin/inquiries", icon: MessageSquare },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const session = localStorage.getItem("admin_session");
    setIsLoggedIn(session === "true");
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem("admin_session", "true");
        setIsLoggedIn(true);
        toast.success("Welcome back, Admin!");
      } else {
        toast.error(data.message || "Invalid credentials");
      }
    } catch {
      // Frontend fallback verification in case the API is unreachable.
      if (username === "admin" && password === "admin123") {
        localStorage.setItem("admin_session", "true");
        setIsLoggedIn(true);
        toast.success("Welcome back, Admin! (Client Auth)");
      } else {
        toast.error("Invalid username or password");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_session");
    setIsLoggedIn(false);
    toast.success("Logged out successfully");
    router.push("/admin");
  };

  // Prevent flash before mounted.
  if (isLoggedIn === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D496C] border-t-transparent" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-2">
              <img src="/logo.png" alt="Logo" className="h-12 w-auto object-contain" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Vidya<span className="text-[#1D496C]">Sanchalan</span>
            </h2>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              School ERP Admin Panel
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700" htmlFor="username">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter admin username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="border-slate-200 focus:border-[#1D496C] focus:ring-[#1D496C]/20"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700" htmlFor="password">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-slate-200 focus:border-[#1D496C] focus:ring-[#1D496C]/20"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full rounded-lg bg-[#1D496C] font-semibold text-white transition-colors hover:bg-[#163b58]"
            >
              {isSubmitting ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "Log In"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Secure admin log module configured on local ERP systems.
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShell links={menuItems} roleTitle="Admin Workspace" userName="Administrator" onSignOut={handleLogout}>
      {children}
    </AppShell>
  );
}