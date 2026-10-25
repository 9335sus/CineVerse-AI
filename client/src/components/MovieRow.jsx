import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MovieCard from './MovieCard';
import { Skeleton, ErrorState } from './States';

export default function MovieRow({ title, movies, loading, error, onRetry }) {
  const ref = useRef(null);
  const scroll = (d) => ref.current?.scrollBy({ left: d * 600, behavior: 'smooth' });
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="hidden gap-2 sm:flex">
          <button aria-label="Scroll left" onClick={() => scroll(-1)} className="btn-ghost !p-2"><ChevronLeft className="h-4 w-4" /></button>
          <button aria-label="Scroll right" onClick={() => scroll(1)} className="btn-ghost !p-2"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      {error ? <ErrorState message={error} onRetry={onRetry} /> : (
        <div ref={ref} className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[2/3] w-36 shrink-0 sm:w-44" />)
            : movies?.map((m) => <MovieCard key={m.id} movie={m} className="w-36 shrink-0 sm:w-44" />)}
        </div>
      )}
    </section>
  );
}
