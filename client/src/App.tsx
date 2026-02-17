import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Navigation } from "./components/Navigation";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Garage from "./pages/Garage";
import Passport from "./pages/Passport";
import Admin from "./pages/Admin";

import Onboarding from "./pages/Onboarding";
import { DashboardHome } from "./pages/DashboardHome";
import Login from "./pages/Login";
import ClubCertificatePage from "./pages/ClubCertificatePage";
import DashboardLayout from "./components/DashboardLayout";
import { useAuth } from "./_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

function Router() {
  const { user, loading: isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (user && user.membershipStatus === 'pending' && location !== '/onboarding' && location !== '/login') {
      setLocation('/onboarding');
    }
  }, [user, location, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  // Prevent flash while redirecting (logic simplified)
  if (user && user.membershipStatus === 'pending' && location !== '/onboarding' && location !== '/login') {
    return <div className="bg-slate-950 min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>;
  }

  return (
    <>
      {/* Hide Navigation for pending users */}
      {user?.membershipStatus !== 'pending' && <Navigation />}
      <Switch>
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/" component={Home} />
        <Route path="/dashboard">
          <DashboardLayout>
            <DashboardHome />
          </DashboardLayout>
        </Route>
        <Route path="/login" component={Login} />
        <Route path="/club/:id/certificate" component={ClubCertificatePage} />
        <Route path="/profile" component={Profile} />
        <Route path="/garage" component={Garage} />
        <Route path="/passport" component={Passport} />
        <Route path="/admin" component={Admin} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
