export function TableRowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
      </td>
      <td className="px-6 py-4 text-center">
        <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto" />
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <div className="w-8 h-8 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="w-8 h-8 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      </td>
    </tr>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900/50 rounded-xl p-6 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
      <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
      <div className="h-3 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
    </div>
  );
}

export function ImageSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-slate-200 dark:bg-slate-700 animate-pulse ${className}`}>
      <div className="w-full h-full flex items-center justify-center">
        <span className="material-symbols-outlined text-slate-400 text-4xl">image</span>
      </div>
    </div>
  );
}

export function TextSkeleton({ width = 'w-full', height = 'h-4' }: { width?: string; height?: string }) {
  return (
    <div className={`bg-slate-200 dark:bg-slate-700 rounded animate-pulse ${width} ${height}`} />
  );
}
