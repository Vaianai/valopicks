export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-[var(--vp-accent)] border-t-transparent animate-spin" />
        <p className="text-[var(--vp-text-muted)] text-sm font-semibold tracking-widest uppercase">Loading</p>
      </div>
    </div>
  );
}
