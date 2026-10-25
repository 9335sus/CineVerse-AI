export default function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Pagination">
      <button className="btn-ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button>
      <span className="text-sm text-muted">Page {page} of {totalPages}</span>
      <button className="btn-ghost" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next</button>
    </nav>
  );
}
