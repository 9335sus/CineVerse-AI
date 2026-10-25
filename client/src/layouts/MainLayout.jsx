import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function MainLayout() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8"><Outlet /></main>
      <footer className="border-t border-line py-6 text-center text-xs text-muted">
        CineVerse AI · Movie data from TMDB. This product is not endorsed or certified by TMDB.
      </footer>
    </div>
  );
}
