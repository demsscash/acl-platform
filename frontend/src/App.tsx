import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/auth.store';
import { useSyncStore } from './stores/sync.store';
import { ToastProvider } from './components/ui/Toast';
import { ThemeProvider } from './contexts/ThemeContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CamionsPage from './pages/CamionsPage';
import ChauffeursPage from './pages/ChauffeursPage';
import CarburantPage from './pages/CarburantPage';
import PiecesPage from './pages/PiecesPage';
import TransportPage from './pages/TransportPage';
import GpsPage from './pages/GpsPage';
import AlertesPage from './pages/AlertesPage';
import LocationPage from './pages/LocationPage';
import PneumatiquesPage from './pages/PneumatiquesPage';
import ExportPage from './pages/ExportPage';
import UsersPage from './pages/UsersPage';
import PannesPage from './pages/PannesPage';
import FournisseursPage from './pages/FournisseursPage';
import ClientsPage from './pages/ClientsPage';
import EntretienPage from './pages/EntretienPage';
import CaissesPage from './pages/CaissesPage';
import ConfigPage from './pages/ConfigPage';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Composant interne qui utilise les hooks
function AppContent() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const initSync = useSyncStore((state) => state.initSync);

  useEffect(() => {
    // Initialiser l'authentification au démarrage
    initializeAuth();
    // Initialiser la synchronisation offline
    initSync();
  }, [initializeAuth, initSync]);

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Routes with MainLayout */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard - Accessible à tous */}
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Camions - Selon permissions */}
        <Route
          path="/camions"
          element={
            <ProtectedRoute requiredPermission="camions">
              <CamionsPage />
            </ProtectedRoute>
          }
        />

        {/* Chauffeurs - Selon permissions */}
        <Route
          path="/chauffeurs"
          element={
            <ProtectedRoute requiredPermission="chauffeurs">
              <ChauffeursPage />
            </ProtectedRoute>
          }
        />

        {/* Clients - DIRECTION et COORDINATEUR */}
        <Route
          path="/clients"
          element={
            <ProtectedRoute requiredPermission="clients">
              <ClientsPage />
            </ProtectedRoute>
          }
        />

        {/* Carburant - Selon permissions */}
        <Route
          path="/carburant"
          element={
            <ProtectedRoute requiredPermission="carburant">
              <CarburantPage />
            </ProtectedRoute>
          }
        />

        {/* Pièces - Selon permissions */}
        <Route
          path="/pieces"
          element={
            <ProtectedRoute requiredPermission="pieces">
              <PiecesPage />
            </ProtectedRoute>
          }
        />

        {/* Transport - DIRECTION et COORDINATEUR seulement */}
        <Route
          path="/transport"
          element={
            <ProtectedRoute requiredPermission="transport">
              <TransportPage />
            </ProtectedRoute>
          }
        />

        {/* Location - DIRECTION et COORDINATEUR seulement */}
        <Route
          path="/location"
          element={
            <ProtectedRoute requiredPermission="location">
              <LocationPage />
            </ProtectedRoute>
          }
        />

        {/* Pneumatiques - DIRECTION et COORDINATEUR seulement */}
        <Route
          path="/pneumatiques"
          element={
            <ProtectedRoute requiredPermission="pneumatiques">
              <PneumatiquesPage />
            </ProtectedRoute>
          }
        />

        {/* Export - DIRECTION et COORDINATEUR seulement */}
        <Route
          path="/export"
          element={
            <ProtectedRoute requiredPermission="export">
              <ExportPage />
            </ProtectedRoute>
          }
        />

        {/* GPS - DIRECTION et COORDINATEUR seulement */}
        <Route
          path="/gps"
          element={
            <ProtectedRoute requiredPermission="gps">
              <GpsPage />
            </ProtectedRoute>
          }
        />

        {/* Alertes - Accessible à tous */}
        <Route
          path="/alertes"
          element={
            <ProtectedRoute requiredPermission="alertes">
              <AlertesPage />
            </ProtectedRoute>
          }
        />

        {/* Pannes - Selon permissions */}
        <Route
          path="/pannes"
          element={
            <ProtectedRoute requiredPermission="pannes">
              <PannesPage />
            </ProtectedRoute>
          }
        />

        {/* Entretien - Selon permissions */}
        <Route
          path="/entretien"
          element={
            <ProtectedRoute requiredPermission="entretien">
              <EntretienPage />
            </ProtectedRoute>
          }
        />

        {/* Fournisseurs - DIRECTION et COORDINATEUR seulement */}
        <Route
          path="/fournisseurs"
          element={
            <ProtectedRoute requiredPermission="fournisseurs">
              <FournisseursPage />
            </ProtectedRoute>
          }
        />

        {/* Users - ADMIN seulement */}
        <Route
          path="/users"
          element={
            <ProtectedRoute requiredPermission="users">
              <UsersPage />
            </ProtectedRoute>
          }
        />

        {/* Caisses - ADMIN et COMPTABLE */}
        <Route
          path="/caisses"
          element={
            <ProtectedRoute requiredPermission="caisses">
              <CaissesPage />
            </ProtectedRoute>
          }
        />

        {/* Configuration - ADMIN et DIRECTION */}
        <Route
          path="/config"
          element={
            <ProtectedRoute requiredPermission="config">
              <ConfigPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* 404 - Redirect to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
