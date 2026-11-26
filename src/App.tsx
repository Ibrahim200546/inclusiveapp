import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingRouteLayout from "./components/landing/LandingRouteLayout";
import { lazy, Suspense, useEffect } from "react";

const GAME_URL = "/practice";
const LandingPage = lazy(() => import("./pages/LandingPage"));
const AboutPage = lazy(() => import("./pages/landing/AboutPage"));
const ProgramPage = lazy(() => import("./pages/landing/ProgramPage"));
const MaterialsPage = lazy(() => import("./pages/landing/MaterialsPage"));
const MethodologyPage = lazy(() => import("./pages/landing/MethodologyPage"));
const ResultsPage = lazy(() => import("./pages/landing/ResultsPage"));
const ContactPage = lazy(() => import("./pages/landing/ContactPage"));
const DownloadPage = lazy(() => import("./pages/landing/DownloadPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const EnterPractice = ({ fallback = false }: { fallback?: boolean }) => {
  useEffect(() => {
    window.location.replace(fallback ? GAME_URL + "/index.html" + window.location.search : GAME_URL);
  }, [fallback]);

  return null;
};

const App = () => (
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
            <Route path="/download" element={<DownloadPage />} />
          </Route>

          <Route path="/login" element={<EnterPractice />} />
          <Route path="/practice" element={<EnterPractice fallback />} />
          <Route path="/practice-new" element={<EnterPractice />} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
