import { useState } from 'react';

export default function ImageCarousel({ images = [], className = '' }) {
  const [current, setCurrent] = useState(0);

  // Always render a fixed-size container so images fill their slot properly
  const containerClass = `relative group overflow-hidden ${className}`;

  if (!images.length) {
    return (
      <div className={`${containerClass} bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center`}>
        <span className="text-5xl opacity-30">📦</span>
      </div>
    );
  }

  const prev = (e) => {
    e.stopPropagation();
    setCurrent((c) => (c === 0 ? images.length - 1 : c - 1));
  };

  const next = (e) => {
    e.stopPropagation();
    setCurrent((c) => (c === images.length - 1 ? 0 : c + 1));
  };

  return (
    <div className={containerClass}>
      <img
        key={current}
        src={images[current]}
        alt={`product-${current}`}
        className="w-full h-full object-cover transition-opacity duration-300"
      />

      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/65 text-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-lg leading-none"
          >
            ‹
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/65 text-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-lg leading-none"
          >
            ›
          </button>

          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                className={`rounded-full transition-all duration-200 ${
                  i === current ? 'bg-white w-4 h-1.5' : 'bg-white/50 w-1.5 h-1.5'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
