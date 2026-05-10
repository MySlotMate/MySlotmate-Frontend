"use client";

export default function PhotoGallery({ images }: { images: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {images.map((img, i) => (
        <div key={i} className="aspect-4/3 overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img}
            alt={`Gallery ${i + 1}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          />
        </div>
      ))}
    </div>
  );
}
