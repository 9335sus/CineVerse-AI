import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { login, register, clearError } from '../features/auth/authSlice';

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';
  const dispatch = useDispatch();
  const nav = useNavigate();
  const loc = useLocation();
  const { user, loading, error } = useSelector((s) => s.auth);
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [local, setLocal] = useState('');

  useEffect(() => { dispatch(clearError()); }, [mode, dispatch]);
  useEffect(() => { if (user) nav(loc.state?.from || '/', { replace: true }); }, [user, nav, loc.state]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setLocal('');
    if (!isLogin && f.name.trim().length < 2) return setLocal('Enter your name (at least 2 characters)');
    if (f.password.length < 8) return setLocal('Password must be at least 8 characters');
    const res = await dispatch(isLogin ? login({ email: f.email, password: f.password }) : register(f));
    if (!res.error) toast.success(isLogin ? 'Welcome back' : 'Account created');
  };

  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl border border-line bg-surface p-8">
      <h1 className="text-3xl font-extrabold">{isLogin ? 'Sign in' : 'Create your account'}</h1>
      <p className="mt-1 text-sm text-muted">{isLogin ? 'Pick up where you left off.' : 'Track movies, write reviews, and get picks that fit your mood.'}</p>
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        {!isLogin && (<div><label className="label" htmlFor="name">Name</label><input id="name" className="input" value={f.name} onChange={set('name')} autoComplete="name" /></div>)}
        <div><label className="label" htmlFor="email">Email</label><input id="email" type="email" className="input" value={f.email} onChange={set('email')} autoComplete="email" required /></div>
        <div><label className="label" htmlFor="password">Password</label><input id="password" type="password" className="input" value={f.password} onChange={set('password')} autoComplete={isLogin ? 'current-password' : 'new-password'} required /></div>
        {(local || error) && <p role="alert" className="text-sm text-red-400">{local || error}</p>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}</button>
      </form>
      <p className="mt-5 text-center text-sm text-muted">
        {isLogin ? 'New here? ' : 'Already have an account? '}
        <Link className="text-accent hover:underline" to={isLogin ? '/register' : '/login'}>{isLogin ? 'Create an account' : 'Sign in'}</Link>
      </p>
    </div>
  );
}
