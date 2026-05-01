import { useState, useMemo } from 'react';
import katex from 'katex';

/* ----------------------------------------------------------------
   ChainSliceScatter. The chain X -> M -> Y, conditioning case.
   Practice causes skill, skill causes score. Each dot is one
   athlete. The (practice, score) scatter shows the unconditional
   tilt at slope a*b. Drag the skill slider to pick a slice; dots
   in the slice are highlighted, and a separate ellipse + flat
   regression line are drawn for them. Inside the slice the
   correlation collapses, which is the conditioning rule made
   visible.

   Below the scatter, the marginal density of skill is drawn as a
   density strip with the slider window highlighted on it. That
   makes the third dimension (the variable being conditioned on)
   visually present, instead of an invisible parameter only the
   slider hints at.
   ---------------------------------------------------------------- */

const A = 0.75;
const B = 0.7;
const N = 320;
const RANGE = 3;
const SLICE_HALF = 0.35;

const SCATTER_LEFT = 60;
const SCATTER_RIGHT = 420;
const SCATTER_TOP = 30;
const SCATTER_BOTTOM = 390;
const SCATTER_W = SCATTER_RIGHT - SCATTER_LEFT;
const SCATTER_H = SCATTER_BOTTOM - SCATTER_TOP;
const DATA_TO_PX = SCATTER_W / (2 * RANGE);

const STRIP_TOP = 422;
const STRIP_BOTTOM = 462;
const STRIP_HEIGHT = STRIP_BOTTOM - STRIP_TOP;

const W = 480;
const TOTAL_H = 482;

function mapX(v: number): number {
  return SCATTER_LEFT + ((v + RANGE) / (2 * RANGE)) * SCATTER_W;
}

function mapY(v: number): number {
  return SCATTER_BOTTOM - ((v + RANGE) / (2 * RANGE)) * SCATTER_H;
}

/* ----------------------------------------------------------------
   3D scene constants and projection helpers. Shares the dataset and
   the M slider with the 2D view; differs in geometry, axes, and the
   shape of the slice plane.
   ---------------------------------------------------------------- */

const W3 = 480;
const H3 = 460;
const C3X = W3 / 2;
const C3Y = H3 / 2 + 6;
const SCALE3 = 50;

function project3D(x: number, m: number, y: number, yaw: number, pitch: number): [number, number, number] {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const x1 = x * cy + y * sy;
  const z1 = -x * sy + y * cy;
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const m2 = m * cp - z1 * sp;
  const z2 = m * sp + z1 * cp;
  return [x1, m2, z2];
}

function toScreen3D(x: number, m: number, y: number, yaw: number, pitch: number) {
  const [x1, m1, z1] = project3D(x, m, y, yaw, pitch);
  return {
    sx: C3X + x1 * SCALE3,
    sy: C3Y - m1 * SCALE3,
    depth: z1,
  };
}

function boxMuller(): [number, number] {
  const u1 = Math.max(Math.random(), 1e-10);
  const u2 = Math.random();
  const r = Math.sqrt(-2 * Math.log(u1));
  const t = 2 * Math.PI * u2;
  return [r * Math.cos(t), r * Math.sin(t)];
}

type Sample = { x: number; m: number; y: number };

const SAMPLES: Sample[] = (() => {
  const out: Sample[] = [];
  const sa = Math.sqrt(1 - A * A);
  const sb = Math.sqrt(1 - B * B);
  for (let i = 0; i < N; i++) {
    const [n1, n2] = boxMuller();
    const [n3] = boxMuller();
    const x = n1;
    const m = A * x + sa * n2;
    const y = B * m + sb * n3;
    out.push({ x, m, y });
  }
  return out;
})();

type Stats = { n: number; mx: number; my: number; sxx: number; syy: number; sxy: number };

function meanCovStats(pts: { x: number; y: number }[]): Stats {
  const n = pts.length;
  if (n === 0) return { n: 0, mx: 0, my: 0, sxx: 0, syy: 0, sxy: 0 };
  let mx = 0, my = 0;
  for (const p of pts) { mx += p.x; my += p.y; }
  mx /= n; my /= n;
  let sxx = 0, syy = 0, sxy = 0;
  for (const p of pts) {
    const dx = p.x - mx;
    const dy = p.y - my;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  if (n > 1) {
    sxx /= (n - 1);
    syy /= (n - 1);
    sxy /= (n - 1);
  }
  return { n, mx, my, sxx, syy, sxy };
}

function pearsonR(s: Stats): number | null {
  if (s.n < 3 || s.sxx < 1e-9 || s.syy < 1e-9) return null;
  return s.sxy / Math.sqrt(s.sxx * s.syy);
}

function regSlope(s: Stats): number | null {
  if (s.n < 3 || s.sxx < 1e-9) return null;
  return s.sxy / s.sxx;
}

type Ellipse = { cx: number; cy: number; rx: number; ry: number; angle: number };

/* 95% confidence ellipse for a bivariate Gaussian fit, derived from
   the sample covariance via its eigenvalues/vectors. chiSq = 5.991
   is the chi-squared critical value at 2 dof for 95% coverage. */
function ellipseFromStats(s: Stats, chiSq = 5.991): Ellipse | null {
  if (s.n < 3) return null;
  const T = s.sxx + s.syy;
  const D = s.sxx * s.syy - s.sxy * s.sxy;
  const disc = Math.sqrt(Math.max(T * T / 4 - D, 0));
  const lam1 = T / 2 + disc;
  const lam2 = T / 2 - disc;
  const angle = 0.5 * Math.atan2(2 * s.sxy, s.sxx - s.syy);
  const rx = Math.sqrt(Math.max(lam1, 0) * chiSq);
  const ry = Math.sqrt(Math.max(lam2, 0) * chiSq);
  return { cx: s.mx, cy: s.my, rx, ry, angle };
}

const M_DENSITY_PEAK = 1 / Math.sqrt(2 * Math.PI);

/* ----------------------------------------------------------------
   Pre-rendered KaTeX HTML for the math panel. Path coefficients a
   and b appear in the description above; the substitution and the
   chain-rule-derived correlations appear as the prediction the
   data has to confirm.
   ---------------------------------------------------------------- */

const KATEX_OPTS = { throwOnError: false };

const SUBSTITUTION_HTML = katex.renderToString(
  'Y = b\\,M + \\varepsilon_Y = b(a\\,X + \\varepsilon_M) + \\varepsilon_Y = a\\,b\\,X + (b\\,\\varepsilon_M + \\varepsilon_Y)',
  KATEX_OPTS,
);

const PRED_FULL_HTML = katex.renderToString(
  `r(X, Y) \\;=\\; a \\cdot b \\;=\\; ${A.toFixed(2)} \\cdot ${B.toFixed(2)} \\;=\\; ${(A * B).toFixed(3)}`,
  KATEX_OPTS,
);

const PRED_SLICE_HTML = katex.renderToString(
  'r(X, Y \\mid M) \\;=\\; 0',
  KATEX_OPTS,
);

const M_DENSITY_PATH = (() => {
  const points = 120;
  const step = (2 * RANGE) / points;
  const cmds: string[] = [`M ${mapX(-RANGE)} ${STRIP_BOTTOM}`];
  for (let i = 0; i <= points; i++) {
    const v = -RANGE + i * step;
    const d = Math.exp(-v * v / 2) / Math.sqrt(2 * Math.PI);
    const yPx = STRIP_BOTTOM - (d / M_DENSITY_PEAK) * (STRIP_HEIGHT - 4);
    cmds.push(`L ${mapX(v)} ${yPx}`);
  }
  cmds.push(`L ${mapX(RANGE)} ${STRIP_BOTTOM}`);
  cmds.push('Z');
  return cmds.join(' ');
})();

export default function ChainSliceScatter() {
  const [m0, setM0] = useState(0);
  const [view, setView] = useState<'2d' | '3d'>('2d');
  const [yaw, setYaw] = useState(-0.55);
  const [pitch, setPitch] = useState(0.35);

  const { slice, rest } = useMemo(() => {
    const s: Sample[] = [];
    const r: Sample[] = [];
    for (const p of SAMPLES) {
      if (Math.abs(p.m - m0) < SLICE_HALF) s.push(p);
      else r.push(p);
    }
    return { slice: s, rest: r };
  }, [m0]);

  const fullStats = useMemo(() => meanCovStats(SAMPLES.map((s) => ({ x: s.x, y: s.y }))), []);
  const sliceStats = useMemo(() => meanCovStats(slice.map((s) => ({ x: s.x, y: s.y }))), [slice]);

  const fullR = pearsonR(fullStats);
  const sliceR = pearsonR(sliceStats);

  const fullSlope = regSlope(fullStats);
  const sliceSlope = regSlope(sliceStats);

  const fullEllipse = useMemo(() => ellipseFromStats(fullStats), [fullStats]);
  const sliceEllipse = useMemo(() => ellipseFromStats(sliceStats), [sliceStats]);

  const sliceLeftX = mapX(m0 - SLICE_HALF);
  const sliceRightX = mapX(m0 + SLICE_HALF);

  return (
    <figure style={{
      margin: '2rem 0',
      padding: '1.4rem',
      background: 'white',
      border: '1px solid var(--rule)',
      borderRadius: 4,
    }}>
      <div style={{
        position: 'relative',
        textAlign: 'center',
        fontFamily: 'var(--font-sans)',
        fontSize: '.78rem',
        textTransform: 'uppercase',
        letterSpacing: '.08em',
        color: 'var(--ink-muted)',
        fontWeight: 600,
        marginBottom: '.4rem',
      }}>
        practice → skill → score
        <div style={{
          position: 'absolute',
          right: 0,
          top: '-2px',
          display: 'flex',
          gap: '2px',
          fontSize: '.7rem',
        }}>
          <ViewToggleBtn label="2D" active={view === '2d'} onClick={() => setView('2d')} />
          <ViewToggleBtn label="3D" active={view === '3d'} onClick={() => setView('3d')} />
        </div>
      </div>

      <p style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '.85rem',
        color: 'var(--ink-muted)',
        textAlign: 'center',
        margin: '0 auto 1rem',
        maxWidth: 480,
        lineHeight: 1.55,
      }}>
        Each dot is one athlete: practice (<i>X</i>) on the horizontal
        axis, tournament score (<i>Y</i>) on the vertical. Skill
        (<i>M</i>) is the <i>mediator</i>, the variable that carries
        the effect from <i>X</i> to <i>Y</i> and the one we'll
        condition on. The chain's two path coefficients are <i>a</i> ={' '}
        {A.toFixed(2)} on the <i>X</i> → <i>M</i> arrow and <i>b</i> ={' '}
        {B.toFixed(2)} on the <i>M</i> → <i>Y</i> arrow, the strengths
        of the two direct effects. Drag the slider on the skill strip
        below to pick a slice. Inside the slice, the tilt between
        practice and score collapses.
      </p>

      {view === '2d' && (
      <svg
        viewBox={`0 0 ${W} ${TOTAL_H}`}
        style={{ width: '100%', maxWidth: 560, display: 'block', margin: '0 auto' }}
        role="img"
        aria-label="Practice versus score scatter, with a slice on skill highlighted."
      >
        {/* faint axes through origin */}
        <line
          x1={mapX(-RANGE)} y1={mapY(0)}
          x2={mapX(RANGE)} y2={mapY(0)}
          stroke="#1a1a1a" strokeOpacity={0.18} strokeWidth={0.5}
        />
        <line
          x1={mapX(0)} y1={mapY(-RANGE)}
          x2={mapX(0)} y2={mapY(RANGE)}
          stroke="#1a1a1a" strokeOpacity={0.18} strokeWidth={0.5}
        />

        {/* outer scatter frame */}
        <rect
          x={SCATTER_LEFT} y={SCATTER_TOP}
          width={SCATTER_W} height={SCATTER_H}
          fill="none" stroke="#1a1a1a" strokeOpacity={0.18} strokeWidth={0.6}
        />

        {/* dots: rest of pool */}
        {rest.map((s, i) => (
          <circle
            key={`r${i}`}
            cx={mapX(s.x)} cy={mapY(s.y)}
            r={1.7} fill="#1a1a1a" opacity={0.18}
          />
        ))}

        {/* dots: slice */}
        {slice.map((s, i) => (
          <circle
            key={`s${i}`}
            cx={mapX(s.x)} cy={mapY(s.y)}
            r={2.4} fill="#b03a2e" opacity={0.85}
          />
        ))}

        {/* full-pool regression line */}
        {fullSlope !== null && (
          <ClippedLine
            slope={fullSlope}
            mx={fullStats.mx}
            my={fullStats.my}
            stroke="#666"
            strokeWidth={1.2}
            strokeDasharray="6,4"
          />
        )}

        {/* slice regression line */}
        {sliceSlope !== null && (
          <ClippedLine
            slope={sliceSlope}
            mx={sliceStats.mx}
            my={sliceStats.my}
            stroke="#b03a2e"
            strokeWidth={2}
          />
        )}

        {/* full-pool ellipse */}
        {fullEllipse && (
          <EllipseShape
            ellipse={fullEllipse}
            stroke="#666" strokeWidth={1.2} strokeOpacity={0.7}
          />
        )}

        {/* slice ellipse */}
        {sliceEllipse && (
          <EllipseShape
            ellipse={sliceEllipse}
            stroke="#b03a2e" strokeWidth={1.6} strokeOpacity={0.95}
          />
        )}

        {/* axis labels */}
        <text
          x={SCATTER_RIGHT - 4} y={mapY(0) - 6}
          textAnchor="end"
          fontSize={11}
          fontFamily="Inter, system-ui, sans-serif"
          fontStyle="italic"
          fill="#777"
        >practice</text>
        <text
          x={mapX(0) + 6} y={SCATTER_TOP + 11}
          fontSize={11}
          fontFamily="Inter, system-ui, sans-serif"
          fontStyle="italic"
          fill="#777"
        >score</text>

        {/* M density strip */}
        <text
          x={SCATTER_LEFT - 10} y={STRIP_TOP + STRIP_HEIGHT / 2 + 3}
          textAnchor="end"
          fontSize={11}
          fontFamily="Inter, system-ui, sans-serif"
          fontStyle="italic"
          fontWeight={600}
          fill="#1a1a1a"
        >skill</text>

        <path d={M_DENSITY_PATH} fill="#1a1a1a" fillOpacity={0.08} />

        {/* slice window */}
        <rect
          x={sliceLeftX} y={STRIP_TOP - 2}
          width={sliceRightX - sliceLeftX} height={STRIP_HEIGHT + 4}
          fill="#b03a2e" fillOpacity={0.18}
          stroke="#b03a2e" strokeWidth={1.2} strokeOpacity={0.75}
        />

        {/* m-axis baseline + ticks */}
        <line
          x1={mapX(-RANGE)} y1={STRIP_BOTTOM}
          x2={mapX(RANGE)} y2={STRIP_BOTTOM}
          stroke="#1a1a1a" strokeOpacity={0.32} strokeWidth={0.5}
        />
        {[-3, -2, -1, 0, 1, 2, 3].map((v) => (
          <g key={v}>
            <line
              x1={mapX(v)} y1={STRIP_BOTTOM}
              x2={mapX(v)} y2={STRIP_BOTTOM + 3}
              stroke="#1a1a1a" strokeOpacity={0.4} strokeWidth={0.5}
            />
            <text
              x={mapX(v)} y={STRIP_BOTTOM + 13}
              textAnchor="middle"
              fontSize={9}
              fontFamily="var(--font-mono)"
              fill="var(--ink-faint)"
            >{v}</text>
          </g>
        ))}
      </svg>
      )}

      {view === '3d' && (
        <ThreeDView
          slice={slice}
          rest={rest}
          m0={m0}
          yaw={yaw}
          pitch={pitch}
          fullStats={fullStats}
          sliceStats={sliceStats}
          fullSlope={fullSlope ?? 0}
          sliceSlope={sliceSlope ?? 0}
        />
      )}

      <div style={{
        margin: '1.2rem auto .4rem',
        maxWidth: 540,
        padding: '.9rem 1rem',
        border: '1px solid var(--rule)',
        borderRadius: 3,
      }}>
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '.7rem',
          textTransform: 'uppercase',
          letterSpacing: '.08em',
          color: 'var(--ink-muted)',
          fontWeight: 600,
          textAlign: 'center',
          marginBottom: '.6rem',
        }}>
          chain rule applied
        </div>

        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '.82rem',
          color: 'var(--ink-muted)',
          textAlign: 'center',
          marginBottom: '.3rem',
        }}>
          Substitute the chain forward:
        </div>
        <div
          style={{
            textAlign: 'center',
            margin: '.2rem 0 .9rem',
            fontSize: '.92rem',
            color: 'var(--ink)',
            overflowX: 'auto',
          }}
          dangerouslySetInnerHTML={{ __html: SUBSTITUTION_HTML }}
        />

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '.4rem 1.4rem',
          fontFamily: 'var(--font-sans)',
          fontSize: '.84rem',
          borderTop: '1px solid var(--rule)',
          paddingTop: '.7rem',
        }}>
          <PredVsData
            label="full pool"
            predHtml={PRED_FULL_HTML}
            value={fullR}
            n={SAMPLES.length}
          />
          <PredVsData
            label={`slice (skill ≈ ${m0.toFixed(2)})`}
            predHtml={PRED_SLICE_HTML}
            value={sliceR}
            n={slice.length}
            accent
          />
        </div>
      </div>

      <label style={{
        display: 'block',
        margin: '.6rem auto 0',
        maxWidth: 460,
        fontFamily: 'var(--font-sans)',
        fontSize: '.78rem',
        textTransform: 'uppercase',
        letterSpacing: '.06em',
        color: 'var(--ink-muted)',
      }}>
        skill near{' '}
        <strong style={{
          color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: '.85rem', textTransform: 'none',
        }}>{m0.toFixed(2)}</strong>
        <input
          type="range" min={-2} max={2} step={0.05}
          value={m0}
          onChange={(e) => setM0(parseFloat((e.target as HTMLInputElement).value))}
          style={{ display: 'block', width: '100%', marginTop: '.3rem', accentColor: 'var(--accent)' }}
        />
      </label>

      {view === '3d' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '.4rem 1rem',
          margin: '.6rem auto 0',
          maxWidth: 460,
        }}>
          <RotationSlider label="yaw" value={yaw} min={-Math.PI} max={Math.PI}
            onChange={setYaw} fmt={(v) => `${Math.round(v * 180 / Math.PI)}°`} />
          <RotationSlider label="pitch" value={pitch} min={-Math.PI / 2} max={Math.PI / 2}
            onChange={setPitch} fmt={(v) => `${Math.round(v * 180 / Math.PI)}°`} />
        </div>
      )}

      <figcaption style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '.8rem',
        color: 'var(--ink-faint)',
        textAlign: 'center',
        marginTop: '1rem',
        lineHeight: 1.55,
        maxWidth: 520,
        marginLeft: 'auto',
        marginRight: 'auto',
      }}>
        Grey ellipse and dashed line: the full pool, tilted at slope a·b.
        Red ellipse and solid line: the slice, with skill held near m₀.
        Inside the slice the cloud is round and the line is flat.
      </figcaption>
    </figure>
  );
}

/* ----------------------------------------------------------------
   Sub-components.
   ---------------------------------------------------------------- */

function EllipseShape({ ellipse, stroke, strokeWidth, strokeOpacity }: {
  ellipse: Ellipse;
  stroke: string;
  strokeWidth: number;
  strokeOpacity: number;
}) {
  const cxPx = mapX(ellipse.cx);
  const cyPx = mapY(ellipse.cy);
  const rxPx = ellipse.rx * DATA_TO_PX;
  const ryPx = ellipse.ry * DATA_TO_PX;
  /* Math angle is counterclockwise from +x in data space. SVG y is
     flipped, so a counterclockwise math rotation looks clockwise in
     SVG. Negate to make the visual angle match the data. */
  const angleDeg = -ellipse.angle * 180 / Math.PI;
  return (
    <ellipse
      cx={cxPx} cy={cyPx}
      rx={rxPx} ry={ryPx}
      transform={`rotate(${angleDeg}, ${cxPx}, ${cyPx})`}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeOpacity={strokeOpacity}
    />
  );
}

function ClippedLine({ slope, mx, my, stroke, strokeWidth, strokeDasharray }: {
  slope: number;
  mx: number;
  my: number;
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
}) {
  /* Draw y = slope*(x - mx) + my for x in [-RANGE, RANGE], clipped
     to the scatter rectangle so steep slope lines don't escape. */
  const x1 = -RANGE;
  const y1 = slope * (x1 - mx) + my;
  const x2 = RANGE;
  const y2 = slope * (x2 - mx) + my;
  const clipped = clipLineToBox(x1, y1, x2, y2, -RANGE, RANGE, -RANGE, RANGE);
  if (!clipped) return null;
  return (
    <line
      x1={mapX(clipped.x1)} y1={mapY(clipped.y1)}
      x2={mapX(clipped.x2)} y2={mapY(clipped.y2)}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDasharray}
    />
  );
}

/* Liang-Barsky line clipping against [xmin, xmax] x [ymin, ymax]. */
function clipLineToBox(
  x1: number, y1: number, x2: number, y2: number,
  xmin: number, xmax: number, ymin: number, ymax: number,
): { x1: number; y1: number; x2: number; y2: number } | null {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0, t1 = 1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - xmin, xmax - x1, y1 - ymin, ymax - y1];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return null;
    } else {
      const r = q[i] / p[i];
      if (p[i] < 0) { if (r > t1) return null; if (r > t0) t0 = r; }
      else { if (r < t0) return null; if (r < t1) t1 = r; }
    }
  }
  return {
    x1: x1 + t0 * dx,
    y1: y1 + t0 * dy,
    x2: x1 + t1 * dx,
    y2: y1 + t1 * dy,
  };
}

function PredVsData({ label, predHtml, value, n, accent = false }: {
  label: string;
  predHtml: string;
  value: number | null;
  n: number;
  accent?: boolean;
}) {
  return (
    <div>
      <div style={{
        textTransform: 'uppercase',
        letterSpacing: '.06em',
        fontSize: '.68rem',
        color: 'var(--ink-muted)',
        marginBottom: '.3rem',
      }}>{label}</div>
      <div
        style={{
          fontSize: '.88rem',
          color: 'var(--ink)',
          margin: '.1rem 0 .5rem',
          overflowX: 'auto',
        }}
        dangerouslySetInnerHTML={{ __html: predHtml }}
      />
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '.78rem',
        color: 'var(--ink-muted)',
      }}>
        data:{' '}
        <strong style={{
          color: accent ? 'var(--accent)' : 'var(--ink)',
          fontSize: '.92rem',
        }}>{value === null ? '—' : value.toFixed(3)}</strong>
        {'  '}
        <span style={{ color: 'var(--ink-faint)' }}>(n = {n})</span>
      </div>
    </div>
  );
}

function ViewToggleBtn({ label, active, onClick }: {
  label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: 'inherit',
        fontSize: 'inherit',
        letterSpacing: 'inherit',
        textTransform: 'inherit',
        padding: '2px 8px',
        border: '1px solid ' + (active ? 'var(--ink)' : 'var(--rule)'),
        background: active ? 'var(--ink)' : 'transparent',
        color: active ? 'white' : 'var(--ink-muted)',
        borderRadius: 3,
        cursor: 'pointer',
        fontWeight: active ? 600 : 500,
      }}
    >{label}</button>
  );
}

function RotationSlider({
  label, value, min, max, onChange, fmt,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  fmt: (v: number) => string;
}) {
  return (
    <label style={{
      display: 'block',
      fontFamily: 'var(--font-sans)',
      fontSize: '.78rem',
      textTransform: 'uppercase',
      letterSpacing: '.06em',
      color: 'var(--ink-muted)',
    }}>
      {label}{' '}
      <strong style={{
        color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: '.85rem', textTransform: 'none',
      }}>{fmt(value)}</strong>
      <input
        type="range" min={min} max={max} step={0.02}
        value={value}
        onChange={(e) => onChange(parseFloat((e.target as HTMLInputElement).value))}
        style={{ display: 'block', width: '100%', marginTop: '.3rem', accentColor: 'var(--accent)' }}
      />
    </label>
  );
}

function ThreeDView({
  slice, rest, m0, yaw, pitch, fullStats, sliceStats, fullSlope, sliceSlope,
}: {
  slice: Sample[];
  rest: Sample[];
  m0: number;
  yaw: number;
  pitch: number;
  fullStats: Stats;
  sliceStats: Stats;
  fullSlope: number;
  sliceSlope: number;
}) {
  /* Project everything once. Sort dots back-to-front so near dots
     overlay far ones; depth shading reinforces the perception. */
  const projectedRest = rest.map((s) => ({
    ...toScreen3D(s.x, s.m, s.y, yaw, pitch),
    inSlice: false as const,
  }));
  const projectedSlice = slice.map((s) => ({
    ...toScreen3D(s.x, s.m, s.y, yaw, pitch),
    inSlice: true as const,
  }));
  const all = [...projectedRest, ...projectedSlice].sort((a, b) => b.depth - a.depth);

  const axisX = toScreen3D(RANGE, 0, 0, yaw, pitch);
  const axisXNeg = toScreen3D(-RANGE, 0, 0, yaw, pitch);
  const axisM = toScreen3D(0, RANGE, 0, yaw, pitch);
  const axisMNeg = toScreen3D(0, -RANGE, 0, yaw, pitch);
  const axisY = toScreen3D(0, 0, RANGE, yaw, pitch);
  const axisYNeg = toScreen3D(0, 0, -RANGE, yaw, pitch);

  const sliceCorners = [
    toScreen3D(-RANGE, m0, -RANGE, yaw, pitch),
    toScreen3D( RANGE, m0, -RANGE, yaw, pitch),
    toScreen3D( RANGE, m0,  RANGE, yaw, pitch),
    toScreen3D(-RANGE, m0,  RANGE, yaw, pitch),
  ];

  /* Full-pool regression line at M=0; slice regression line at M=m0. */
  const fullY1 = fullSlope * (-RANGE - fullStats.mx) + fullStats.my;
  const fullY2 = fullSlope * ( RANGE - fullStats.mx) + fullStats.my;
  const fullLineP1 = toScreen3D(-RANGE, 0, fullY1, yaw, pitch);
  const fullLineP2 = toScreen3D( RANGE, 0, fullY2, yaw, pitch);

  const sliceYVal1 = sliceSlope * (-RANGE - sliceStats.mx) + sliceStats.my;
  const sliceYVal2 = sliceSlope * ( RANGE - sliceStats.mx) + sliceStats.my;
  const sliceLineP1 = toScreen3D(-RANGE, m0, sliceYVal1, yaw, pitch);
  const sliceLineP2 = toScreen3D( RANGE, m0, sliceYVal2, yaw, pitch);

  return (
    <svg
      viewBox={`0 0 ${W3} ${H3}`}
      style={{ width: '100%', maxWidth: 560, display: 'block', margin: '0 auto' }}
      role="img"
      aria-label="3D scatter of the chain X to M to Y with a slicing plane on M."
    >
      <polygon
        points={sliceCorners.map((c) => `${c.sx},${c.sy}`).join(' ')}
        fill="#b03a2e" fillOpacity={0.1}
        stroke="#b03a2e" strokeWidth={1.2} strokeOpacity={0.55}
        strokeDasharray="5,3"
      />

      <line x1={fullLineP1.sx} y1={fullLineP1.sy} x2={fullLineP2.sx} y2={fullLineP2.sy}
        stroke="#666" strokeWidth={1.4} strokeDasharray="6,4" />
      <line x1={sliceLineP1.sx} y1={sliceLineP1.sy} x2={sliceLineP2.sx} y2={sliceLineP2.sy}
        stroke="#b03a2e" strokeWidth={2} />

      <line x1={axisXNeg.sx} y1={axisXNeg.sy} x2={axisX.sx} y2={axisX.sy}
        stroke="#1a1a1a" strokeOpacity={0.32} strokeWidth={0.7} />
      <line x1={axisMNeg.sx} y1={axisMNeg.sy} x2={axisM.sx} y2={axisM.sy}
        stroke="#1a1a1a" strokeOpacity={0.32} strokeWidth={0.7} />
      <line x1={axisYNeg.sx} y1={axisYNeg.sy} x2={axisY.sx} y2={axisY.sy}
        stroke="#1a1a1a" strokeOpacity={0.32} strokeWidth={0.7} />

      <text x={axisX.sx + 6} y={axisX.sy + 4}
        fontSize={12} fontStyle="italic" fontWeight={600}
        fill="#1a1a1a" fontFamily="Inter, system-ui, sans-serif">X</text>
      <text x={axisM.sx + 6} y={axisM.sy + 4}
        fontSize={12} fontStyle="italic" fontWeight={600}
        fill="#1a1a1a" fontFamily="Inter, system-ui, sans-serif">M</text>
      <text x={axisY.sx + 6} y={axisY.sy + 4}
        fontSize={12} fontStyle="italic" fontWeight={600}
        fill="#1a1a1a" fontFamily="Inter, system-ui, sans-serif">Y</text>

      {all.map((d, i) => {
        const t = Math.max(0, Math.min(1, (d.depth + RANGE) / (2 * RANGE)));
        const lightness = 18 + t * 60;
        const size = 2.4 - t * 1.2;
        return (
          <circle
            key={i}
            cx={d.sx} cy={d.sy}
            r={d.inSlice ? 2.6 : size}
            fill={d.inSlice ? '#b03a2e' : `hsl(0, 0%, ${lightness}%)`}
            opacity={d.inSlice ? 0.92 : Math.max(0.45, 1 - t * 0.4)}
          />
        );
      })}
    </svg>
  );
}
