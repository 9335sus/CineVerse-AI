import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import useFetch from '../hooks/useFetch';
import { chooseStory, getStory } from '../services/stories';
import { errMsg } from '../services/api';
import { ErrorState, Skeleton } from '../components/States';
import { SPOILER, Unofficial } from './Stories';

export default function StoryView() {
  const { id } = useParams();
  const { data, loading, error, reload } = useFetch(() => getStory(id), [id]);
  const [story, setStory] = useState(null);
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef(null);
  useEffect(() => { if (data) setStory(data); }, [data]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [story?.segments.length]);

  if (loading || (!story && !error)) return <Skeleton className="h-96" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const last = story.segments[story.segments.length - 1];
  const choose = async (body) => {
    setBusy(true);
    try { setStory(await chooseStory(story._id, body)); setCustom(''); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <article className="mx-auto max-w-3xl space-y-5">
      <Link to="/stories" className="text-sm text-muted hover:text-ink">← All stories</Link>
      <header>
        <h1 className="text-3xl font-extrabold">{story.movie.title}: an alternate story</h1>
        <p className="mt-1 text-sm text-muted">What if: “{story.premise}” · {SPOILER[story.spoilerLevel]} · Part {story.segments.length} of {story.maxSegments}</p>
      </header>
      <Unofficial />
      <div className="space-y-6">
        {story.segments.map((s, i) => (
          <section key={i} aria-label={`Part ${i + 1}`}>
            <p className="whitespace-pre-wrap leading-relaxed">{s.narrative}</p>
            {s.chosen && <p className="mt-3 border-l-2 border-glow pl-3 text-sm text-accent">You chose: {s.chosen}</p>}
          </section>
        ))}
      </div>
      {story.status === 'ended' ? (
        <div className="rounded-2xl border border-line bg-surface p-5 text-center"><p className="font-display text-xl font-bold">The end</p><Link to="/stories" className="btn-primary mt-3">Start another story</Link></div>
      ) : (
        <div className="space-y-3 rounded-2xl border border-line bg-surface p-5" aria-busy={busy}>
          <p className="font-medium">What happens next?</p>
          {last.choices.map((c, i) => <button key={i} disabled={busy} onClick={() => choose({ choiceIndex: i })} className="btn-ghost w-full !justify-start text-left">{c}</button>)}
          <form onSubmit={(e) => { e.preventDefault(); choose({ custom }); }} className="flex gap-2 pt-1">
            <input aria-label="Write your own choice" className="input" minLength={3} maxLength={200} placeholder="…or write your own" value={custom} onChange={(e) => setCustom(e.target.value)} />
            <button className="btn-primary" disabled={busy || custom.trim().length < 3}>Go</button>
          </form>
          {busy && <p className="text-sm text-muted">Writing the next part…</p>}
        </div>
      )}
      <div ref={end} />
    </article>
  );
}
