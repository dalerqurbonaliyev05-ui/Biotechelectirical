const NBSP = ' ';

// 1500000 -> "1 500 000" (pul butun son sifatida saqlanadi)
export const fmt = (n) => {
  const v = Math.round(Number(n) || 0);
  const s = Math.abs(v)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return (v < 0 ? '-' : '') + s;
};

export const som = (n) => `${fmt(n)} so'm`;

export const MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktyabr', 'noyabr', 'dekabr',
];
export const MONTHS_CAP = MONTHS.map((m) => m[0].toUpperCase() + m.slice(1));

// "2025-10-07" -> "7-oktyabr 2025"
export const longDate = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return `${d}-${MONTHS[m - 1]} ${y}`;
};

export const shortDate = (key) => {
  const [, m, d] = key.split('-').map(Number);
  return `${d}-${MONTHS[m - 1]}`;
};
