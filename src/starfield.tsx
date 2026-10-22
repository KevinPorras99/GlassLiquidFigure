import { memo, useMemo, type CSSProperties } from "react";

export function createStars(count: number) {
  let seed = 7219;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  return Array.from({ length: Math.max(0, Math.min(300, Math.round(count))) }, () => ({
    x: random() * 100, y: random() * 100, size: 0.8 + random() * 1.8,
    opacity: 0.25 + random() * 0.65, duration: 3 + random() * 5, delay: -random() * 8,
  }));
}

export const starfieldStyles = `
.orb-starfield { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.orb-star { position: absolute; border-radius: 50%; background: #dfeaff; box-shadow: 0 0 5px #a9c8ff80; animation: orb-star-twinkle var(--star-duration) ease-in-out infinite; animation-delay: var(--star-delay); }
@keyframes orb-star-twinkle { 0%, 100% { opacity: var(--star-opacity); } 50% { opacity: calc(var(--star-opacity) * .4); } }
@media (prefers-reduced-motion: reduce) { .orb-star { animation: none; opacity: var(--star-opacity); } }
`;

function starStyle(star: ReturnType<typeof createStars>[number], brightness: number): CSSProperties {
  return { left: `${star.x}%`, top: `${star.y}%`, width: star.size, height: star.size,
    "--star-opacity": star.opacity * brightness, "--star-duration": `${star.duration}s`, "--star-delay": `${star.delay}s`,
  } as CSSProperties;
}

export const Starfield = memo(function Starfield({ count, brightness }: { count: number; brightness: number }) {
  const stars = useMemo(() => createStars(count), [count]);
  return <div className="orb-starfield" aria-hidden="true">
    {stars.map((star, index) => <span key={index} className="orb-star" style={starStyle(star, brightness)} />)}
  </div>;
});

export function createStarfieldMarkup(count: number, brightness: number): string {
  return `<div class="orb-starfield" aria-hidden="true">${createStars(count).map(star =>
    `<span class="orb-star" style="left:${star.x}%;top:${star.y}%;width:${star.size}px;height:${star.size}px;--star-opacity:${star.opacity * brightness};--star-duration:${star.duration}s;--star-delay:${star.delay}s"></span>`
  ).join("")}</div>`;
}
