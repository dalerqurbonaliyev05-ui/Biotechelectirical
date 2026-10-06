import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container" style={{ padding: "60px 16px", textAlign: "center" }}>
      <p style={{ fontSize: "3rem" }} aria-hidden="true">
        🫣
      </p>
      <h1 style={{ font: "800 1.6rem var(--display)" }}>Sahifa topilmadi</h1>
      <p style={{ margin: "10px 0 20px", color: "var(--ink-2)" }}>Bu sahifa bekinmachoq o&apos;ynayapti shekilli.</p>
      <Link href="/" className="btn btn-primary">
        Milliy o&apos;yinlar
      </Link>
    </div>
  );
}
