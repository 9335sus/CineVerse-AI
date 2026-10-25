import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, Trash2 } from 'lucide-react';
import useFetch from '../hooks/useFetch';
import { getLibrary, setLibrary } from '../services/movies';
import { errMsg } from '../services/api';
import MovieCard from '../components/MovieCard';
import Pagination from '../components/Pagination';
import { CardGridSkeleton, EmptyState, ErrorState } from '../components/States';

export default function Watchlist() {
  const [tab, setTab] = useState('watchlist');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch(() => getLibrary(tab, page), [tab, page]);

  const act = async (m, patch, msg) => {
    try {
      await setLibrary(m.tmdbId, { title: m.title, posterPath: m.posterPath, releaseDate: m.releaseDate, voteAverage: m.voteAverage, genreIds: m.genreIds, ...patch });
      toast.success(msg); reload();
    } catch (e) { toast.error(errMsg(e)); }
  };
  const switchTab = (t) => { setTab(t); setPage(1); };

  return (
    <div>
      <h1 className="text-3xl font-extrabold">My library</h1>
      <div role="tablist" className="mt-4 mb-6 inline-flex rounded-lg border border-line p-1">
        {[['watchlist', 'Watchlist'], ['watched', 'Watched']].map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => switchTab(k)} className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${tab === k ? 'bg-glow text-white' : 'text-muted hover:text-ink'}`}>{label}</button>
        ))}
      </div>
      {loading ? <CardGridSkeleton count={5} /> : error ? <ErrorState message={error} onRetry={reload} /> :
        data.items.length === 0 ? (
          <EmptyState title={tab === 'watchlist' ? 'Your watchlist is empty' : 'Nothing marked as watched yet'} text="Find something you want to see and save it here." action={<Link to="/search" className="btn-primary">Discover movies</Link>} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {data.items.map((m) => (
                <div key={m._id}>
                  <MovieCard movie={m} />
                  <div className="mt-2 flex gap-2">
                    {tab === 'watchlist'
                      ? <button className="btn-ghost flex-1 !px-2 !py-1.5 text-xs" onClick={() => act(m, { watched: true }, 'Marked as watched')}><Eye className="h-3 w-3" /> Watched</button>
                      : <button className="btn-ghost flex-1 !px-2 !py-1.5 text-xs" onClick={() => act(m, { watched: false, inWatchlist: true }, 'Moved back to watchlist')}>Watch again</button>}
                    <button aria-label={`Remove ${m.title}`} className="btn-ghost !px-2 !py-1.5" onClick={() => act(m, { watched: false, inWatchlist: false }, 'Removed')}><Trash2 className="h-3 w-3" /></button>
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
          </>
        )}
    </div>
  );
}
