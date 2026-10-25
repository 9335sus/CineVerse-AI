import { useState } from 'react';
import { ExternalLink, Tv } from 'lucide-react';
import useFetch from '../hooks/useFetch';
import { getProviders } from '../services/movies';
import { img } from '../utils/format';
import { providerLink } from '../utils/providerLinks';
import { Skeleton } from './States';

const REGIONS = [['IN', 'India'], ['US', 'United States'], ['GB', 'United Kingdom'], ['CA', 'Canada'], ['AU', 'Australia']];
const GROUPS = [['stream', 'Stream (subscription)'], ['free', 'Free'], ['ads', 'Free with ads'], ['rent', 'Rent'], ['buy', 'Buy']];

function Provider({ p, title, fallback }) {
  const logo = img(p.logoPath, 'w92');
  const href = providerLink(p.name, title, fallback);
  const inner = (
    <>
      {logo ? <img src={logo} alt="" loading="lazy" className="h-7 w-7 rounded" /> : <span className="grid h-7 w-7 place-items-center rounded bg-raised text-xs">{p.name[0]}</span>}
      <span>{p.name}</span>
      {href && <ExternalLink className="h-3 w-3 text-muted" aria-hidden />}
    </>
  );
  const base = 'flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm';
  return (
    <li>
      {href
        ? <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Open ${p.name} (opens in a new tab)`} className={`${base} transition hover:border-accent hover:bg-raised`}>{inner}</a>
        : <span className={base}>{inner}</span>}
    </li>
  );
}

export default function WhereToWatch({ movieId, title }) {
  const [region, setRegion] = useState('IN');
  const { data, loading, error, reload } = useFetch(() => getProviders(movieId, region), [movieId, region]);
  const groups = data ? GROUPS.filter(([k]) => data[k]?.length) : [];

  return (
    <section className="mt-10" aria-labelledby="wtw">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="wtw" className="flex items-center gap-2 text-2xl font-bold"><Tv className="h-5 w-5 text-accent" /> Where to watch</h2>
        <div className="flex items-center gap-2"><label htmlFor="wr" className="text-sm text-muted">Country</label>
          <select id="wr" className="input !w-40 !py-1.5" value={region} onChange={(e) => setRegion(e.target.value)}>{REGIONS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></div>
      </div>
      {loading ? <Skeleton className="h-16" /> : error ? (
        <p role="alert" className="text-sm text-muted">Could not load availability. <button onClick={reload} className="text-accent hover:underline">Try again</button></p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted">Not listed on any streaming, rental or purchase service in this country right now. Availability changes often, so check again later.</p>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-muted">Click a service to open it. Big services open a search for this movie, so you may need to sign in there.</p>
          {groups.map(([k, label]) => (
            <div key={k}><h3 className="mb-2 font-sans text-sm font-medium text-muted">{label}</h3><ul className="flex flex-wrap gap-2">{data[k].map((p) => <Provider key={p.id} p={p} title={title} fallback={data.link} />)}</ul></div>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-muted">
        Availability data provided by JustWatch via TMDB. CineVerse AI does not host or stream movies; use the services above to watch legally.
        {data?.link && <> <a href={data.link} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">See full details</a>.</>}
      </p>
    </section>
  );
}
