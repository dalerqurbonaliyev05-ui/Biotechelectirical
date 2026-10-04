import type { SVGProps } from 'react';

const P: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6 8-6s8 2 8 6',
  bag: 'M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.8L12 16.8 6.7 19.6l1.1-5.8L3.5 9.7l5.9-.8z',
  pin: 'M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  phone: 'M6.5 3h3l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5L16 12l4 1.5v3a2 2 0 0 1-2 2A15 15 0 0 1 4.5 5a2 2 0 0 1 2-2z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  back: 'M15 5l-7 7 7 7',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  chef: 'M7 14v6h10v-6M6 14a4 4 0 0 1-1-7.7A4 4 0 0 1 12 4a4 4 0 0 1 7 2.3A4 4 0 0 1 18 14z',
  bike: 'M6 19a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM18 19a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM6 15.5l4-8h5l3 8M10 7.5h-2',
  wallet: 'M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2zM16 14.5h.01',
  gift: 'M4 11h16v9H4zM3 8h18v3H3zM12 8v12M12 8c-2 0-4-.5-4-2.2S10.5 4 12 8c1.5-4 4-3.9 4-2.2S14 8 12 8z',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  power: 'M12 3v8M7 6.5a8 8 0 1 0 10 0',
  card: 'M3 6h18v12H3zM3 10h18',
  cash: 'M3 7h18v10H3zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  close: 'M6 6l12 12M18 6 6 18',
  chart: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
  logout: 'M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M15 8l4 4-4 4M19 12H9',
  nav: 'M3 11l18-8-8 18-2-8z',
  camera: 'M4 8h3l1.5-2h7L17 8h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
};

export type IconName = keyof typeof P;

export function Icon({ name, size = 22, filled, ...rest }: { name: IconName; size?: number; filled?: boolean } & Omit<SVGProps<SVGSVGElement>, 'name'>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <path d={P[name]} />
    </svg>
  );
}
