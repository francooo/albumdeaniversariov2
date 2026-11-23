export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-card bg-sand/70 p-6 ${className}`}>
      <div className="mb-4 h-4 w-32 rounded-full bg-divider" />
      <div className="mb-2 h-8 w-24 rounded-full bg-divider" />
      <div className="h-3 w-40 rounded-full bg-divider" />
    </div>
  );
}

export function ImageSkeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-sand ${className}`} />;
}

export function TextSkeleton({ width = 'w-full', height = 'h-4' }: { width?: string; height?: string }) {
  return <div className={`animate-pulse rounded-full bg-sand ${width} ${height}`} />;
}

export function AlbumCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[270/228] rounded-[24px] bg-sand" />
      <div className="mt-3 h-5 w-2/3 rounded-full bg-sand" />
      <div className="mt-2 h-4 w-1/3 rounded-full bg-sand" />
    </div>
  );
}
