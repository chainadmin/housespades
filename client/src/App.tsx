import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider, useAuth } from "@/lib/auth";
import Home from "@/pages/Home";
import Game from "@/pages/Game";
import Matchmaking from "@/pages/Matchmaking";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import Splash from "@/pages/Splash";
import Shop from "@/pages/Shop";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

function AuthenticatedApp() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      const publicPaths = ["/splash", "/login", "/signup", "/forgot-password"];
      if (!publicPaths.includes(location)) {
        setLocation("/splash");
      }
    }
  }, [user, isLoading, location, setLocation]);

  useEffect(() => {
    if (!isLoading && user) {
      const publicPaths = ["/splash", "/login", "/signup", "/forgot-password"];
      if (publicPaths.includes(location)) {
        setLocation("/");
      }
    }
  }, [user, isLoading, location, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/splash" component={Splash} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/" component={Home} />
      <Route path="/game" component={Game} />
      <Route path="/matchmaking" component={Matchmaking} />
      <Route path="/shop" component={Shop} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <AuthenticatedApp />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
