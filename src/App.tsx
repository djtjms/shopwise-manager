import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute, SuperAdminRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Inventory from "./pages/Inventory";
import Orders from "./pages/Orders";
import Accounting from "./pages/Accounting";
import Customers from "./pages/Customers";
import Suppliers from "./pages/Suppliers";
import Categories from "./pages/Categories";
import SettingsPage from "./pages/Settings";
import UserManagement from "./pages/UserManagement";
import PurchaseOrders from "./pages/PurchaseOrders";
import Reports from "./pages/Reports";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="*" element={
              <ProtectedRoute>
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/pos" element={<POS />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/purchase-orders" element={<PurchaseOrders />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/accounting" element={<Accounting />} />
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/suppliers" element={<Suppliers />} />
                    <Route path="/categories" element={<Categories />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/users" element={<SuperAdminRoute><UserManagement /></SuperAdminRoute>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </AppLayout>
              </ProtectedRoute>
            } />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
