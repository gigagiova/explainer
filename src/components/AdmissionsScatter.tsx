import { useState, useMemo } from 'react';

/* ----------------------------------------------------------------
   AdmissionsScatter. Selection bias as conditioning on a collider.
   A fixed pool of applicants with two *independent* unit-normal
   traits (smart, charm). The college's admission rule is a
   weighted threshold:

       admit if  a * smart  +  b * charm  >  threshold

   The reader drags three sliders: the threshold, the weight a on
   smart, and the weight b on charm. The full-pool correlation
   stays near zero because the traits are independent. The
   admitted subset's correlation is negative.

   The threshold line in (smart, charm) space is the level set
   a * smart + b * charm = threshold, with slope -a/b. That slope
   is the geometric origin of the negative conditional correlation
   in the admitted subset: as smart goes up by one unit along the
   line, charm goes down by a/b to keep the weighted sum constant.
   The three sliders together give the reader hands-on access to
   both the conditioning operation (threshold) and the geometry of
   the level set (a, b).
   ---------------------------------------------------------------- */

const W = 380;
const H = 380;
const PAD = 22;
const PLOT_W = W - 2 * PAD;
const PLOT_H = H - 2 * PAD;
const RANGE = 3;
const N = 380;

function boxMuller(): [number, number] {
  const u1 = Math.max(Math.random(), 1e-10);
  const u2 = Math.random();
  const r = Math.sqrt(-2 * Math.log(u1));
  const t = 2 * Math.PI * u2;
  return [r * Math.cos(t), r * Math.sin(t)];
}

type Applicant = { s: number; c: number };

const APPLICANTS: Applicant[] = (() => {
  const arr: Applicant[] = [];
  for (let i = 0; i < N; i++) {
    const [s, c] = boxMuller();
    arr.push({ s, c });
  }
  return arr;
})();

function correlation(pts: Applicant[]): number | null {
  const n = pts.length;
  if (n < 3) return null;
  let mS = 0, mC = 0;
  for (const p of pts) { mS += p.s; mC += p.c; }
  mS /= n; mC /= n;
  let cov = 0, vS = 0, vC = 0;
  for (const p of pts) {
    const ds = p.s - mS;
    const dc = p.c - mC;
    cov += ds * dc;
    vS += ds * ds;
    vC += dc * dc;
  }
  if (vS < 1e-9 || vC < 1e-9) return null;
  return cov / Math.sqrt(vS * vC);
}

const FULL_R = correlation(APPLICANTS) ?? 0;

function mapX(v: number) {
  return PAD + ((v + RANGE) / (2 * RANGE)) * PLOT_W;
}
function mapY(v: number) {
  return PAD + ((RANGE - v) / (2 * RANGE)) * PLOT_H;
}

/* Liang-Barsky clip of the line a*s + b*c = t against the
   [-RANGE, RANGE] x [-RANGE, RANGE] data box. Handles vertical
   (b = 0) and horizontal (a = 0) cases. */
function thresholdLine(
  a: number, b: number, t: number,
): { s1: number; c1: number; s2: number; c2: number } | null {
  const haveA = Math.abs(a) > 1e-9;
  const haveB = Math.abs(b) > 1e-9;
  if (!haveA && !haveB) return null;

  let s1: number, c1: number, s2: number, c2: number;
  if (haveB) {
    /* Pick a wide s range and let the box-clip do the rest. */
    const wide = RANGE * 4;
    s1 = -wide; c1 = (t - a * s1) / b;
    s2 =  wide; c2 = (t - a * s2) / b;
  } else {
    /* Vertical line at s = t / a. */
    const s = t / a;
    s1 = s; c1 = -RANGE * 2;
    s2 = s; c2 =  RANGE * 2;
  }

  const ds = s2 - s1;
  const dc = c2 - c1;
  let u0 = 0, u1 = 1;
  const p = [-ds, ds, -dc, dc];
  const q = [s1 - (-RANGE), RANGE - s1, c1 - (-RANGE), RANGE - c1];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return null;
    } else {
      const r = q[i] / p[i];
      if (p[i] < 0) { if (r > u1) return null; if (r > u0) u0 = r; }
      else          { if (r < u0) return null; if (r < u1) u1 = r; }
    }
  }
  return {
    s1: s1 + u0 * ds,
    c1: c1 + u0 * dc,
    s2: s1 + u1 * ds,
    c2: c1 + u1 * dc,
  };
}

export default function AdmissionsScatter() {
  const [threshold, setThreshold] = useState(1.6);
  const [a, setA] = useState(1);
  const [b, setB] = useState(1);

  const { admitted, rejected } = useMemo(() => {
    const ad: Applicant[] = [];
    const rj: Applicant[] = [];
    for (const p of APPLICANTS) {
      if (a * p.s + b * p.c > threshold) ad.push(p);
      else rj.push(p);
    }
    return { admitted: ad, rejected: rj };
  }, [a, b, threshold]);

  const admitR = correlation(admitted);
  const rejectR = correlation(rejected);
  const tline = thresholdLine(a, b, threshold);

  const slopeText = Math.abs(b) < 1e-9
    ? 'vertical'
    : (-a / b).toFixed(2);

  return (
    <figure style={{
      margin: '2rem 0',
      padding: '1.4rem',
      background: 'white',
      border: '1px solid var(--rule)',
      borderRadius: 4,
    }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', maxWidth: 460, display: 'block', margin: '0 auto' }}
        role="img"
        aria-label="Applicant pool with admission threshold; admitted subset shows negative correlation."
      >
        {/* plot frame */}
        <rect
          x={PAD} y={PAD}
          width={PLOT_W} height={PLOT_H}
          fill="none" stroke="#1a1a1a" strokeOpacity={0.18} strokeWidth={0.6}
        />

        {/* axes through origin */}
        <line x1={mapX(0)} y1={PAD} x2={mapX(0)} y2={H - PAD} stroke="#1a1a1a" strokeOpacity={0.2} strokeWidth={0.5} />
        <line x1={PAD} y1={mapY(0)} x2={W - PAD} y2={mapY(0)} stroke="#1a1a1a" strokeOpacity={0.2} strokeWidth={0.5} />

        {/* applicant points */}
        {APPLICANTS.map((p, i) => {
          const isAdmit = a * p.s + b * p.c > threshold;
          return (
            <circle
              key={i}
              cx={mapX(p.s)} cy={mapY(p.c)}
              r={1.8}
              fill={isAdmit ? '#b03a2e' : '#1a1a1a'}
              opacity={isAdmit ? 0.85 : 0.16}
            />
          );
        })}

        {/* threshold line: the level set a*s + b*c = t */}
        {tline && (
          <line
            x1={mapX(tline.s1)} y1={mapY(tline.c1)}
            x2={mapX(tline.s2)} y2={mapY(tline.c2)}
            stroke="#b03a2e"
            strokeWidth={1.6}
            strokeDasharray="5,4"
          />
        )}

        {/* axis labels */}
        <text x={W - PAD - 4} y={mapY(0) - 5} textAnchor="end" fontSize={11} fill="#777" fontFamily="Inter, system-ui, sans-serif">smart</text>
        <text x={mapX(0) + 6} y={PAD + 11} fontSize={11} fill="#777" fontFamily="Inter, system-ui, sans-serif">charm</text>

        {/* line annotation: equation + slope, at top right */}
        <g>
          <text
            x={W - PAD - 4} y={H - PAD - 18}
            textAnchor="end"
            fontSize={10}
            fontStyle="italic"
            fill="#b03a2e"
            fontFamily="Inter, system-ui, sans-serif"
          >
            level set: {a.toFixed(2)}·smart + {b.toFixed(2)}·charm = {threshold.toFixed(2)}
          </text>
          <text
            x={W - PAD - 4} y={H - PAD - 5}
            textAnchor="end"
            fontSize={10}
            fontStyle="italic"
            fill="#b03a2e"
            fontFamily="Inter, system-ui, sans-serif"
          >
            slope = −a/b = {slopeText}
          </text>
        </g>
      </svg>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(9rem, 1fr))',
        gap: '.5rem 1.4rem',
        margin: '1rem auto .4rem',
        maxWidth: 460,
        fontFamily: 'var(--font-sans)',
        fontSize: '.85rem',
      }}>
        <Readout label="full pool" value={FULL_R.toFixed(3)} sub={`n = ${N}`} />
        <Readout label="admitted" value={admitR === null ? '—' : admitR.toFixed(3)} sub={`n = ${admitted.length}`} accent />
        <Readout label="rejected" value={rejectR === null ? '—' : rejectR.toFixed(3)} sub={`n = ${rejected.length}`} />
      </div>

      <label style={SLIDER_LABEL_STYLE}>
        admit if{' '}
        <strong style={STRONG_STYLE}>{a.toFixed(2)}</strong>·smart{' '}
        +{' '}
        <strong style={STRONG_STYLE}>{b.toFixed(2)}</strong>·charm{' '}
        &gt;{' '}
        <strong style={STRONG_STYLE}>{threshold.toFixed(2)}</strong>
        <input
          type="range" min={-1} max={4} step={0.1}
          value={threshold}
          onChange={(e) => setThreshold(parseFloat((e.target as HTMLInputElement).value))}
          style={SLIDER_INPUT_STYLE}
        />
      </label>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '0 1rem',
        maxWidth: 460,
        margin: '0 auto',
      }}>
        <label style={SLIDER_LABEL_STYLE}>
          weight <i>a</i> (smart):{' '}
          <strong style={STRONG_STYLE}>{a.toFixed(2)}</strong>
          <input
            type="range" min={0} max={2} step={0.05}
            value={a}
            onChange={(e) => setA(parseFloat((e.target as HTMLInputElement).value))}
            style={SLIDER_INPUT_STYLE}
          />
        </label>
        <label style={SLIDER_LABEL_STYLE}>
          weight <i>b</i> (charm):{' '}
          <strong style={STRONG_STYLE}>{b.toFixed(2)}</strong>
          <input
            type="range" min={0} max={2} step={0.05}
            value={b}
            onChange={(e) => setB(parseFloat((e.target as HTMLInputElement).value))}
            style={SLIDER_INPUT_STYLE}
          />
        </label>
      </div>

      <figcaption style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '.82rem',
        color: 'var(--ink-muted)',
        textAlign: 'center',
        marginTop: '1rem',
        lineHeight: 1.5,
        maxWidth: 480,
        marginLeft: 'auto',
        marginRight: 'auto',
      }}>
        Each dot is one applicant; the dashed line is the level set
        of the admission rule. The full pool's correlation hovers near
        zero (the traits are independent). The admitted subset's
        correlation is negative; the more selective the threshold and
        the closer <i>a</i> and <i>b</i> are to each other, the more
        negative it gets.
      </figcaption>
    </figure>
  );
}

const SLIDER_LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  margin: '.6rem auto 0',
  maxWidth: 460,
  fontFamily: 'var(--font-sans)',
  fontSize: '.78rem',
  textTransform: 'uppercase',
  letterSpacing: '.06em',
  color: 'var(--ink-muted)',
};

const STRONG_STYLE: React.CSSProperties = {
  color: 'var(--ink)',
  fontFamily: 'var(--font-mono)',
  fontSize: '.85rem',
  textTransform: 'none',
};

const SLIDER_INPUT_STYLE: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: '.3rem',
  accentColor: 'var(--accent)',
};

function Readout({
  label, value, sub, accent = false,
}: {
  label: string; value: string; sub?: string; accent?: boolean;
}) {
  return (
    <div>
      <div style={{
        textTransform: 'uppercase',
        letterSpacing: '.06em',
        fontSize: '.7rem',
        color: 'var(--ink-muted)',
      }}>{label}</div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '1rem',
        color: accent ? 'var(--accent)' : 'var(--ink)',
        fontWeight: 600,
      }}>{value}</div>
      {sub && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '.72rem',
          color: 'var(--ink-faint)',
        }}>{sub}</div>
      )}
    </div>
  );
}
