import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function TrailerModal({ videoKey, onClose }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label="Trailer" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <button aria-label="Close trailer" onClick={onClose} className="absolute -top-10 right-0 text-white"><X /></button>
        <div className="aspect-video overflow-hidden rounded-xl bg-black">
          <iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${videoKey}?autoplay=1`} title="Movie trailer" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
        </div>
      </div>
    </div>
  );
}
