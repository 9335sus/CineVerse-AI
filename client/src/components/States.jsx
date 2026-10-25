import { Film, AlertTriangle } from 'lucide-react';

export const Skeleton = ({ className = '' }) => <div className={`skeleton rounded-lg ${className}`} aria-hidden />;

export const CardGridSkeleton = ({ count = 10 }) => (
  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" aria-busy="true">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i}><Skeleton className="aspect-[2/3] w-full" /><Skeleton className="mt-2 h-4 w-3/4" /></div>
    ))}
  </div>
);

export const EmptyState = ({ title, text, action }) => (
  <div className="flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-16 text-center">
    <Film className="mb-4 h-10 w-10 text-muted" />
    <h3 className="text-xl font-bold">{title}</h3>
    {text && <p className="mt-2 max-w-md text-sm text-muted">{text}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const ErrorState = ({ message, onRetry }) => (
  <div role="alert" className="flex flex-col items-center rounded-2xl border border-red-500/30 bg-red-500/5 px-6 py-12 text-center">
    <AlertTriangle className="mb-3 h-9 w-9 text-red-400" />
    <p className="max-w-md text-sm">{message}</p>
    {onRetry && <button onClick={onRetry} className="btn-ghost mt-4">Try again</button>}
  </div>
);
