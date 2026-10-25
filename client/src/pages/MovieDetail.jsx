import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { BookmarkPlus, BookmarkCheck, CalendarPlus, Eye, EyeOff, MessageSquare, Play, Star, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import useFetch from '../hooks/useFetch';
import { errMsg } from '../services/api';
import * as api from '../services/movies';
import { createPlan } from '../services/planner';
import { img, runtime, year } from '../utils/format';
import MovieCard from '../components/MovieCard';
import TrailerModal from '../components/TrailerModal';
import WhereToWatch from '../components/WhereToWatch';
import Pagination from '../components/Pagination';
import { ErrorState, Skeleton } from '../components/States';

function Reviews({ movie }) {
  const { user } = useSelector((s) => s.auth);
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch(() => api.getReviews(movie.id, page), [movie.id, page]);
  const [rating, setRating] = useState(8);
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.saveReview(movie.id, { movieTitle: movie.title, posterPath: movie.posterPath, rating, content });
      toast.success('Review saved'); setContent(''); setPage(1); reload();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  const remove = async (id) => {
    try { await api.deleteReview(id); toast.success('Review deleted'); reload(); } catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <section className="mt-12">
      <h2 className="text-2xl font-bold">Reviews {data?.count > 0 && <span className="text-base font-normal text-muted">· {data.average}/10 from {data.count}</span>}</h2>
      {user ? (
        <form onSubmit={submit} className="mt-4 space-y-3 rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center gap-3">
            <label htmlFor="rate" className="text-sm text-muted">Your rating</label>
            <select id="rate" className="input !w-24" value={rating} onChange={(e) => setRating(+e.target.value)}>
              {Array.from({ length: 10 }, (_, i) => 10 - i).map((n) => <option key={n} value={n}>{n}/10</option>)}
            </select>
          </div>
          <textarea className="input min-h-24" maxLength={2000} placeholder="What did you think? (optional)" aria-label="Review text" value={content} onChange={(e) => setContent(e.target.value)} />
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Post review'}</button>
          <p className="text-xs text-muted">Posting again updates your existing review.</p>
        </form>
      ) : <p className="mt-3 text-sm text-muted"><Link className="text-accent hover:underline" to="/login">Sign in</Link> to rate and review this movie.</p>}
      <div className="mt-6 space-y-4">
        {loading ? <Skeleton className="h-24" /> : error ? <ErrorState message={error} onRetry={reload} /> :
          data.items.length === 0 ? <p className="text-sm text-muted">No reviews yet. Be the first to share your take.</p> :
            data.items.map((r) => (
              <article key={r._id} className="rounded-xl border border-line p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{r.user?.name} <span className="ml-2 inline-flex items-center gap-1 text-sm text-muted"><Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />{r.rating}/10</span></p>
                  {(user?.id === r.user?._id || user?.role === 'admin') && <button aria-label="Delete review" onClick={() => remove(r._id)} className="text-muted hover:text-red-400"><Trash2 className="h-4 w-4" /></button>}
                </div>
                {r.content && <p className="mt-2 whitespace-pre-wrap text-sm">{r.content}</p>}
              </article>
            ))}
      </div>
      {data && <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />}
    </section>
  );
}

export default function MovieDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const { data: m, loading, error, reload } = useFetch(() => api.getMovie(id), [id]);
  const [lib, setLib] = useState({ inWatchlist: false, watched: false });
  const [trailer, setTrailer] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    if (user) api.getLibraryStatus(id).then(setLib).catch(() => {});
  }, [id, user]);

  const update = async (patch, msg) => {
    if (!user) { toast('Sign in to save movies'); return nav('/login', { state: { from: `/movie/${id}` } }); }
    try {
      const res = await api.setLibrary(id, { title: m.title, posterPath: m.posterPath, releaseDate: m.releaseDate, voteAverage: m.voteAverage, genreIds: m.genreIds, ...patch });
      setLib({ inWatchlist: res.inWatchlist, watched: res.watched });
      toast.success(msg);
    } catch (e) { toast.error(errMsg(e)); }
  };

  const plan = async () => {
    if (!user) { toast('Sign in to plan movies'); return nav('/login', { state: { from: `/movie/${id}` } }); }
    try { await createPlan({ tmdbId: m.id, title: m.title, posterPath: m.posterPath, releaseDate: m.releaseDate, voteAverage: m.voteAverage, runtime: m.runtime || undefined, genreIds: m.genreIds }); toast.success('Added to your plans'); }
    catch (e) { toast.error(errMsg(e)); }
  };

  if (loading) return <Skeleton className="h-[480px]" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <article>
      <div className="relative overflow-hidden rounded-2xl border border-line">
        {m.backdropPath && <img src={img(m.backdropPath, 'w1280')} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-bg/30" />
        <div className="relative grid gap-6 p-6 md:grid-cols-[260px_1fr] md:p-10">
          {img(m.posterPath, 'w500') ? <img src={img(m.posterPath, 'w500')} alt={`${m.title} poster`} className="w-48 rounded-xl shadow-2xl md:w-full" /> : <div className="aspect-[2/3] rounded-xl bg-raised" />}
          <div>
            <h1 className="text-4xl font-extrabold md:text-5xl">{m.title} <span className="font-normal text-muted">({year(m.releaseDate)})</span></h1>
            {m.tagline && <p className="mt-1 italic text-muted">{m.tagline}</p>}
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />{m.voteAverage?.toFixed(1)} ({m.voteCount} votes)</span>
              <span>{runtime(m.runtime)}</span><span>{m.genres.map((g) => g.name).join(', ')}</span>
              {m.director && <span>Directed by {m.director}</span>}
            </p>
            <h2 className="mt-5 text-lg font-bold">Overview</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed">{m.overview || 'No overview available.'}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {m.trailerKey && <button className="btn-primary" onClick={() => setTrailer(true)}><Play className="h-4 w-4" /> Watch trailer</button>}
              <button className="btn-ghost" onClick={() => update({ inWatchlist: !lib.inWatchlist }, lib.inWatchlist ? 'Removed from watchlist' : 'Added to watchlist')}>
                {lib.inWatchlist ? <BookmarkCheck className="h-4 w-4 text-accent" /> : <BookmarkPlus className="h-4 w-4" />}{lib.inWatchlist ? 'In watchlist' : 'Add to watchlist'}
              </button>
              <button className="btn-ghost" onClick={() => update({ watched: !lib.watched }, lib.watched ? 'Marked as unwatched' : 'Marked as watched')}>
                {lib.watched ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{lib.watched ? 'Mark unwatched' : 'Mark watched'}
              </button>
              <button className="btn-ghost" onClick={plan}><CalendarPlus className="h-4 w-4" /> Plan to watch</button>
              <Link to={`/discuss/${m.id}`} className="btn-ghost"><MessageSquare className="h-4 w-4" /> Discussion</Link>
            </div>
          </div>
        </div>
      </div>

      <WhereToWatch movieId={m.id} title={m.title} />

      {m.cast.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-2xl font-bold">Cast</h2>
          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
            {m.cast.map((c) => (
              <div key={c.id} className="w-28 shrink-0">
                {img(c.profilePath, 'w185') ? <img src={img(c.profilePath, 'w185')} alt={c.name} loading="lazy" className="aspect-[2/3] w-full rounded-lg object-cover" /> : <div className="aspect-[2/3] rounded-lg bg-raised" />}
                <p className="mt-1 text-sm font-medium leading-tight">{c.name}</p>
                <p className="text-xs text-muted">{c.character}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <Reviews movie={m} />

      {m.similar.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-3 text-2xl font-bold">More like this</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">{m.similar.slice(0, 6).map((s) => <MovieCard key={s.id} movie={s} />)}</div>
        </section>
      )}
      {trailer && <TrailerModal videoKey={m.trailerKey} onClose={() => setTrailer(false)} />}
    </article>
  );
}
