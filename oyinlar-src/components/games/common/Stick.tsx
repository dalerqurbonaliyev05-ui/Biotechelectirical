// Sxematik "tayoqcha odam" (SVG). Burchaklar gradusda.
// body: tana yo'nalishi (0 = tik yuqoriga, musbat = o'ngga og'ish).
// arms/legs: 0 = pastga, 90 = o'ngga, -90 = chapga, 180 = yuqoriga.
interface Props {
  x: number;
  y: number;
  body?: number;
  arms?: [number, number];
  legs?: [number, number];
  color: string;
  belt?: string;
}

const rad = (d: number) => (d * Math.PI) / 180;

export default function Stick({ x, y, body = 0, arms = [30, -30], legs = [20, -20], color, belt }: Props) {
  const bx = Math.sin(rad(body));
  const by = -Math.cos(rad(body));
  const sh = { x: x + bx * 30, y: y + by * 30 };
  const head = { x: x + bx * 40, y: y + by * 40 };
  const limb = (from: { x: number; y: number }, a: number, len: number) => ({
    x: from.x + Math.sin(rad(a)) * len,
    y: from.y + Math.cos(rad(a)) * len,
  });
  const a1 = limb(sh, arms[0] + body, 24);
  const a2 = limb(sh, arms[1] + body, 24);
  const l1 = limb({ x, y }, legs[0] + body, 30);
  const l2 = limb({ x, y }, legs[1] + body, 30);
  const beltPt = { x: x + bx * 3, y: y + by * 3 };
  return (
    <g stroke={color} strokeWidth="5" strokeLinecap="round" fill="none">
      <line x1={x} y1={y} x2={sh.x} y2={sh.y} />
      <line x1={sh.x} y1={sh.y} x2={a1.x} y2={a1.y} />
      <line x1={sh.x} y1={sh.y} x2={a2.x} y2={a2.y} />
      <line x1={x} y1={y} x2={l1.x} y2={l1.y} />
      <line x1={x} y1={y} x2={l2.x} y2={l2.y} />
      <circle cx={head.x} cy={head.y} r="7" fill={color} stroke="none" />
      {belt && <circle cx={beltPt.x} cy={beltPt.y} r="4" fill={belt} stroke="none" />}
    </g>
  );
}
