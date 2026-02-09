import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";

// Layout
import Layout from "./components/Layout";

// Pages
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Decisions from "./pages/Decisions";
import Learning from "./pages/Learning";
import Treasury from "./pages/Treasury";
import Activity from "./pages/Activity";
import Workers from "./pages/Workers";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: '#1a1a2e',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#fff',
        },
      }}
    />
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/decisions" element={<Decisions />} />
          <Route path="/learning" element={<Learning />} />
          <Route path="/treasury" element={<Treasury />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/workers" element={<Workers />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
