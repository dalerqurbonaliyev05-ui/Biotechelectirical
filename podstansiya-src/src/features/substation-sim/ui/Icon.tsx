// Yengil SVG ikonalar to'plami (tashqi kutubxonasiz).
const PATHS: Record<string, string> = {
  play: "M8 5v14l11-7z",
  settings:
    "M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7zm7.4-2.5.1-1-.1-1 2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3h-4l-.4 2.6c-.6.3-1.2.6-1.7 1l-2.5-1-2 3.5L6.5 11l-.1 1 .1 1-2.1 1.6 2 3.5 2.5-1c.5.4 1.1.7 1.7 1L11 21h4l.4-2.6c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.5z",
  trophy: "M7 4h10v3a5 5 0 0 1-10 0zM5 5H3v2a4 4 0 0 0 4 4M19 5h2v2a4 4 0 0 1-4 4M12 12v4m-4 4h8l-1-4H9z",
  exit: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11",
  back: "M15 5l-7 7 7 7",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z",
  star: "M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4 6.5 20.3l1-6.2L3 9.7l6.2-.9z",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7z",
  check: "M5 12l5 5 9-10",
  cross: "M6 6l12 12M18 6 6 18",
  phone: "M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2z",
  book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM8 7h7",
  map: "M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15m6-12v15",
  task: "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2",
  info: "M12 8h.01M11 12h1v5h1M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  warn: "M12 3 2 21h20zM12 10v5m0 3h.01",
  zoomIn: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4-4M11 8v6M8 11h6",
  zoomOut: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4-4M8 11h6",
  fit: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  doc: "M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7",
};

export default function Icon({ name, className = "h-5 w-5", fill = false }: { name: string; className?: string; fill?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill={fill ? "currentColor" : "none"}
      stroke={fill ? "none" : "currentColor"}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[name] ?? PATHS.info} />
    </svg>
  );
}
