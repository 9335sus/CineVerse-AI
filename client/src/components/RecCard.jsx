import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { BookmarkPlus, BookmarkCheck, Sparkles, ListChecks } from 'lucide-react';
import toast from 'react-hot-toast';
import { setLibrary } from '../services/movies';
import { errMsg } from '../services/api';
import { img, year } from '../utils/format';

export default function RecCard({ m }) {
  const { user } = useSelector((s) => s.auth);
  const [saved, setSaved] = useState(false);
  const save = async () => {
    if (!user) return;
    try {
      await setLibrary(m.tmdbId, { title: m.title, posterPath: m.posterPath, releaseDate: m.releaseDate, voteAverage: m.voteAverage, genreIds: m.genreIds, inWatchlist: !saved });
      setSaved(!saved); toast.success(saved ? 'Removed from watchlist' : 'Added to watchlist');
    } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <article className="flex gap-4 rounded-2xl border border-line bg-surface p-4">
      <Link to={`/movie/${m.tmdbId}`} className="w-24 shrink-0 sm:w-28">
        {img(m.posterPath) ? <img src={img(m.posterPath)} alt={`${m.title} poster`} loading="lazy" className="aspect-[2/3] w-full rounded-lg object-cover" /> : <div className="aspect-[2/3] rounded-lg bg-raised" />}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link to={`/movie/${m.tmdbId}`} className="font-display text-lg font-bold hover:text-accent">{m.title}</Link>
            <p className="text-xs text-muted">{year(m.releaseDate)}{m.runtime ? ` · ${m.runtime} min` : ''} · {m.voteAverage?.toFixed(1)}/10</p>
          </div>
          <div className="text-right"><p className="text-2xl font-extrabold text-accent">{Math.round(m.score)}</p><p className="text-[11px] text-muted">match</p></div>
        </div>
        <p className="mt-2 text-sm leading-relaxed">{m.explanation}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs text-muted" title={m.explanationSource === 'ai' ? 'Written by an AI model' : 'Generated from matching rules'}>
            {m.explanationSource === 'ai' ? <><Sparkles className="h-3 w-3" /> AI explanation</> : <><ListChecks className="h-3 w-3" /> Rule-based explanation</>}
          </span>
          {user && <button onClick={save} className="btn-ghost !px-2.5 !py-1 text-xs">{saved ? <BookmarkCheck className="h-3 w-3 text-accent" /> : <BookmarkPlus className="h-3 w-3" />}{saved ? 'Saved' : 'Save to watchlist'}</button>}
        </div>
      </div>
    </article>
  );
}
