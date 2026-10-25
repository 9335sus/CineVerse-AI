import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Clapperboard, Menu, Moon, Search, Sun, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { logout } from '../features/auth/authSlice';
import { toggleTheme } from '../features/theme/themeSlice';

const cls = ({ isActive }) => `rounded-md px-2.5 py-2 text-sm font-medium transition whitespace-nowrap ${isActive ? 'text-accent' : 'text-muted hover:text-ink'}`;

export default function Navbar() {
  const { user } = useSelector((s) => s.auth);
  const mode = useSelector((s) => s.theme.mode);
  const dispatch = useDispatch();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const items = [['/search', 'Discover'], ...(user ? [['/mood', 'Mood Match'], ['/rooms', 'CineSync'], ['/planner', 'Planner'], ['/stories', 'Stories'], ['/dashboard', 'My DNA'], ['/watchlist', 'Library'], ['/profile', 'Profile']] : []), ...(user?.role === 'admin' ? [['/admin', 'Admin']] : [])];
  const submit = (e) => { e.preventDefault(); if (q.trim()) { nav(`/search?query=${encodeURIComponent(q.trim())}`); setOpen(false); } };
  const doLogout = async () => { await dispatch(logout()); toast.success('Signed out'); nav('/'); setOpen(false); };
  const links = items.map(([to, label]) => <NavLink key={to} to={to} className={cls} onClick={() => setOpen(false)}>{label}</NavLink>);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2 font-display text-xl font-extrabold"><Clapperboard className="h-6 w-6 text-glow" /> CineVerse<span className="text-accent">AI</span></Link>
        <nav className="ml-2 hidden items-center lg:flex" aria-label="Main">{links}</nav>
        <form onSubmit={submit} className="ml-auto hidden w-48 xl:block" role="search">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search movies" aria-label="Search movies" className="input !pl-9" /></div>
        </form>
        <button aria-label="Toggle theme" onClick={() => dispatch(toggleTheme())} className="btn-ghost ml-auto !p-2 xl:ml-0">{mode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
        <div className="hidden items-center gap-2 lg:flex">
          {user ? <button onClick={doLogout} className="btn-ghost">Sign out</button> : (<><Link to="/login" className="btn-ghost">Sign in</Link><Link to="/register" className="btn-primary">Join free</Link></>)}
        </div>
        <button aria-label="Menu" aria-expanded={open} className="btn-ghost !p-2 lg:hidden" onClick={() => setOpen(!open)}>{open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}</button>
      </div>
      {open && (
        <div className="border-t border-line px-4 pb-4 lg:hidden">
          <form onSubmit={submit} className="my-3" role="search"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search movies" aria-label="Search movies" className="input" /></form>
          <nav className="flex flex-col" aria-label="Mobile">{links}</nav>
          <div className="mt-3 flex gap-2">
            {user ? <button onClick={doLogout} className="btn-ghost w-full">Sign out</button> : (<><Link to="/login" onClick={() => setOpen(false)} className="btn-ghost flex-1">Sign in</Link><Link to="/register" onClick={() => setOpen(false)} className="btn-primary flex-1">Join free</Link></>)}
          </div>
        </div>
      )}
    </header>
  );
}
