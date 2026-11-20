// Silueta hráča – keď nemá nahranú fotku
export function Silhouette({ className = 'lgsil' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="24" r="12" fill="currentColor" />
      <path d="M10 60c0-13 10-21 22-21s22 8 22 21z" fill="currentColor" />
    </svg>
  );
}
