import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';
import useFetch from '../hooks/useFetch';
import * as admin from '../services/admin';
import { errMsg } from '../services/api';
import { fmtDate } from '../utils/format';
import Pagination from '../components/Pagination';
import { EmptyState, ErrorState, Skeleton } from '../components/States';

const PURPLE = '#8b5cf6';
const tick = { fill: '#9a8fb8', fontSize: 12 };
const tip = { contentStyle: { background: '#1e1630', border: '1px solid #30264a', borderRadius: 8, color: '#f0ecfa' } };
const Stat = ({ label, value }) => <div className="rounded-xl border border-line bg-surface p-4"><p className="text-xs text-muted">{label}</p><p className="font-display text-3xl font-extrabold text-accent">{value}</p></div>;
const Box = ({ state, children, empty }) => state.loading ? <Skeleton className="h-40" /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : empty ? <EmptyState title={empty} /> : children;
const run = async (fn, msg, after) => { try { await fn(); toast.success(msg); after(); } catch (e) { toast.error(errMsg(e)); } };

function Overview() {
  const s = useFetch(admin.getOverview, []);
  const t = s.data?.totals;
  return (
    <Box state={s}>
      {s.data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {[['Users', t.users], ['New (7 days)', t.newUsers], ['Active users', t.active], ['Open reports', t.openReports], ['Reviews', t.reviews], ['Comments', t.comments], ['Plans', t.plans], ['Stories', t.stories], ['Rooms', t.rooms]].map(([l, v]) => <Stat key={l} label={l} value={v} />)}
          </div>
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="mb-3 text-lg font-bold">Sign-ups, last 14 days</h2>
            <ResponsiveContainer width="100%" height={240}><LineChart data={s.data.signups}><CartesianGrid stroke="#30264a" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={tick} /><YAxis allowDecimals={false} tick={tick} /><Tooltip {...tip} /><Line dataKey="count" name="Sign-ups" stroke={PURPLE} strokeWidth={3} /></LineChart></ResponsiveContainer>
          </section>
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="mb-3 text-lg font-bold">Most reviewed movies</h2>
            {s.data.topMovies.length === 0 ? <p className="text-sm text-muted">No reviews yet.</p> : <ol className="space-y-2 text-sm">{s.data.topMovies.map((m) => <li key={m.tmdbId} className="flex justify-between"><span>{m.title}</span><span className="text-muted">{m.reviews} reviews · avg {m.avg}</span></li>)}</ol>}
          </section>
        </div>
      )}
    </Box>
  );
}

function Users() {
  const [q, setQ] = useState(''); const [search, setSearch] = useState(''); const [page, setPage] = useState(1);
  const s = useFetch(() => admin.getUsers({ search, page }), [search, page]);
  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(q); }} className="mb-4 flex gap-2"><input aria-label="Search users" className="input max-w-xs" placeholder="Name or email" value={q} onChange={(e) => setQ(e.target.value)} /><button className="btn-ghost">Search</button></form>
      <Box state={s} empty={s.data?.items.length === 0 && 'No users found'}>
        {s.data && (
          <>
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-left text-sm"><thead className="bg-raised text-xs text-muted"><tr><th className="p-3">User</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Joined</th><th className="p-3" /></tr></thead>
                <tbody>{s.data.items.map((u) => (
                  <tr key={u.id} className="border-t border-line"><td className="p-3"><p className="font-medium">{u.name}</p><p className="text-xs text-muted">{u.email}</p></td><td className="p-3 capitalize">{u.role}</td><td className="p-3">{u.isActive ? 'Active' : <span className="text-red-400">Suspended</span>}</td><td className="p-3 text-xs text-muted">{fmtDate(u.createdAt)}</td>
                    <td className="space-x-2 p-3 text-right whitespace-nowrap">
                      <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => run(() => admin.updateUser(u.id, { role: u.role === 'admin' ? 'user' : 'admin' }), 'Role updated', s.reload)}>{u.role === 'admin' ? 'Remove admin' : 'Make admin'}</button>
                      <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => run(() => admin.updateUser(u.id, { isActive: !u.isActive }), u.isActive ? 'User suspended' : 'User reactivated', s.reload)}>{u.isActive ? 'Suspend' : 'Reactivate'}</button>
                    </td></tr>))}</tbody></table>
            </div>
            <Pagination page={page} totalPages={s.data.totalPages} onChange={setPage} />
          </>
        )}
      </Box>
    </div>
  );
}

function Reviews() {
  const [filter, setFilter] = useState('reported'); const [page, setPage] = useState(1);
  const s = useFetch(() => admin.getReviews({ filter, page }), [filter, page]);
  return (
    <div>
      <div className="mb-4 inline-flex rounded-lg border border-line p-1">{[['reported', 'Reported'], ['hidden', 'Hidden'], ['', 'All']].map(([k, n]) => <button key={n} aria-pressed={filter === k} onClick={() => { setFilter(k); setPage(1); }} className={`rounded-md px-3 py-1.5 text-sm ${filter === k ? 'bg-glow text-white' : 'text-muted'}`}>{n}</button>)}</div>
      <Box state={s} empty={s.data?.items.length === 0 && 'No reviews in this view'}>
        {s.data && (
          <>
            <ul className="space-y-3">{s.data.items.map((r) => (
              <li key={r._id} className="rounded-xl border border-line bg-surface p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2"><p><strong>{r.movieTitle}</strong> · {r.rating}/10 · by {r.user?.name} <span className="text-muted">({r.user?.email})</span></p>
                  <p className="text-xs text-muted">{r.reportsCount} reports{r.isHidden && ' · hidden'}</p></div>
                {r.content && <p className="mt-2 whitespace-pre-wrap">{r.content}</p>}
                <div className="mt-3 flex gap-2">
                  <button className="btn-ghost !py-1 text-xs" onClick={() => run(() => admin.updateReview(r._id, !r.isHidden), r.isHidden ? 'Review restored' : 'Review hidden', s.reload)}>{r.isHidden ? 'Restore' : 'Hide'}</button>
                  <button className="btn-ghost !py-1 text-xs text-red-400" onClick={() => window.confirm('Delete this review permanently?') && run(() => admin.deleteReview(r._id), 'Review deleted', s.reload)}>Delete</button>
                </div></li>))}</ul>
            <Pagination page={page} totalPages={s.data.totalPages} onChange={setPage} />
          </>
        )}
      </Box>
    </div>
  );
}

function Reports() {
  const [status, setStatus] = useState('open'); const [page, setPage] = useState(1);
  const s = useFetch(() => admin.getReports({ status, page }), [status, page]);
  return (
    <div>
      <div className="mb-4 inline-flex rounded-lg border border-line p-1">{[['open', 'Open'], ['resolved', 'Resolved'], ['dismissed', 'Dismissed']].map(([k, n]) => <button key={k} aria-pressed={status === k} onClick={() => { setStatus(k); setPage(1); }} className={`rounded-md px-3 py-1.5 text-sm ${status === k ? 'bg-glow text-white' : 'text-muted'}`}>{n}</button>)}</div>
      <Box state={s} empty={s.data?.items.length === 0 && `No ${status} reports`}>
        {s.data && (
          <>
            <ul className="space-y-3">{s.data.items.map((r) => (
              <li key={r.id} className="rounded-xl border border-line bg-surface p-4 text-sm">
                <p className="text-xs text-muted">{r.targetType} report · <strong className="capitalize text-ink">{r.reason}</strong> · by {r.reporter} · {fmtDate(r.createdAt)}{r.resolution && ` · ${r.resolution}`}</p>
                {r.details && <p className="mt-1 text-muted">“{r.details}”</p>}
                {r.target ? <blockquote className="mt-2 rounded-lg bg-raised p-3"><p className="text-xs text-muted">{r.target.author}{r.target.movie ? ` on ${r.target.movie}` : ''} · {r.target.reports} reports{r.target.hidden ? ' · currently hidden' : ''}</p><p className="mt-1 whitespace-pre-wrap">{r.target.text}</p></blockquote> : <p className="mt-2 text-muted">The reported content no longer exists.</p>}
                {r.status === 'open' && (
                  <div className="mt-3 flex gap-2">
                    {[['hide', 'Hide'], ['delete', 'Delete content'], ['dismiss', 'Dismiss']].map(([a, n]) => <button key={a} className={`btn-ghost !py-1 text-xs ${a === 'delete' ? 'text-red-400' : ''}`} onClick={() => (a !== 'delete' || window.confirm('Delete the reported content?')) && run(() => admin.resolveReport(r.id, a), 'Report resolved', s.reload)}>{n}</button>)}
                  </div>
                )}</li>))}</ul>
            <Pagination page={page} totalPages={s.data.totalPages} onChange={setPage} />
          </>
        )}
      </Box>
    </div>
  );
}

function AiUsage() {
  const s = useFetch(admin.getAiUsage, []);
  const d = s.data;
  return (
    <Box state={s}>
      {d && (
        <div className="space-y-6">
          <p className={`rounded-xl border p-3 text-sm ${d.configured ? 'border-green-500/40 bg-green-500/10' : 'border-yellow-500/40 bg-yellow-500/10'}`}>{d.configured ? `AI is configured: ${d.provider} / ${d.model}` : 'AI is not configured. Recommendations use the rule-based fallback and the Story Simulator is unavailable.'}</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="AI calls" value={d.totals.calls} /><Stat label="Success rate" value={`${d.totals.successRate}%`} /><Stat label="Fallback rate" value={`${d.totals.fallbackRate}%`} /><Stat label="Avg latency" value={`${d.totals.avgLatencyMs} ms`} /></div>
          <section className="rounded-2xl border border-line bg-surface p-5"><h2 className="mb-3 text-lg font-bold">Calls per day, last 14 days</h2>
            <ResponsiveContainer width="100%" height={220}><BarChart data={d.perDay}><CartesianGrid stroke="#30264a" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={tick} /><YAxis allowDecimals={false} tick={tick} /><Tooltip {...tip} /><Bar dataKey="count" name="Calls" fill={PURPLE} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></section>
          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-2xl border border-line bg-surface p-5"><h2 className="mb-3 text-lg font-bold">By feature</h2>{d.byFeature.length === 0 ? <p className="text-sm text-muted">No usage yet.</p> : <ul className="space-y-2 text-sm">{d.byFeature.map((f) => <li key={f.feature} className="flex justify-between capitalize"><span>{f.feature}</span><span className="text-muted">{f.calls} calls · {f.success} succeeded</span></li>)}</ul>}</section>
            <section className="rounded-2xl border border-line bg-surface p-5"><h2 className="mb-3 text-lg font-bold">Recent errors</h2>{d.recentErrors.length === 0 ? <p className="text-sm text-muted">None.</p> : <ul className="space-y-2 text-xs">{d.recentErrors.map((e) => <li key={e._id}><span className="text-muted">{fmtDate(e.createdAt)} · {e.feature}</span><br />{e.error}</li>)}</ul>}</section>
          </div>
        </div>
      )}
    </Box>
  );
}

const TABS = [['overview', 'Overview', Overview], ['users', 'Users', Users], ['reviews', 'Reviews', Reviews], ['reports', 'Reports', Reports], ['ai', 'AI usage', AiUsage]];
export default function Admin() {
  const [tab, setTab] = useState('overview');
  const Active = TABS.find((t) => t[0] === tab)[2];
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Admin dashboard</h1>
      <div role="tablist" className="inline-flex flex-wrap rounded-lg border border-line p-1">{TABS.map(([k, n]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-md px-4 py-1.5 text-sm font-medium ${tab === k ? 'bg-glow text-white' : 'text-muted hover:text-ink'}`}>{n}</button>)}</div>
      <Active />
    </div>
  );
}
