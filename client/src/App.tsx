import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import BoardPage from "./pages/board";
import { useHashLocation } from "@/hooks/use-hash-location";
import { AnimatePresence } from "framer-motion";
import { LanguageProvider } from "@/lib/i18n";

function AnimatedRoutes() {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Switch location={location} key={location}>
        <Route path="/" component={BoardPage} />
        <Route path="/folder/:id" component={BoardPage} />
        <Route component={NotFound} />
      </Switch>
    </AnimatePresence>
  );
}

function Router() {
  return (
    <WouterRouter hook={useHashLocation}>
      <AnimatedRoutes />
    </WouterRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
