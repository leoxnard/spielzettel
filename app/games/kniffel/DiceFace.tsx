const PIPS: Record<number, Array<[number, number]>> = {
  1: [[12, 12]],
  2: [
    [7.5, 7.5],
    [16.5, 16.5],
  ],
  3: [
    [7.5, 7.5],
    [12, 12],
    [16.5, 16.5],
  ],
  4: [
    [7.5, 7.5],
    [16.5, 7.5],
    [7.5, 16.5],
    [16.5, 16.5],
  ],
  5: [
    [7.5, 7.5],
    [16.5, 7.5],
    [12, 12],
    [7.5, 16.5],
    [16.5, 16.5],
  ],
  6: [
    [7.5, 7.5],
    [16.5, 7.5],
    [7.5, 12],
    [16.5, 12],
    [7.5, 16.5],
    [16.5, 16.5],
  ],
};

export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

export function DiceFace({
  value,
  size = 28,
}: {
  value: DieValue;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-label={String(value)}
      role="img"
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      {PIPS[value].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="1.9" fill="currentColor" />
      ))}
    </svg>
  );
}
