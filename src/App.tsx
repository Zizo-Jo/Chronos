import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import NotFound from "./pages/NotFound.tsx";
import AppLayout from "./components/layout/AppLayout.tsx";
import Dashboard from "./pages/app/Dashboard.tsx";
import Assistant from "./pages/app/Assistant.tsx";
import Study from "./pages/app/Study.tsx";
import Finance from "./pages/app/Finance.tsx";
import Nutrition from "./pages/app/Nutrition.tsx";
import CalendarPage from "./pages/app/CalendarPage.tsx";
import Focus from "./pages/app/Focus.tsx";
import Analytics from "./pages/app/Analytics.tsx";
import Settings from "./pages/app/Settings.tsx";
import Habits from "./pages/app/Habits.tsx";
import Now from "./pages/app/Now.tsx";
import HowItWorks from "./pages/HowItWorks.tsx";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/layout/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="assistant" element={<Assistant />} />
            <Route path="study" element={<Study />} />
            <Route path="finance" element={<Finance />} />
            <Route path="nutrition" element={<Nutrition />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="focus" element={<Focus />} />
            <Route path="analytics" element={<Analytics />} />
              <Route path="habits" element={<Habits />} />
            <Route path="now" element={<Now />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
