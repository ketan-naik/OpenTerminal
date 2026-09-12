export default function NotFound() {
  return (
    <div className="flex items-center justify-center h-screen bg-[var(--bg)] text-[var(--text)] font-mono text-[13px]">
      <div className="border border-[var(--border)] p-6 bg-[var(--panel)]">
        <h2 className="text-[var(--amber)] font-bold mb-2">404 — PAGE NOT FOUND</h2>
        <p className="text-[var(--text-dim)]">The requested terminal resource could not be found.</p>
      </div>
    </div>
  );
}
