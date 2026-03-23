import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Organisations from "@/pages/Organisations";
import OrganisationDetail from "@/pages/OrganisationDetail";
import Contacts from "@/pages/Contacts";
import Engagements from "@/pages/Engagements";
import Tasks from "@/pages/Tasks";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/organisations" component={Organisations} />
      <Route path="/organisations/:id" component={OrganisationDetail} />
      <Route path="/contacts" component={Contacts} />
      <Route path="/engagements" component={Engagements} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AppLayout>
          <Router />
        </AppLayout>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
