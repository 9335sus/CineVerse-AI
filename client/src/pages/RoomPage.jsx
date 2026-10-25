import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Check, Copy, Crown, Trophy, Vote } from 'lucide-react';
import toast from 'react-hot-toast';
import useRoom from '../hooks/useRoom';
import useFetch from '../hooks/useFetch';
import { getGenres } from '../services/movies';
import { decideRoom, deleteRoom, generatePicks, savePreferences } from '../services/rooms';
import { errMsg } from '../services/api';
import { img, LANGUAGES, year } from '../utils/format';
import Chips from '../components/Chips';
import { ErrorState, Skeleton } from '../components/States';
import { MOODS } from './MoodMatcher';

function PrefsForm({ room, setRoom, genres }) {
  const mine = room.myPreferences;
  const [f, setF] = useState({ genres: mine?.genres || [], dislikedGenres: mine?.dislikedGenres || [], language: mine?.language || '', maxRuntime: mine?.maxRuntime || '', mood: mine?.mood || '' });
  const [busy, setBusy] = useState(false);
  const toggle = (key, other) => (id) => setF((p) => ({
    ...p, [key]: p[key].includes(id) ? p[key].filter((g) => g !== id) : p[key].length < 8 ? [...p[key], id] : p[key], [other]: p[other].filter((g) => g !== id),
  }));
  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try { setRoom(await savePreferences(room.code, { ...f, maxRuntime: f.maxRuntime ? +f.maxRuntime : undefined })); toast.success('Preferences saved'); }
    catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  const locked = room.status === 'decided';
  return (
    <form onSubmit={save} className="space-y-4 rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-xl font-bold">Your tastes</h2>
      <div><p className="label">Mood</p><Chips label="Mood" options={MOODS} selected={f.mood} onToggle={(id) => setF({ ...f, mood: f.mood === id ? '' : id })} /></div>
      <div><p className="label">Genres you want</p>{genres ? <Chips label="Wanted genres" options={genres} selected={f.genres} onToggle={toggle('genres', 'dislikedGenres')} /> : <Skeleton className="h-12" />}</div>
      <div><p className="label">Genres to avoid</p>{genres && <Chips label="Avoided genres" tone="dislike" options={genres} selected={f.dislikedGenres} onToggle={toggle('dislikedGenres', 'genres')} />}</div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label" htmlFor="rl">Language</label><select id="rl" className="input" value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })}><option value="">Any</option>{LANGUAGES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></div>
        <div><label className="label" htmlFor="rr">Max runtime (min)</label><input id="rr" type="number" min="40" max="300" className="input" value={f.maxRuntime} onChange={(e) => setF({ ...f, maxRuntime: e.target.value })} placeholder="Any" /></div>
      </div>
      <button className="btn-primary" disabled={busy || locked}>{busy ? 'Saving…' : mine ? 'Update preferences' : 'Submit preferences'}</button>
    </form>
  );
}

function Pick({ movie, room, me, vote }) {
  const votes = room.votes.filter((v) => v.tmdbId === movie.tmdbId);
  const mine = votes.some((v) => v.userId === me);
  const name = (id) => room.members.find((m) => m.id === id)?.name || 'Member';
  return (
    <article className="flex gap-4 rounded-2xl border border-line bg-surface p-4">
      <Link to={`/movie/${movie.tmdbId}`} className="w-20 shrink-0">{img(movie.posterPath) ? <img src={img(movie.posterPath)} alt={`${movie.title} poster`} loading="lazy" className="aspect-[2/3] w-full rounded-lg object-cover" /> : <div className="aspect-[2/3] rounded-lg bg-raised" />}</Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div><Link to={`/movie/${movie.tmdbId}`} className="font-display text-lg font-bold hover:text-accent">{movie.title}</Link><p className="text-xs text-muted">{year(movie.releaseDate)}{movie.runtime ? ` · ${movie.runtime} min` : ''}</p></div>
          <div className="text-right"><p className="text-2xl font-extrabold text-accent">{Math.round(movie.groupScore)}</p><p className="text-[11px] text-muted">group fit</p></div>
        </div>
        <ul className="mt-2 space-y-1" aria-label="How well it fits each person">
          {movie.perUser.map((p) => (
            <li key={p.userId} className="flex items-center gap-2 text-xs">
              <span className="w-20 truncate text-muted">{name(p.userId)}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded bg-raised"><span className="block h-full bg-glow" style={{ width: `${p.score}%` }} /></span>
              <span className="w-8 text-right">{Math.round(p.score)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center gap-3">
          {room.status === 'voting' && <button onClick={() => vote(movie.tmdbId)} aria-pressed={mine} className={mine ? 'btn-primary !py-1.5' : 'btn-ghost !py-1.5'}><Vote className="h-4 w-4" />{mine ? 'Voted' : 'Vote'}</button>}
          <span className="text-sm" aria-live="polite"><strong>{votes.length}</strong> {votes.length === 1 ? 'vote' : 'votes'}{votes.length > 0 && <span className="text-muted"> · {votes.map((v) => name(v.userId)).join(', ')}</span>}</span>
        </div>
      </div>
    </article>
  );
}

export default function RoomPage() {
  const { code } = useParams();
  const nav = useNavigate();
  const me = useSelector((s) => s.auth.user.id);
  const { room, setRoom, presence, connected, loading, error, vote } = useRoom(code.toUpperCase());
  const genres = useFetch(getGenres, []);
  const [busy, setBusy] = useState('');

  if (loading) return <Skeleton className="h-96" />;
  if (error || !room) return <ErrorState message={error || 'Room unavailable'} onRetry={() => nav('/rooms')} />;

  const isHost = room.host.id === me;
  const online = new Set(presence.map((p) => p.userId));
  const act = (key, fn, msg) => async () => {
    setBusy(key);
    try { setRoom(await fn()); if (msg) toast.success(msg); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(''); }
  };
  const copy = () => navigator.clipboard?.writeText(room.code).then(() => toast.success('Code copied'), () => toast.error('Copy failed. Select the code manually.'));
  const close = async () => {
    if (!window.confirm('Close this room for everyone?')) return;
    try { await deleteRoom(room.code); toast.success('Room closed'); nav('/rooms'); } catch (e) { toast.error(errMsg(e)); }
  };
  const ranked = [...room.recommendations].sort((a, b) => room.votes.filter((v) => v.tmdbId === b.tmdbId).length - room.votes.filter((v) => v.tmdbId === a.tmdbId).length || b.groupScore - a.groupScore);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">{room.name}</h1>
          <p className="mt-1 flex items-center gap-3 text-sm text-muted">
            <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-1 font-mono tracking-widest text-ink hover:bg-raised" aria-label={`Copy room code ${room.code}`}><Copy className="h-3 w-3" />{room.code}</button>
            <span className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-yellow-500'}`} />{connected ? 'Live' : 'Reconnecting…'}</span>
          </p>
        </div>
        {isHost && <button onClick={close} className="btn-ghost text-red-400">Close room</button>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-6">
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="mb-3 text-xl font-bold">In this room ({room.members.length})</h2>
            <ul className="space-y-2">
              {room.members.map((m) => (
                <li key={m.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${online.has(m.id) ? 'bg-green-500' : 'bg-line'}`} title={online.has(m.id) ? 'Online' : 'Offline'} />{m.name}{m.id === room.host.id && <Crown className="h-3 w-3 text-yellow-400" aria-label="Host" />}{m.id === me && <span className="text-xs text-muted">(you)</span>}</span>
                  <span className={`inline-flex items-center gap-1 text-xs ${room.submitted.includes(m.id) ? 'text-green-400' : 'text-muted'}`}>{room.submitted.includes(m.id) ? <><Check className="h-3 w-3" />Ready</> : 'Waiting'}</span>
                </li>
              ))}
            </ul>
          </section>
          <PrefsForm key={room.myPreferences?.submittedAt || 'new'} room={room} setRoom={setRoom} genres={genres.data} />
        </aside>

        <section className="space-y-4">
          {room.status === 'decided' && room.finalDecision && (
            <div className="flex items-center gap-4 rounded-2xl border border-glow bg-glow/10 p-5">
              {img(room.finalDecision.posterPath) && <img src={img(room.finalDecision.posterPath)} alt="" className="w-20 rounded-lg" />}
              <div><p className="flex items-center gap-2 text-sm text-accent"><Trophy className="h-4 w-4" /> The group picked</p><h2 className="text-3xl font-extrabold">{room.finalDecision.title}</h2><p className="text-sm text-muted">{room.finalDecision.voteCount} votes</p><Link to={`/movie/${room.finalDecision.tmdbId}`} className="btn-primary mt-3">View movie</Link></div>
            </div>
          )}

          {room.status === 'lobby' && (
            <div className="rounded-2xl border border-dashed border-line p-8 text-center">
              <h2 className="text-xl font-bold">Waiting for everyone’s tastes</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">{room.submitted.length} of {room.members.length} ready. Share code <strong className="font-mono">{room.code}</strong> with friends so they can join.</p>
              {isHost ? <button className="btn-primary mt-5" disabled={!room.submitted.length || busy === 'gen'} onClick={act('gen', () => generatePicks(room.code), 'Group picks ready')}>{busy === 'gen' ? 'Matching…' : 'Find movies for the group'}</button> : <p className="mt-5 text-sm text-muted">The host will start the matching.</p>}
            </div>
          )}

          {room.status !== 'lobby' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-2xl font-bold">{room.status === 'voting' ? 'Vote for any you’d watch' : 'Final standings'}</h2>
                {isHost && room.status === 'voting' && (
                  <div className="flex gap-2">
                    <button className="btn-ghost" disabled={busy === 'gen'} onClick={act('gen', () => generatePicks(room.code), 'Picks refreshed, votes reset')}>Re-run matching</button>
                    <button className="btn-primary" disabled={busy === 'dec'} onClick={act('dec', () => decideRoom(room.code), 'Decision saved')}>Lock in decision</button>
                  </div>
                )}
              </div>
              {ranked.map((m) => <Pick key={m.tmdbId} movie={m} room={room} me={me} vote={vote} />)}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
