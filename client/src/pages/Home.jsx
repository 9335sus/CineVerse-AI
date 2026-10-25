import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import useFetch from '../hooks/useFetch';
import { getList } from '../services/movies';
import MovieRow from '../components/MovieRow';
import { Skeleton, ErrorState } from '../components/States';
import { img, year } from '../utils/format';

const SECTIONS = [['popular', 'Popular right now'], ['top-rated', 'Top rated of all time'], ['upcoming', 'Coming soon']];

function Section({ category, title }) {
  const { data, loading, error, reload } = useFetch(() => getList(category), [category]);
  return <MovieRow title={title} movies={data?.results} loading={loading} error={error} onRetry={reload} />;
}

export default function Home() {
  const { data, loading, error, reload } = useFetch(() => getList('trending'), []);
  const hero = data?.results?.[0];
  return (
    <>
      <section className="relative -mt-8 mb-10 min-h-[420px] overflow-hidden rounded-2xl border border-line bg-surface">
        {loading && <Skeleton className="absolute inset-0 !rounded-none" />}
        {error && <div className="p-6"><ErrorState message={error} onRetry={reload} /></div>}
        {hero && (
          <>
            {hero.backdropPath && <img src={img(hero.backdropPath, 'w1280')} alt="" className="absolute inset-0 h-full w-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
            <div className="relative flex min-h-[420px] max-w-xl flex-col justify-end p-6 text-white sm:p-10">
              <p className="mb-2 text-sm text-violet-300">Trending this week · {year(hero.releaseDate)}</p>
              <h1 className="text-4xl font-extrabold sm:text-6xl">{hero.title}</h1>
              <p className="mt-3 line-clamp-3 text-sm text-white/80">{hero.overview}</p>
              <Link to={`/movie/${hero.id}`} className="btn-primary mt-5 w-fit"><Info className="h-4 w-4" /> View details</Link>
            </div>
          </>
        )}
      </section>
      <MovieRow title="Trending this week" movies={data?.results?.slice(1)} loading={loading} error={error} onRetry={reload} />
      {SECTIONS.map(([c, t]) => <Section key={c} category={c} title={t} />)}
    </>
  );
}
