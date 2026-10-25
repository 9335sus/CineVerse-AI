import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { bootstrap } from './features/auth/authSlice';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import AuthPage from './pages/AuthPage';
import Search from './pages/Search';
import MovieDetail from './pages/MovieDetail';
import Watchlist from './pages/Watchlist';
import Profile from './pages/Profile';
import MoodMatcher from './pages/MoodMatcher';
import Rooms from './pages/Rooms';
import RoomPage from './pages/RoomPage';
import Planner from './pages/Planner';
import Stories from './pages/Stories';
import StoryView from './pages/StoryView';
import Discussion from './pages/Discussion';
import { Skeleton } from './components/States';
import NotFound from './pages/NotFound';

// Recharts is heavy: only load it for the pages that draw charts.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Admin = lazy(() => import('./pages/Admin'));
const lazyPage = (el) => <Suspense fallback={<Skeleton className="h-72" />}>{el}</Suspense>;

export default function App() {
  const dispatch = useDispatch();
  useEffect(() => { dispatch(bootstrap()); }, [dispatch]);
  return (
    <>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<AuthPage mode="login" />} />
          <Route path="register" element={<AuthPage mode="register" />} />
          <Route path="search" element={<Search />} />
          <Route path="movie/:id" element={<MovieDetail />} />
          <Route path="watchlist" element={<ProtectedRoute><Watchlist /></ProtectedRoute>} />
          <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="mood" element={<ProtectedRoute><MoodMatcher /></ProtectedRoute>} />
          <Route path="rooms" element={<ProtectedRoute><Rooms /></ProtectedRoute>} />
          <Route path="rooms/:code" element={<ProtectedRoute><RoomPage /></ProtectedRoute>} />
          <Route path="planner" element={<ProtectedRoute><Planner /></ProtectedRoute>} />
          <Route path="stories" element={<ProtectedRoute><Stories /></ProtectedRoute>} />
          <Route path="stories/:id" element={<ProtectedRoute><StoryView /></ProtectedRoute>} />
          <Route path="discuss/:id" element={<ProtectedRoute><Discussion /></ProtectedRoute>} />
          <Route path="dashboard" element={<ProtectedRoute>{lazyPage(<Dashboard />)}</ProtectedRoute>} />
          <Route path="admin" element={<ProtectedRoute role="admin">{lazyPage(<Admin />)}</ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toaster position="bottom-right" toastOptions={{ style: { background: 'rgb(var(--raised))', color: 'rgb(var(--ink))', border: '1px solid rgb(var(--line))' } }} />
    </>
  );
}
