export function Hourglass({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 120" className={className} aria-hidden="true">
      <path d="M10 5 H90 L50 58 Z M10 115 H90 L50 62 Z" fill="currentColor" />
    </svg>
  );
}
