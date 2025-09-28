import './App.css'
import { HashRouter , Routes, Route, Outlet } from 'react-router-dom';
import { SnackbarProvider } from '@/context/SnackbarProvider';
import { AuthProvider } from '@/context/AuthProvider';
import { MainLayout } from '@/components/layout/MainLayout';
import { GuestRoute, UserRoute } from './routes/RolesRoutes';

import Error404 from '@/pages/error/Error404';
import SocialLogin from '@/pages/oauth/SocialLogin';
import Login from '@/pages/oauth/Login';
import Dashboard from '@/pages/dashboard/Dashboard';
import ClientsList from '@/pages/clients/ClientsList';
import ClientDetail from './pages/clients/ClientDetail';
import ClientCreate from './pages/clients/ClientCreate';
import ClientEdit from './pages/clients/ClientEdit';
import WorkersList from '@/pages/workers/WorkersList';
import WorkerDetail from '@/pages/workers/WorkerDetail';
import WorkerCreate from '@/pages/workers/WorkerCreate';
import WorkerEdit from '@/pages/workers/WorkerEdit';
import CollectionZonesList from '@/pages/collectionZones/CollectionZonesList';
import RoutesList from '@/pages/routes/RoutesList';
import CollectionsList from '@/pages/collections/CollectionsList';
import CollectionCreate from '@/pages/collections/CollectionCreate';
import Stats from '@/pages/stats/Stats';

function AppContent() {
  return (
    <Routes>
      {/* Layout vacío para públicas */}
      <Route element={<Outlet />}>
        <Route element={<GuestRoute />}>
          <Route path="/socialLogin" element={<SocialLogin />} />
          <Route path="/login" element={<Login />} />
        </Route>
      </Route>

      {/* Rutas protegidas con layout */}
      <Route
        element={
          <UserRoute>
            <MainLayout>
              <Outlet />
            </MainLayout>
          </UserRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clients" element={<ClientsList />} />
        <Route path="/clients/:id" element={<ClientDetail />} />
        <Route path="/clients/new" element={<ClientCreate />} />
        <Route path="/clients/:id/edit" element={<ClientEdit />} />
        <Route path="/workers" element={<WorkersList />} />
        <Route path="/workers/:id" element={<WorkerDetail />} />
        <Route path="/workers/new" element={<WorkerCreate />} />
        <Route path="/workers/:id/edit" element={<WorkerEdit />} />
        <Route path="/collection-zones" element={<CollectionZonesList />} />
        <Route path="/routes" element={<RoutesList />} />
        <Route path="/collections" element={<CollectionsList />} />
        <Route path="/collections/new" element={<CollectionCreate />} />
        <Route path="/collections/:id/new" element={<CollectionCreate />} />
        <Route path="/stats" element={<Stats />} />
      </Route>

      {/* Fallback general */}
      <Route path="/" element={<SocialLogin />} />
      <Route path="*" element={<Error404 />} />
    </Routes>

  );
}

function App() {
  return (
    <HashRouter>
      <SnackbarProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </SnackbarProvider>
    </HashRouter>
  );
}

export default App;