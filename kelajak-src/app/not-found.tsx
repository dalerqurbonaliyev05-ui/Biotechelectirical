import Link from "next/link";

export default function NotFound() {
  return (
    <div className="kl-wrap kl-index">
      <h1>Sahifa topilmadi</h1>
      <p>Bunday loyiha hali yo‘q yoki manzil noto‘g‘ri.</p>
      <Link className="kl-btn kl-btn-primary" href="/">
        Kelajak loyihalariga qaytish
      </Link>
    </div>
  );
}
