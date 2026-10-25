import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { EyeOff, Flag, MessageSquare, ShieldAlert, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import useFetch from '../hooks/useFetch';
import { getMovie } from '../services/movies';
import { deleteComment, getComments, getProgress, postComment, reportComment, revealComment, setProgress } from '../services/discussions';
import { getSocket } from '../services/socket';
import { errMsg } from '../services/api';
import { img, timeAgo, year } from '../utils/format';
import Pagination from '../components/Pagination';
import { EmptyState, ErrorState, Skeleton } from '../components/States';

const PROGRESS = [['not_started', 'Not started'], ['watching', 'Watching'], ['finished', 'Finished']];
const REASONS = [['spoiler', 'Unmarked spoiler'], ['harassment', 'Harassment'], ['spam', 'Spam'], ['inappropriate', 'Inappropriate'], ['other', 'Other']];

function Composer({ tmdbId, title, parent, onDone, placeholder = 'Share your thoughts…', autoFocus }) {
  const [content, setContent] = useState('');
  const [spoiler, setSpoiler] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await postComment(tmdbId, { content, isSpoiler: spoiler, parent, movieTitle: title }); setContent(''); setSpoiler(false); onDone(); }
    catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-2">
      <textarea aria-label={placeholder} autoFocus={autoFocus} className="input min-h-20" maxLength={1500} required value={content} onChange={(e) => setContent(e.target.value)} placeholder={placeholder} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} /> Contains spoilers</label>
        <button className="btn-primary !py-1.5" disabled={busy || !content.trim()}>{busy ? 'Posting…' : parent ? 'Reply' : 'Post comment'}</button>
      </div>
    </form>
  );
}

function Comment({ c, tmdbId, title, me, isAdmin, onChange, revealed, reveal, depth = 0 }) {
  const [replying, setReplying] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState('spoiler');
  const text = revealed[c.id] ?? c.content;
  const del = async () => { if (!window.confirm('Delete this comment?')) return; try { await deleteComment(c.id); onChange(); } catch (e) { toast.error(errMsg(e)); } };
  const report = async (e) => {
    e.preventDefault();
    try { const r = await reportComment(c.id, { reason }); toast.success(r.message); setReporting(false); } catch (err) { toast.error(errMsg(err)); }
  };
  return (
    <div className={depth ? 'mt-3 border-l-2 border-line pl-4' : ''}>
      <article className="rounded-xl border border-line bg-surface p-4">
        <header className="flex items-center justify-between gap-2 text-sm">
          <p><strong>{c.user.name}</strong> <span className="text-muted">· {timeAgo(c.createdAt)}</span>{c.isSpoiler && <span className="ml-2 rounded bg-red-500/15 px-1.5 py-0.5 text-xs text-red-400">Spoiler</span>}{c.moderated && isAdmin && <span className="ml-2 text-xs text-yellow-400">hidden by reports</span>}</p>
        </header>
        {c.hidden ? <p className="mt-2 flex items-center gap-2 text-sm text-muted"><ShieldAlert className="h-4 w-4" /> This comment is hidden pending moderator review.</p>
          : text == null ? (
            <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg bg-raised p-3 text-sm">
              <EyeOff className="h-4 w-4 text-muted" /><span className="text-muted">Hidden to protect you from spoilers.</span>
              <button className="btn-ghost !py-1 text-xs" onClick={() => reveal(c.id)}>Reveal this comment</button>
            </div>
          ) : <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{text}</p>}
        <footer className="mt-3 flex gap-3 text-xs text-muted">
          {!c.hidden && depth === 0 && <button className="inline-flex items-center gap-1 hover:text-ink" onClick={() => setReplying(!replying)}><MessageSquare className="h-3 w-3" />Reply</button>}
          {!c.isMine && <button className="inline-flex items-center gap-1 hover:text-ink" onClick={() => setReporting(!reporting)}><Flag className="h-3 w-3" />Report</button>}
          {(c.isMine || isAdmin) && <button className="inline-flex items-center gap-1 hover:text-red-400" onClick={del}><Trash2 className="h-3 w-3" />Delete</button>}
        </footer>
        {reporting && (
          <form onSubmit={report} className="mt-3 flex flex-wrap items-center gap-2">
            <select aria-label="Report reason" className="input !w-auto !py-1.5 text-sm" value={reason} onChange={(e) => setReason(e.target.value)}>{REASONS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select>
            <button className="btn-primary !py-1.5 text-xs">Send report</button><button type="button" className="btn-ghost !py-1.5 text-xs" onClick={() => setReporting(false)}>Cancel</button>
          </form>
        )}
        {replying && <div className="mt-3"><Composer tmdbId={tmdbId} title={title} parent={c.id} placeholder="Write a reply…" autoFocus onDone={() => { setReplying(false); onChange(); }} /></div>}
      </article>
      {c.replies?.map((r) => <Comment key={r.id} c={r} depth={1} tmdbId={tmdbId} title={title} me={me} isAdmin={isAdmin} onChange={onChange} revealed={revealed} reveal={reveal} />)}
    </div>
  );
}

export default function Discussion() {
  const { id } = useParams();
  const { user } = useSelector((s) => s.auth);
  const movie = useFetch(() => getMovie(id), [id]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(null);
  const [revealed, setRevealed] = useState({});
  const list = useFetch(() => getComments(id, page), [id, page, status]);

  useEffect(() => { getProgress(id).then(setStatus).catch(() => setStatus('not_started')); }, [id]);

  // live updates: the server only says "something changed", spoiler redaction stays per viewer
  useEffect(() => {
    const s = getSocket();
    const join = () => s.emit('discussion:join', { tmdbId: +id });
    const changed = (p) => p.tmdbId === +id && list.reload();
    s.on('connect', join); s.on('discussion:changed', changed);
    if (s.connected) join(); else s.connect();
    return () => { s.emit('discussion:leave', { tmdbId: +id }); s.off('connect', join); s.off('discussion:changed', changed); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const changeProgress = async (v) => {
    try { setStatus(await setProgress(id, v)); setRevealed({}); toast.success(v === 'finished' ? 'Spoilers unlocked' : 'Progress saved'); } catch (e) { toast.error(errMsg(e)); }
  };
  const reveal = async (cid) => { try { const t = await revealComment(cid); setRevealed((r) => ({ ...r, [cid]: t })); } catch (e) { toast.error(errMsg(e)); } };

  const m = movie.data;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-center gap-4">
        {m && img(m.posterPath, 'w185') && <img src={img(m.posterPath, 'w185')} alt="" className="w-16 rounded-lg" />}
        <div>
          <p className="text-sm text-muted">Discussion room</p>
          <h1 className="text-3xl font-extrabold">{m ? `${m.title} (${year(m.releaseDate)})` : movie.error ? 'Movie discussion' : '…'}</h1>
          <Link to={`/movie/${id}`} className="text-sm text-accent hover:underline">Back to movie</Link>
        </div>
      </header>

      <section className="rounded-2xl border border-line bg-surface p-4" aria-label="Your watch progress">
        <p className="font-medium">Where are you with this movie?</p>
        <p className="mt-1 text-xs text-muted">Comments tagged as spoilers stay hidden until you mark it finished. You can still reveal single comments.</p>
        <div role="group" aria-label="Watch progress" className="mt-3 inline-flex rounded-lg border border-line p-1">
          {PROGRESS.map(([v, n]) => <button key={v} aria-pressed={status === v} onClick={() => changeProgress(v)} className={`rounded-md px-3 py-1.5 text-sm ${status === v ? 'bg-glow text-white' : 'text-muted hover:text-ink'}`}>{n}</button>)}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4"><Composer tmdbId={id} title={m?.title} onDone={() => { setPage(1); list.reload(); }} /></section>

      <section aria-live="polite" className="space-y-4">
        {list.loading ? <Skeleton className="h-32" /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> :
          list.data.items.length === 0 ? <EmptyState title="No comments yet" text="Start the conversation. Tag anything that gives away the plot." /> :
            list.data.items.map((c) => <Comment key={c.id} c={c} tmdbId={id} title={m?.title} me={user.id} isAdmin={user.role === 'admin'} onChange={list.reload} revealed={revealed} reveal={reveal} />)}
        {list.data && <Pagination page={page} totalPages={list.data.totalPages} onChange={setPage} />}
      </section>
    </div>
  );
}
