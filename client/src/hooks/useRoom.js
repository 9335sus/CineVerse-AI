import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../services/api';
import { getRoom } from '../services/rooms';
import { getSocket } from '../services/socket';

// Loads the room over REST, then keeps it live over Socket.IO (updates, presence, voting).
export default function useRoom(code) {
  const [room, setRoom] = useState(null);
  const [presence, setPresence] = useState([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    let retried = false;
    const s = getSocket();
    setLoading(true); setError(null);
    getRoom(code).then((r) => live && (setRoom(r), setLoading(false))).catch((e) => live && (setError(errMsg(e)), setLoading(false)));

    const join = () => s.emit('room:join', { code }, (res) => {
      if (!live || !res?.ok) return;
      setConnected(true);
      setRoom((p) => ({ ...res.room, myPreferences: p?.myPreferences ?? res.room.myPreferences }));
    });
    const onUpdated = (r) => live && setRoom((p) => ({ ...r, myPreferences: p?.myPreferences ?? null }));
    const onClosed = () => live && (setRoom(null), setError('The host closed this room.'));
    const onDisc = () => setConnected(false);
    const onErr = async (err) => {
      if (/Authentication/.test(err.message) && !retried) {
        retried = true;
        try { await api.get('/auth/me'); s.connect(); } catch { /* session expired */ }
      }
    };
    s.on('connect', join); s.on('disconnect', onDisc); s.on('connect_error', onErr);
    s.on('room:updated', onUpdated); s.on('room:presence', setPresence); s.on('room:closed', onClosed);
    if (s.connected) join(); else s.connect();

    return () => {
      live = false;
      s.emit('room:leave', { code });
      s.off('connect', join); s.off('disconnect', onDisc); s.off('connect_error', onErr);
      s.off('room:updated', onUpdated); s.off('room:presence', setPresence); s.off('room:closed', onClosed);
    };
  }, [code]);

  const vote = useCallback((tmdbId) => {
    getSocket().emit('room:vote', { code, tmdbId }, (res) => { if (!res?.ok) toast.error(res?.message || 'Vote failed'); });
  }, [code]);

  return { room, setRoom, presence, connected, loading, error, vote };
}
