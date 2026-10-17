import { uz } from "../i18n/uz";

// 14-bo'lim talabi: har sahifada kichik ogohlantirish.
export default function Disclaimer() {
  return (
    <footer className="border-t border-line/50 px-4 py-3 text-center text-xs text-muted">
      <span aria-hidden="true">ⓘ </span>
      {uz.app.disclaimer}
    </footer>
  );
}
