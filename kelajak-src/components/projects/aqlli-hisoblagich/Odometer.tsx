"use client";
// Mexanik hisoblagich uslubidagi raqamlar: har bir xona 0–9 lentasi, qiymat o'zgarganda aylanib o'tadi.

export default function Odometer({ value, intDigits = 5, fracDigits = 2, unit = "kVt·soat" }: { value: number; intDigits?: number; fracDigits?: number; unit?: string }) {
  const safe = Number.isFinite(value) && value > 0 ? value : 0;
  const scaled = Math.floor(safe * 10 ** fracDigits);
  const total = intDigits + fracDigits;
  const digits = String(scaled % 10 ** total).padStart(total, "0").split("").map(Number);
  return (
    <div className="odo" role="img" aria-label={`${safe.toFixed(fracDigits).replace(".", ",")} ${unit}`}>
      {digits.map((d, k) => (
        <span key={k} className={`odo-cell${k >= intDigits ? " frac" : ""}`}>
          <span className="odo-strip" style={{ transform: `translateY(${-d * 10}%)` }}>
            {Array.from({ length: 10 }, (_, n) => (
              <span key={n}>{n}</span>
            ))}
          </span>
        </span>
      ))}
      <small className="odo-unit">{unit}</small>
    </div>
  );
}
