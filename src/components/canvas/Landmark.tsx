
import { type Landmark as LandmarkType } from '../../store';

export function Landmark({ data }: { data: LandmarkType }) {
  const w = 140;
  const h = 200;
  return (
    <g
      className="canvas-landmark cursor-grab active:cursor-grabbing"
      transform={`translate(${data.x}, ${data.y})`}
    >
      <rect
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        fill="transparent"
        stroke="none"
        pointerEvents="all"
        className="canvas-landmark"
      />
      <image
        href={`${import.meta.env.BASE_URL}yggdrasil-lg.png`}
        xlinkHref={`${import.meta.env.BASE_URL}yggdrasil-lg.png`}
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        preserveAspectRatio="xMidYMid meet"
        className="pointer-events-none rounded-lg"
        filter="url(#gold-tint)"
      />
    </g>
  );
}
