import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import useFetch from '../hooks/useFetch';
import { getGenres } from '../services/movies';
import api, { errMsg } from '../services/api';
import { updateProfile } from '../features/auth/authSlice';
import { LANGUAGES } from '../utils/format';

export default function Profile() {
  const dispatch = useDispatch();
  const { user, loading } = useSelector((s) => s.auth);
  const genres = useFetch(getGenres, []);
  const [f, setF] = useState({ name: user.name, bio: user.bio || '', preferredLanguage: user.preferredLanguage || 'en', favoriteGenres: user.favoriteGenres || [] });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [pwBusy, setPwBusy] = useState(false);

  const toggleGenre = (id) => setF((p) => ({
    ...p, favoriteGenres: p.favoriteGenres.includes(id) ? p.favoriteGenres.filter((g) => g !== id) : p.favoriteGenres.length < 10 ? [...p.favoriteGenres, id] : p.favoriteGenres,
  }));

  const save = async (e) => {
    e.preventDefault();
    const res = await dispatch(updateProfile(f));
    res.error ? toast.error(res.payload) : toast.success('Profile updated');
  };
  const changePw = async (e) => {
    e.preventDefault();
    setPwBusy(true);
    try { await api.patch('/users/me/password', pw); toast.success('Password changed'); setPw({ currentPassword: '', newPassword: '' }); }
    catch (err) { toast.error(errMsg(err)); } finally { setPwBusy(false); }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div><h1 className="text-3xl font-extrabold">Profile</h1><p className="text-sm text-muted">{user.email}</p></div>
      <form onSubmit={save} className="space-y-4 rounded-2xl border border-line bg-surface p-6">
        <div><label className="label" htmlFor="pn">Name</label><input id="pn" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><label className="label" htmlFor="pb">Bio</label><textarea id="pb" maxLength={300} className="input min-h-20" value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} /></div>
        <div>
          <label className="label" htmlFor="pl">Preferred language</label>
          <select id="pl" className="input" value={f.preferredLanguage} onChange={(e) => setF({ ...f, preferredLanguage: e.target.value })}>
            {LANGUAGES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
          </select>
        </div>
        <fieldset>
          <legend className="label">Favorite genres (up to 10)</legend>
          <div className="flex flex-wrap gap-2">
            {genres.data?.map((g) => (
              <button type="button" key={g.id} aria-pressed={f.favoriteGenres.includes(g.id)} onClick={() => toggleGenre(g.id)}
                className={`rounded-full border px-3 py-1 text-sm transition ${f.favoriteGenres.includes(g.id) ? 'border-glow bg-glow text-white' : 'border-line text-muted hover:text-ink'}`}>{g.name}</button>
            ))}
          </div>
        </fieldset>
        <button className="btn-primary" disabled={loading}>{loading ? 'Saving…' : 'Save changes'}</button>
      </form>
      <form onSubmit={changePw} className="space-y-4 rounded-2xl border border-line bg-surface p-6">
        <h2 className="text-xl font-bold">Change password</h2>
        <div><label className="label" htmlFor="cp">Current password</label><input id="cp" type="password" className="input" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} autoComplete="current-password" required /></div>
        <div><label className="label" htmlFor="np">New password</label><input id="np" type="password" minLength={8} className="input" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} autoComplete="new-password" required /></div>
        <button className="btn-ghost" disabled={pwBusy}>{pwBusy ? 'Updating…' : 'Update password'}</button>
      </form>
    </div>
  );
}
