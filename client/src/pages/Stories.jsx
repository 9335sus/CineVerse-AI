import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Trash2, TriangleAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import useFetch from '../hooks/useFetch';
import { searchMovies } from '../services/movies';
import { createStory, deleteStory, listStories } from '../services/stories';
import { errMsg } from '../services/api';
import { img, year } from '../utils/format';
import Pagination from '../components/Pagination';
import { EmptyState, ErrorState, Skeleton } from '../components/States';

export const SPOILER = { none: 'Spoiler-free', light: 'Light spoilers', full: 'Spoilers OK' };
export const Unofficial = () => (
  <div role="note" className="flex items-start gap-3 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm">
    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
    <p><strong>Unofficial, AI-generated alternate story.</strong> It is fan fiction, not part of the film, and not endorsed by its creators.</p>
  </div>
);

export default function Stories() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [found, setFound] = useState(null);
  const [searching, setSearching] = useState(false);
  const [movie, setMovie] = useState(null);
  const [whatIf, setWhatIf] = useState('');
  const [level, setLevel] = useState('none');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const list = useFetch(() => listStories(page), [page]);

  const search = async (e) => {
    e.preventDefault(); if (!q.trim()) return;
    setSearching(true);
    try { setFound((await searchMovies({ query: q.trim() })).results.slice(0, 6)); } catch (err) { toast.error(errMsg(err)); } finally { setSearching(false); }
  };
  const start = async (e) => {
    e.preventDefault();
    if (!movie) return toast.error('Pick a movie first');
    setBusy(true);
    try { const s = await createStory({ tmdbId: movie.id, whatIf, spoilerLevel: level }); nav(`/stories/${s._id}`); } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  const remove = async (id) => {
    if (!window.confirm('Delete this story?')) return;
    try { await deleteStory(id); toast.success('Story deleted'); list.reload(); } catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div><h1 className="text-3xl font-extrabold">Story simulator</h1><p className="mt-1 text-sm text-muted">Pick a movie, ask “what if?”, and steer an alternate story with your choices.</p></div>
      <Unofficial />
      <form onSubmit={start} className="space-y-4 rounded-2xl border border-line bg-surface p-5">
        <div>
          <label className="label" htmlFor="sq">1. Choose a movie</label>
          <div className="flex gap-2"><input id="sq" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a title" onKeyDown={(e) => e.key === 'Enter' && search(e)} /><button type="button" onClick={search} className="btn-ghost" disabled={searching}><Search className="h-4 w-4" />Search</button></div>
          {found && (found.length === 0 ? <p className="mt-2 text-sm text-muted">No matches.</p> : (
            <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
              {found.map((m) => (
                <li key={m.id}><button type="button" aria-pressed={movie?.id === m.id} onClick={() => setMovie(m)} className={`w-full text-left ${movie?.id === m.id ? 'ring-2 ring-glow' : ''} rounded-lg`}>
                  {img(m.posterPath, 'w185') ? <img src={img(m.posterPath, 'w185')} alt="" className="aspect-[2/3] w-full rounded-lg object-cover" /> : <div className="aspect-[2/3] rounded-lg bg-raised" />}
                  <span className="mt-1 block line-clamp-1 text-xs">{m.title} ({year(m.releaseDate)})</span></button></li>
              ))}
            </ul>
          ))}
          {movie && <p className="mt-2 text-sm text-accent">Selected: {movie.title}</p>}
        </div>
        <div><label className="label" htmlFor="wi">2. What if…?</label><textarea id="wi" className="input min-h-20" minLength={5} maxLength={300} required value={whatIf} onChange={(e) => setWhatIf(e.target.value)} placeholder="What if the hero had refused the mission?" /></div>
        <fieldset>
          <legend className="label">3. Spoiler preference</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {[['none', 'Spoiler-free', 'Uses only the setup. Nothing from later in the film.'], ['light', 'Light spoilers', 'May reference the general plot, never twists or the ending.'], ['full', 'Spoilers OK', 'May use any plot detail.']].map(([k, n, d]) => (
              <label key={k} className={`cursor-pointer rounded-xl border p-3 text-sm ${level === k ? 'border-glow bg-glow/10' : 'border-line'}`}><input type="radio" name="spoiler" className="sr-only" checked={level === k} onChange={() => setLevel(k)} /><span className="block font-medium">{n}</span><span className="text-xs text-muted">{d}</span></label>
            ))}
          </div>
        </fieldset>
        <button className="btn-primary" disabled={busy}>{busy ? 'Writing the opening…' : 'Start the story'}</button>
      </form>

      <section>
        <h2 className="mb-3 text-xl font-bold">Your stories</h2>
        {list.loading ? <Skeleton className="h-24" /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> :
          list.data.items.length === 0 ? <EmptyState title="No stories yet" text="Start one above. You can come back and continue it any time." /> : (
            <>
              <ul className="space-y-2">
                {list.data.items.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
                    {img(s.posterPath, 'w92') && <img src={img(s.posterPath, 'w92')} alt="" className="w-10 rounded" />}
                    <Link to={`/stories/${s.id}`} className="min-w-0 flex-1"><p className="font-medium">{s.title}</p><p className="line-clamp-1 text-xs text-muted">“{s.premise}” · {s.parts} parts · {SPOILER[s.spoilerLevel]} · {s.status === 'ended' ? 'Ended' : 'In progress'}</p></Link>
                    <Link to={`/stories/${s.id}`} className="btn-ghost !py-1.5 text-xs">{s.status === 'ended' ? 'Read' : 'Continue'}</Link>
                    <button aria-label={`Delete story about ${s.title}`} className="btn-ghost !p-2" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
              <Pagination page={page} totalPages={list.data.totalPages} onChange={setPage} />
            </>
          )}
      </section>
    </div>
  );
}
