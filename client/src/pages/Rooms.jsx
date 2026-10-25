import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import toast from 'react-hot-toast';
import useFetch from '../hooks/useFetch';
import { createRoom, joinRoom, listRooms } from '../services/rooms';
import { errMsg } from '../services/api';
import { EmptyState, ErrorState, Skeleton } from '../components/States';

const STATUS = { lobby: 'Collecting tastes', voting: 'Voting open', decided: 'Decided' };

export default function Rooms() {
  const nav = useNavigate();
  const { data, loading, error, reload } = useFetch(listRooms, []);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const run = (fn) => async (e) => {
    e.preventDefault(); setBusy(true);
    try { const room = await fn(); nav(`/rooms/${room.code}`); } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-extrabold">CineSync rooms</h1>
      <p className="mt-1 text-sm text-muted">Everyone shares what they’re in the mood for. We find movies the whole group can live with, then you vote.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <form onSubmit={run(() => createRoom(name))} className="space-y-3 rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-xl font-bold">Start a room</h2>
          <div><label className="label" htmlFor="rn">Room name</label><input id="rn" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Friday movie night" minLength={2} maxLength={40} required /></div>
          <button className="btn-primary" disabled={busy}>Create room</button>
        </form>
        <form onSubmit={run(() => joinRoom(code.trim().toUpperCase()))} className="space-y-3 rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-xl font-bold">Join with a code</h2>
          <div><label className="label" htmlFor="rc">6-character code</label><input id="rc" className="input font-mono uppercase tracking-widest" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} minLength={6} placeholder="K7M2QX" required /></div>
          <button className="btn-ghost" disabled={busy}>Join room</button>
        </form>
      </div>
      <h2 className="mb-3 mt-10 text-xl font-bold">Your rooms</h2>
      {loading ? <Skeleton className="h-24" /> : error ? <ErrorState message={error} onRetry={reload} /> :
        data.length === 0 ? <EmptyState title="No rooms yet" text="Create one and share the code with your friends." /> : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.map((r) => (
              <li key={r.code}>
                <Link to={`/rooms/${r.code}`} className="flex items-center justify-between rounded-xl border border-line bg-surface p-4 transition hover:border-accent">
                  <div><p className="font-medium">{r.name}</p><p className="text-xs text-muted">{STATUS[r.status]} · code {r.code}</p></div>
                  <span className="inline-flex items-center gap-1 text-sm text-muted"><Users className="h-4 w-4" />{r.members}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
