import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Check, Pencil, Sparkles, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import useFetch from '../hooks/useFetch';
import { getGenres } from '../services/movies';
import { createPlan, deletePlan, listPlans, suggestMovies, updatePlan } from '../services/planner';
import { errMsg } from '../services/api';
import { fmtDate, fromLocalInput, img, LANGUAGES, toLocalInput, year } from '../utils/format';
import Pagination from '../components/Pagination';
import { MOODS } from './MoodMatcher';
import { CardGridSkeleton, EmptyState, ErrorState, Skeleton } from '../components/States';

function Suggestion({ s, onAdded }) {
  const [when, setWhen] = useState('');
  const [busy, setBusy] = useState(false);
  const add = async () => {
    setBusy(true);
    try { await createPlan({ tmdbId: s.tmdbId, title: s.title, posterPath: s.posterPath, releaseDate: s.releaseDate, voteAverage: s.voteAverage, runtime: s.runtime || undefined, genreIds: s.genreIds, scheduledFor: fromLocalInput(when) }); toast.success('Added to your plans'); onAdded(s.tmdbId); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <article className="flex gap-3 rounded-2xl border border-line bg-surface p-3">
      <Link to={`/movie/${s.tmdbId}`} className="w-20 shrink-0">{img(s.posterPath) ? <img src={img(s.posterPath)} alt={`${s.title} poster`} loading="lazy" className="aspect-[2/3] w-full rounded-lg object-cover" /> : <div className="aspect-[2/3] rounded-lg bg-raised" />}</Link>
      <div className="min-w-0 flex-1">
        <Link to={`/movie/${s.tmdbId}`} className="font-display font-bold hover:text-accent">{s.title}</Link>
        <p className="text-xs text-muted">{year(s.releaseDate)}{s.runtime ? ` · ${s.runtime} min` : ''} · match {Math.round(s.score)}</p>
        <p className="mt-1 text-sm">{s.reason}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input type="datetime-local" aria-label={`When to watch ${s.title}`} className="input !w-auto !py-1.5 text-xs" value={when} onChange={(e) => setWhen(e.target.value)} />
          <button className="btn-primary !py-1.5 text-xs" disabled={busy} onClick={add}><CalendarClock className="h-3 w-3" /> Plan it</button>
        </div>
      </div>
    </article>
  );
}

function PlanItem({ p, onChange }) {
  const [edit, setEdit] = useState(false);
  const [when, setWhen] = useState(toLocalInput(p.scheduledFor));
  const [note, setNote] = useState(p.note || '');
  const act = async (fn, msg) => { try { await fn(); toast.success(msg); setEdit(false); onChange(); } catch (e) { toast.error(errMsg(e)); } };
  return (
    <li className="flex gap-3 rounded-2xl border border-line bg-surface p-3">
      <Link to={`/movie/${p.tmdbId}`} className="w-16 shrink-0">{img(p.posterPath) ? <img src={img(p.posterPath)} alt="" loading="lazy" className="aspect-[2/3] w-full rounded-md object-cover" /> : <div className="aspect-[2/3] rounded-md bg-raised" />}</Link>
      <div className="min-w-0 flex-1">
        <Link to={`/movie/${p.tmdbId}`} className="font-display font-bold hover:text-accent">{p.title}</Link>
        {edit ? (
          <div className="mt-2 space-y-2">
            <input type="datetime-local" aria-label="Date and time" className="input" value={when} onChange={(e) => setWhen(e.target.value)} />
            <input aria-label="Note" className="input" maxLength={300} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex gap-2"><button className="btn-primary !py-1.5 text-xs" onClick={() => act(() => updatePlan(p._id, { scheduledFor: fromLocalInput(when), note }), 'Plan updated')}>Save</button><button className="btn-ghost !py-1.5 text-xs" onClick={() => setEdit(false)}>Cancel</button></div>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted">{p.status === 'completed' ? `Watched ${fmtDate(p.completedAt)}` : p.scheduledFor ? fmtDate(p.scheduledFor) : 'No date set'}{p.runtime ? ` · ${p.runtime} min` : ''}</p>
            {p.note && <p className="mt-1 text-sm">{p.note}</p>}
          </>
        )}
      </div>
      {!edit && (
        <div className="flex shrink-0 flex-col gap-1.5">
          {p.status === 'planned' && <button className="btn-ghost !px-2 !py-1.5 text-xs" onClick={() => act(() => updatePlan(p._id, { status: 'completed' }), 'Marked as watched')}><Check className="h-3 w-3" /> Done</button>}
          {p.status === 'planned' && <button aria-label={`Edit plan for ${p.title}`} className="btn-ghost !px-2 !py-1.5" onClick={() => setEdit(true)}><Pencil className="h-3 w-3" /></button>}
          <button aria-label={`Delete plan for ${p.title}`} className="btn-ghost !px-2 !py-1.5" onClick={() => window.confirm('Delete this plan?') && act(() => deletePlan(p._id), 'Plan deleted')}><Trash2 className="h-3 w-3" /></button>
        </div>
      )}
    </li>
  );
}

export default function Planner() {
  const genres = useFetch(getGenres, []);
  const [f, setF] = useState({ timeMinutes: '120', mood: '', genre: '', language: '' });
  const [busy, setBusy] = useState(false);
  const [sugg, setSugg] = useState(null);
  const [tab, setTab] = useState('planned');
  const [page, setPage] = useState(1);
  const plans = useFetch(() => listPlans(tab, page), [tab, page]);

  const suggest = async (e) => {
    e.preventDefault(); setBusy(true);
    try { setSugg(await suggestMovies({ timeMinutes: f.timeMinutes ? +f.timeMinutes : undefined, mood: f.mood || undefined, genres: f.genre ? [+f.genre] : [], language: f.language || undefined })); }
    catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  const added = (id) => { setSugg((s) => ({ ...s, results: s.results.filter((r) => r.tmdbId !== id) })); plans.reload(); };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section>
        <h1 className="text-3xl font-extrabold">Smart planner</h1>
        <p className="mt-1 text-sm text-muted">Tell us how much time you have. We suggest movies that fit, based on your taste and watch history.</p>
        <form onSubmit={suggest} className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-line bg-surface p-4">
          <div><label className="label" htmlFor="pt">Time available</label><select id="pt" className="input" value={f.timeMinutes} onChange={(e) => setF({ ...f, timeMinutes: e.target.value })}>{[['90', '90 min'], ['120', '2 hours'], ['150', '2.5 hours'], ['180', '3 hours'], ['', 'No limit']].map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></div>
          <div><label className="label" htmlFor="pm">Mood</label><select id="pm" className="input" value={f.mood} onChange={(e) => setF({ ...f, mood: e.target.value })}><option value="">Any</option>{MOODS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
          <div><label className="label" htmlFor="pg">Genre</label><select id="pg" className="input" value={f.genre} onChange={(e) => setF({ ...f, genre: e.target.value })}><option value="">Based on my history</option>{genres.data?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
          <div><label className="label" htmlFor="pl">Language</label><select id="pl" className="input" value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })}><option value="">Any</option>{LANGUAGES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></div>
          <button className="btn-primary col-span-2" disabled={busy}><Sparkles className="h-4 w-4" />{busy ? 'Finding movies…' : 'Suggest movies'}</button>
        </form>
        <div className="mt-4 space-y-3" aria-live="polite">
          {busy && [0, 1, 2].map((i) => <Skeleton key={i} className="h-32" />)}
          {!busy && sugg && sugg.results.length === 0 && <EmptyState title="Nothing to suggest" text="Try a longer time window or fewer filters." />}
          {!busy && sugg?.results.map((s) => <Suggestion key={s.tmdbId} s={s} onAdded={added} />)}
          {!busy && sugg?.results.length > 0 && <p className="text-xs text-muted">{sugg.basedOnHistory ? `Tuned using ${sugg.basedOnHistory} movies you have watched.` : 'Watch a few movies to get history-based picks.'}</p>}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold">My viewing plans</h2>
        <div role="tablist" className="mb-4 mt-3 inline-flex rounded-lg border border-line p-1">
          {[['planned', 'Upcoming'], ['completed', 'Completed']].map(([k, n]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setPage(1); }} className={`rounded-md px-4 py-1.5 text-sm font-medium ${tab === k ? 'bg-glow text-white' : 'text-muted hover:text-ink'}`}>{n}</button>)}
        </div>
        {plans.loading ? <CardGridSkeleton count={2} /> : plans.error ? <ErrorState message={plans.error} onRetry={plans.reload} /> :
          plans.data.items.length === 0 ? <EmptyState title={tab === 'planned' ? 'No plans yet' : 'No completed plans'} text={tab === 'planned' ? 'Add a suggestion to schedule your next movie night.' : 'Finished plans show up here.'} /> : (
            <>
              <ul className="space-y-3">{plans.data.items.map((p) => <PlanItem key={p._id} p={p} onChange={plans.reload} />)}</ul>
              <Pagination page={page} totalPages={plans.data.totalPages} onChange={setPage} />
            </>
          )}
      </section>
    </div>
  );
}
