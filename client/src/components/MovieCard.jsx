import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { img, year } from '../utils/format';

export default function MovieCard({ movie, className = '' }) {
  const poster = img(movie.posterPath);
  const rating = movie.voteAverage;
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className={className}>
      <Link to={`/movie/${movie.id ?? movie.tmdbId}`} className="group block">
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-line bg-raised">
          {poster ? (
            <img src={poster} alt={`${movie.title} poster`} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
          ) : (
            <div className="flex h-full items-center justify-center p-3 text-center text-sm text-muted">{movie.title}</div>
          )}
          {rating > 0 && (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white backdrop-blur">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />{rating.toFixed(1)}
            </span>
          )}
        </div>
        <h3 className="mt-2 line-clamp-1 font-sans text-sm font-medium">{movie.title}</h3>
        <p className="text-xs text-muted">{year(movie.releaseDate)}</p>
      </Link>
    </motion.div>
  );
}
