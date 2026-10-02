import { useEffect } from "react";
import { useLocation } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { trpc } from "./lib/trpc";
import { AppShell, LoadingState } from "./components/AppShell";
import { LoginPage, SignupPage } from "./pages/AuthPages";
import ChangePasswordPage from "./pages/ChangePassword";
import AdminDashboard, { AdminStoresPage, AdminUsersPage, UserDetailPage } from "./pages/AdminPages";
import StoresPage from "./pages/StoresPage";
import OwnerPage from "./pages/OwnerPage";

function LandingRedirect({ role }: { role: "user" | "admin" | "owner" }) { const [, setLocation] = useLocation(); useEffect(() => { setLocation(role === "admin" ? "/admin" : role === "owner" ? "/owner" : "/stores"); }, [role, setLocation]); return <LoadingState label="Opening your workspace…" />; }

function NotFoundPage() { return <div className="not-found"><span className="eyebrow">404 / Not found</span><h1>This view has moved.</h1><p>Use the workspace navigation to get back on track.</p></div>; }

function Router() {
  const [location] = useLocation(); const me = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const isAuthPage = location === "/login" || location === "/signup";
  if (isAuthPage) return location === "/signup" ? <SignupPage /> : <LoginPage />;
  if (me.isLoading) return <LoadingState label="Loading your workspace…" />;
  if (!me.data) { if (location !== "/login") window.history.replaceState({}, "", "/login"); return <LoginPage />; }
  const user = me.data;
  if (location === "/") return <AppShell user={user}><LandingRedirect role={user.role} /></AppShell>;
  let page: React.ReactNode;
  if (location === "/change-password") page = <ChangePasswordPage />;
  else if (user.role === "admin" && location === "/admin") page = <AdminDashboard />;
  else if (user.role === "admin" && location === "/admin/stores") page = <AdminStoresPage />;
  else if (user.role === "admin" && location === "/admin/users") page = <AdminUsersPage />;
  else if (user.role === "admin" && location.startsWith("/admin/users/")) page = <UserDetailPage id={Number(location.split("/").pop())} />;
  else if (user.role === "user" && location === "/stores") page = <StoresPage />;
  else if (user.role === "owner" && location === "/owner") page = <OwnerPage />;
  else page = <NotFoundPage />;
  return <AppShell user={user}>{page}</AppShell>;
}

function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>; }
export default App;
