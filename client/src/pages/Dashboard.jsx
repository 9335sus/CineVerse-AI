import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import useFetch from '../hooks/useFetch';
import { getCompatibility, getDna } from '../services/analytics';
import { EmptyState, ErrorState, Skeleton } from '../components/States';

const PURPLE = '#8b5cf6';
const tick = { fill: '#9a8fb8', fontSize: 12 };
const tip = { contentStyle: { background: '#1e1630', border: '1px solid #30264a', borderRadius: 8, color: '#f0ecfa' }, cursor: { fill: 'rgba(139,92,246,0.12)' } };

const Card = ({ title, children, className = '' }) => <section className={`rounded-2xl border border-line bg-surface p-5 ${className}`}><h2 className="mb-3 text-lg font-bold">{title}</h2>{children}</section>;
const Stat = ({ label, value }) => <div className="rounded-2xl border border-line bg-surface p-5"><p className="text-sm text-muted">{label}</p><p className="mt-1 font-display text-4xl font-extrabold text-accent">{value ?? '—'}</p></div>;

export default function Dashboard() {
  const dna = useFetch(getDna, []);
  const friends = useFetch(getCompatibility, []);
  if (dna.loading) return <div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-72" /></div>;
  if (dna.error) return <ErrorState message={dna.error} onRetry={dna.reload} />;
  const d = dna.data;
  if (d.totalWatched === 0 && d.reviewsWritten === 0) return <EmptyState title="Your Movie DNA starts here" text="Mark a few movies as watched and rate them. Your genres, ratings and taste profile will appear on this page." action={<Link to="/search" className="btn-primary">Find movies</Link>} />;

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-extrabold">Your Movie DNA</h1><p className="text-sm text-muted">Built from the movies you marked as watched and the ratings you gave.</p></div>
      <div className="grid gap-4 sm:grid-cols-3"><Stat label="Movies watched" value={d.totalWatched} /><Stat label="Reviews written" value={d.reviewsWritten} /><Stat label="Average rating" value={d.averageRating ? `${d.averageRating}/10` : null} /></div>

      {d.insights.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {d.insights.map((i) => <div key={i.title} className="rounded-2xl border border-glow/40 bg-glow/10 p-5"><p className="font-display text-lg font-bold">{i.title}</p><p className="mt-1 text-sm">{i.text}</p></div>)}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Favorite genres">
          {d.favoriteGenres.length === 0 ? <p className="text-sm text-muted">Watch a few movies to see your genres.</p> : (
            <div role="img" aria-label={`Bar chart of favorite genres. Top: ${d.favoriteGenres[0].name}`}>
              <ResponsiveContainer width="100%" height={Math.max(220, d.favoriteGenres.length * 36)}>
                <BarChart data={d.favoriteGenres} layout="vertical" margin={{ left: 10, right: 16 }}>
                  <CartesianGrid stroke="#30264a" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={tick} /><YAxis type="category" dataKey="name" width={90} tick={tick} />
                  <Tooltip {...tip} /><Bar dataKey="count" name="Movies" radius={[0, 6, 6, 0]}>{d.favoriteGenres.map((g, i) => <Cell key={g.id} fill={PURPLE} fillOpacity={1 - i * 0.08} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
        <Card title="Ratings distribution">
          {d.reviewsWritten === 0 ? <p className="text-sm text-muted">Rate movies in the review box on a movie page.</p> : (
            <div role="img" aria-label="Bar chart of how many movies you gave each rating from 1 to 10">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={d.ratingsDistribution}><CartesianGrid stroke="#30264a" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="rating" tick={tick} /><YAxis allowDecimals={false} tick={tick} /><Tooltip {...tip} /><Bar dataKey="count" name="Movies" fill={PURPLE} radius={[6, 6, 0, 0]} /></BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
        <Card title="Monthly viewing activity" className="lg:col-span-2">
          <div role="img" aria-label="Line chart of movies watched per month over the last 12 months">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={d.monthlyActivity} margin={{ right: 16 }}><CartesianGrid stroke="#30264a" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={tick} /><YAxis allowDecimals={false} tick={tick} /><Tooltip {...tip} /><Line type="monotone" dataKey="count" name="Movies" stroke={PURPLE} strokeWidth={3} dot={{ r: 3, fill: PURPLE }} /></LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Taste compatibility with friends">
        {friends.loading ? <Skeleton className="h-16" /> : friends.error ? <ErrorState message={friends.error} onRetry={friends.reload} /> :
          friends.data.length === 0 ? <p className="text-sm text-muted">Friends are people you share a CineSync room with. <Link className="text-accent hover:underline" to="/rooms">Start a room</Link> to compare tastes.</p> : (
            <ul className="space-y-3">
              {friends.data.map((f) => (
                <li key={f.id} className="flex items-center gap-3 text-sm">
                  <span className="w-28 truncate font-medium">{f.name}</span>
                  {f.score == null ? <span className="text-muted">Needs more watched movies to compare</span> : (
                    <><span className="h-2 flex-1 overflow-hidden rounded bg-raised"><span className="block h-full bg-glow" style={{ width: `${f.score}%` }} /></span><span className="w-12 text-right font-bold">{f.score}%</span></>
                  )}
                  <span className="w-24 text-right text-xs text-muted">{f.sharedMovies} shared</span>
                </li>
              ))}
            </ul>
          )}
      </Card>
    </div>
  );
}
