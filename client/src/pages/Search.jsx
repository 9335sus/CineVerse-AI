import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import useFetch from '../hooks/useFetch';
import { getGenres, searchMovies } from '../services/movies';
import MovieCard from '../components/MovieCard';
import Pagination from '../components/Pagination';
import { CardGridSkeleton, EmptyState, ErrorState } from '../components/States';
import { LANGUAGES } from '../utils/format';

const FIELDS = ['query', 'genre', 'language', 'year', 'minRating'];

export default function Search() {
  const [params, setParams] = useSearchParams();
  const get = (k) => params.get(k) || '';
  const [form, setForm] = useState(() => Object.fromEntries(FIELDS.map((k) => [k, get(k)])));
  const page = parseInt(params.get('page')) || 1;
  const genres = useFetch(getGenres, []);

  useEffect(() => { setForm(Object.fromEntries(FIELDS.map((k) => [k, params.get(k) || '']))); }, [params]);

  const query = Object.fromEntries([...params.entries()]);
  const { data, loading, error, reload } = useFetch(() => searchMovies(query), [params.toString()]);

  const apply = (e) => {
    e.preventDefault();
    const next = {};
    FIELDS.forEach((k) => form[k] && (next[k] = form[k]));
    setParams(next);
  };
  const reset = () => { setForm(Object.fromEntries(FIELDS.map((k) => [k, '']))); setParams({}); };
  const goTo = (p) => { setParams({ ...query, page: p }); window.scrollTo({ top: 0 }); };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <form onSubmit={apply} className="h-fit space-y-4 rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-24">
        <h2 className="flex items-center gap-2 text-lg font-bold"><SlidersHorizontal className="h-4 w-4" /> Filters</h2>
        <div><label className="label" htmlFor="q">Title</label><input id="q" className="input" value={form.query} onChange={set('query')} placeholder="e.g. Inception" /></div>
        <div>
          <label className="label" htmlFor="genre">Genre</label>
          <select id="genre" className="input" value={form.genre} onChange={set('genre')}>
            <option value="">All genres</option>
            {genres.data?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="lang">Language</label>
          <select id="lang" className="input" value={form.language} onChange={set('language')}>
            <option value="">Any language</option>
            {LANGUAGES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
          </select>
        </div>
        <div><label className="label" htmlFor="year">Release year</label><input id="year" type="number" min="1900" max="2100" className="input" value={form.year} onChange={set('year')} placeholder="2024" /></div>
        <div>
          <label className="label" htmlFor="rating">Minimum rating</label>
          <select id="rating" className="input" value={form.minRating} onChange={set('minRating')}>
            <option value="">Any</option>{[5, 6, 7, 8].map((r) => <option key={r} value={r}>{r}+</option>)}
          </select>
        </div>
        <div className="flex gap-2"><button className="btn-primary flex-1">Apply</button><button type="button" onClick={reset} className="btn-ghost">Reset</button></div>
      </form>

      <section aria-live="polite">
        <h1 className="mb-5 text-3xl font-extrabold">{get('query') ? `Results for “${get('query')}”` : 'Discover movies'}</h1>
        {loading ? <CardGridSkeleton /> : error ? <ErrorState message={error} onRetry={reload} /> :
          data.results.length === 0 ? <EmptyState title="No movies match these filters" text="Try removing a filter or searching a different title." action={<button onClick={reset} className="btn-ghost">Clear filters</button>} /> : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">{data.results.map((m) => <MovieCard key={m.id} movie={m} />)}</div>
              <Pagination page={page} totalPages={data.totalPages} onChange={goTo} />
            </>
          )}
      </section>
    </div>
  );
}
