import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import InstallPrompt from "./components/pwa/InstallPrompt";
import FullScreenErrorOverlay from "./components/layout/FullScreenErrorOverlay";
import { ConnectionProvider } from "./contexts/ConnectionContext";
import { AuthProvider } from "./contexts/AuthContext";

/**
 * Global QueryClient — PRODUCTION MODE.
 *
 * - retry: 2 attempts before marking failed
 * - No optimistic success: mutations throw on error
 * - Global onError handlers log to console; ConnectionContext handles UI
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      staleTime: 30_000,
      throwOnError: false,
    },
    mutations: {
      retry: 0,
      throwOnError: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ConnectionProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <InstallPrompt />
          <FullScreenErrorOverlay />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ConnectionProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
