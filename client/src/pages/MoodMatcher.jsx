import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Trash2, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import useFetch from '../hooks/useFetch';
import { getGenres } from '../services/movies';
import { deleteMoodHistory, getMoodHistory, recommendByMood } from '../services/ai';
import { errMsg } from '../services/api';
import { LANGUAGES } from '../utils/format';
import Chips from '../components/Chips';
import RecCard from '../components/RecCard';
import Pagination from '../components/Pagination';
import { EmptyState, ErrorState, Skeleton } from '../components/States';

export const MOODS = ['happy', 'excited', 'relaxed', 'romantic', 'thoughtful', 'scared', 'sad', 'adventurous', 'nostalgic', 'curious'].map((id) => ({ id, name: id[0].toUpperCase() + id.slice(1) }));
const TIMES = [['', 'Any length'], ['90', 'Up to 90 min'], ['120', 'Up to 2 h'], ['150', 'Up to 2.5 h'], ['180', 'Up to 3 h']];
const INTENSITY = [['light', 'Light'], ['medium', 'Medium'], ['intense', 'Intense']];

export default function MoodMatcher() {
  const { user } = useSelector((s) => s.auth);
  const genres = useFetch(getGenres, []);
  const [f, setF] = useState({ mood: '', genres: user.favoriteGenres?.slice(0, 3) || [], language: user.preferredLanguage || '', timeMinutes: '', intensity: 'medium' });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const history = useFetch(() => getMoodHistory(page), [page]);

  const toggleGenre = (id) => setF((p) => ({ ...p, genres: p.genres.includes(id) ? p.genres.filter((g) => g !== id) : p.genres.length < 6 ? [...p.genres, id] : p.genres }));

  const submit = async (e) => {
    e.preventDefault();
    if (!f.mood) return toast.error('Pick a mood first');
    setBusy(true); setMessage('');
    try {
      const res = await recommendByMood({ ...f, timeMinutes: f.timeMinutes ? +f.timeMinutes : undefined, language: f.language || undefined });
      setResult(res.recommendation); setMessage(res.message || '');
      if (res.recommendation) { setPage(1); history.reload(); }
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  const remove = async (id) => {
    try { await deleteMoodHistory(id); if (result?._id === id) setResult(null); toast.success('Removed from history'); history.reload(); } catch (err) { toast.error(errMsg(err)); }
  };

  useEffect(() => { if (result) document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' }); }, [result]);

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
      <form onSubmit={submit} className="h-fit space-y-5 rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-24">
        <div><h1 className="text-3xl font-extrabold">Mood match</h1><p className="mt-1 text-sm text-muted">Tell us how you feel. We skip anything you’ve already watched.</p></div>
        <div><p className="label">Mood</p><Chips label="Mood" options={MOODS} selected={f.mood} onToggle={(id) => setF({ ...f, mood: id })} /></div>
        <div><p className="label">Genres (optional, up to 6)</p>{genres.data ? <Chips label="Genres" options={genres.data} selected={f.genres} onToggle={toggleGenre} /> : <Skeleton className="h-16" />}</div>
        <div>
          <p className="label">Intensity</p>
          <div className="inline-flex rounded-lg border border-line p-1" role="group" aria-label="Intensity">
            {INTENSITY.map(([k, n]) => <button type="button" key={k} aria-pressed={f.intensity === k} onClick={() => setF({ ...f, intensity: k })} className={`rounded-md px-3 py-1 text-sm ${f.intensity === k ? 'bg-glow text-white' : 'text-muted'}`}>{n}</button>)}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="mt">Time available</label><select id="mt" className="input" value={f.timeMinutes} onChange={(e) => setF({ ...f, timeMinutes: e.target.value })}>{TIMES.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></div>
          <div><label className="label" htmlFor="ml">Language</label><select id="ml" className="input" value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })}><option value="">Any</option>{LANGUAGES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></div>
        </div>
        <button className="btn-primary w-full" disabled={busy}><Wand2 className="h-4 w-4" />{busy ? 'Finding your movies…' : 'Find my movies'}</button>
      </form>

      <div id="results" className="space-y-8">
        {busy && <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40" />)}</div>}
        {!busy && message && <EmptyState title="Nothing matched" text={message} />}
        {!busy && result && (
          <section>
            <h2 className="mb-4 text-2xl font-bold">Your picks for a {result.preferences.mood} night</h2>
            <div className="space-y-4">
              {result.results.map((m, i) => (
                <motion.div key={`${result._id}-${m.tmdbId}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}><RecCard m={m} /></motion.div>
              ))}
            </div>
          </section>
        )}
        {!busy && !result && !message && <EmptyState title="Pick a mood to begin" text="Your recommendations will show up here with a short reason for each." />}

        <section>
          <h2 className="mb-3 text-xl font-bold">Past sessions</h2>
          {history.loading ? <Skeleton className="h-20" /> : history.error ? <ErrorState message={history.error} onRetry={history.reload} /> :
            history.data.items.length === 0 ? <p className="text-sm text-muted">No sessions yet.</p> : (
              <>
                <ul className="space-y-2">
                  {history.data.items.map((h) => (
                    <li key={h._id} className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm">
                      <div><p className="font-medium capitalize">{h.preferences.mood} · {h.preferences.intensity}</p><p className="text-xs text-muted">{new Date(h.createdAt).toLocaleString()} · {h.results.length} picks · {h.aiUsed ? 'AI explanations' : 'rule-based'}</p></div>
                      <div className="flex gap-2"><button className="btn-ghost !py-1.5" onClick={() => setResult(h)}>View</button><button aria-label="Delete session" className="btn-ghost !p-2" onClick={() => remove(h._id)}><Trash2 className="h-4 w-4" /></button></div>
                    </li>
                  ))}
                </ul>
                <Pagination page={page} totalPages={history.data.totalPages} onChange={setPage} />
              </>
            )}
        </section>
      </div>
    </div>
  );
}
