import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import AboutPage from "./pages/landing/AboutPage";
import ProgramPage from "./pages/landing/ProgramPage";
import MaterialsPage from "./pages/landing/MaterialsPage";
import MethodologyPage from "./pages/landing/MethodologyPage";
import ResultsPage from "./pages/landing/ResultsPage";
import ContactPage from "./pages/landing/ContactPage";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import LandingRouteLayout from "./components/landing/LandingRouteLayout";
import { useEffect } from "react";
import { AuthProvider } from "./contexts/AuthContext";

const RedirectToOriginal = () => {
  useEffect(() => {
    window.location.href = "/original/index.html"; // Adjust to /original/ to avoid index.html
  }, []);
  return null;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<LandingRouteLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/program" element={<ProgramPage />} />
              <Route path="/materials" element={<MaterialsPage />} />
              <Route path="/methodology" element={<MethodologyPage />} />
              <Route path="/results" element={<ResultsPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            <Route path="/practice-new" element={<Index />} />
            <Route
              path="/practice"
              element={
                <RedirectToOriginal />
              }
            />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
