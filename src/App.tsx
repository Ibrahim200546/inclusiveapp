import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingRouteLayout from "./components/landing/LandingRouteLayout";
import { lazy, Suspense, useEffect } from "react";
import { AuthProvider } from "./contexts/AuthContext";

const ORIGINAL_GAME_URL = "/original/index2.html";
const LandingPage = lazy(() => import("./pages/LandingPage"));
const AboutPage = lazy(() => import("./pages/landing/AboutPage"));
const ProgramPage = lazy(() => import("./pages/landing/ProgramPage"));
const MaterialsPage = lazy(() => import("./pages/landing/MaterialsPage"));
const MethodologyPage = lazy(() => import("./pages/landing/MethodologyPage"));
const ResultsPage = lazy(() => import("./pages/landing/ResultsPage"));
const ContactPage = lazy(() => import("./pages/landing/ContactPage"));
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const RedirectToOriginal = () => {
  useEffect(() => {
    window.location.replace(ORIGINAL_GAME_URL);
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
          <Suspense fallback={null}>
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
              </Route>

              <Route path="/practice" element={<RedirectToOriginal />} />
              <Route path="/practice-new" element={<RedirectToOriginal />} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
