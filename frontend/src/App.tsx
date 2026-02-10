import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Workers from "./pages/Workers";
import Treasury from "./pages/Treasury";
import Activity from "./pages/Activity";
import Decisions from "./pages/Decisions";
import Learning from "./pages/Learning";
import Settings from "./pages/Settings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/workers" element={<Workers />} />
        <Route path="/treasury" element={<Treasury />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/decisions" element={<Decisions />} />
        <Route path="/learning" element={<Learning />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
