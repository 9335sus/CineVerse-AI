// Multi-select / single-select chip group. `tone="dislike"` renders a red active state.
export default function Chips({ options, selected, onToggle, tone = 'like', label }) {
  const on = tone === 'dislike' ? 'border-red-500 bg-red-500 text-white' : 'border-glow bg-glow text-white';
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map(({ id, name }) => {
        const active = Array.isArray(selected) ? selected.includes(id) : selected === id;
        return (
          <button type="button" key={id} aria-pressed={active} onClick={() => onToggle(id)}
            className={`rounded-full border px-3 py-1 text-sm transition ${active ? on : 'border-line text-muted hover:text-ink'}`}>{name}</button>
        );
      })}
    </div>
  );
}
