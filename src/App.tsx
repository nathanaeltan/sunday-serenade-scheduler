import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
// import AccessControl from "./components/AccessControl"; // Password-based option
import UrlAccessControl from "./components/UrlAccessControl"; // URL-based option

const queryClient = new QueryClient();

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status on app load
  useEffect(() => {
    const storedAuth = localStorage.getItem('worship-scheduler-auth');
    if (storedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleAccessGranted = () => {
    setIsAuthenticated(true);
  };

  // Show access control if not authenticated
  if (!isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          {/* Password-based access control */}
          {/* <AccessControl 
            onAccessGranted={handleAccessGranted}
            isAuthenticated={isAuthenticated}
          /> */}
          {/* URL-based access control */}
          <UrlAccessControl 
            onAccessGranted={handleAccessGranted}
            isAuthenticated={isAuthenticated}
          />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  // Show main app if authenticated
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <UrlAccessControl 
          onAccessGranted={handleAccessGranted}
          isAuthenticated={isAuthenticated}
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
