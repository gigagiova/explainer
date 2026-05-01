import DerivationStepper, { type Step } from './DerivationStepper.tsx';

/* ----------------------------------------------------------------
   ChainRuleDerivation. Five-step stepper that derives r(X, Y) for
   the chain X -> M -> Y and then generalises to a multi-path DAG.
   The visualisation pairs the DAG with a row of joint-distribution
   scatter plots, all driven by the same cached Gaussian noise so
   the clouds are deterministic.
   Step 1 introduces correlation as the tilt of a joint cloud (the
   covariance primer) without leaving the chain story; step 5 swaps
   in a richer DAG and shows the path-sum result.
   ---------------------------------------------------------------- */

const W = 540;
const H = 360;
const NODE_R = 18;

const N_SAMPLES = 240;

function boxMuller(): [number, number] {
  const u1 = Math.max(Math.random(), 1e-10);
  const u2 = Math.random();
  const r = Math.sqrt(-2 * Math.log(u1));
  const theta = 2 * Math.PI * u2;
  return [r * Math.cos(theta), r * Math.sin(theta)];
}

type Noise = { x: number; eM: number; eY: number; eL: number };

const NOISE: Noise[] = (() => {
  const arr: Noise[] = [];
  for (let i = 0; i < N_SAMPLES; i++) {
    const [n1, n2] = boxMuller();
    const [n3, n4] = boxMuller();
    arr.push({ x: n1, eM: n2, eY: n3, eL: n4 });
  }
  return arr;
})();

/* ---------- chain: X -> M -> Y ---------- */

const A = 0.7;
const B = 0.7;

type ChainSample = { X: number; M: number; Y: number; eM: number };
const CHAIN: ChainSample[] = NOISE.map((n) => {
  const X = n.x;
  const M = A * X + Math.sqrt(1 - A * A) * n.eM;
  const Y = B * M + Math.sqrt(1 - B * B) * n.eY;
  return { X, M, Y, eM: n.eM };
});

/* ---------- multi-path: X -> M -> Y, X -> L -> Y, X -> Y direct ---------- */

const E = 0.2; // X → Y direct
const A2 = 0.5; // X → M
const B2 = 0.5; // M → Y
const C2 = 0.5; // X → L
const D2 = 0.3; // L → Y

type MultiSample = { X: number; M: number; L: number; Y: number };
const MULTI: MultiSample[] = NOISE.map((n) => {
  const X = n.x;
  const M = A2 * X + Math.sqrt(1 - A2 * A2) * n.eM;
  const L = C2 * X + Math.sqrt(1 - C2 * C2) * n.eL;
  const explained = E * E + B2 * B2 + D2 * D2
    + 2 * (E * B2 * A2 + E * D2 * C2 + B2 * D2 * A2 * C2);
  const varNoise = Math.max(0, 1 - explained);
  const Y = E * X + B2 * M + D2 * L + Math.sqrt(varNoise) * n.eY;
  return { X, M, L, Y };
});

const MULTI_R = E + A2 * B2 + C2 * D2; // ≈ 0.2 + 0.25 + 0.15 = 0.6

/* ---------- shared SVG primitives ---------- */

function Node({
  x, y, label, highlighted = false,
}: {
  x: number; y: number; label: string; highlighted?: boolean;
}) {
  const fill = highlighted ? '#b03a2e' : '#1a1a1a';
  return (
    <g>
      <circle cx={x} cy={y} r={NODE_R} fill={fill} />
      <text
        x={x} y={y + 5}
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize={13}
        fontWeight={600}
        fill="white"
      >
        {label}
      </text>
    </g>
  );
}

function Arrow({
  ax, ay, bx, by, label, color = '#1a1a1a', sw = 1.6, dashed = false,
}: {
  ax: number; ay: number; bx: number; by: number;
  label?: string; color?: string; sw?: number; dashed?: boolean;
}) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const x1 = ax + NODE_R * ux;
  const y1 = ay + NODE_R * uy;
  const x2 = bx - NODE_R * ux;
  const y2 = by - NODE_R * uy;
  const ahLen = 8;
  const ahHalf = 4;
  const baseX = x2 - ahLen * ux;
  const baseY = y2 - ahLen * uy;
  const lx = -uy * ahHalf;
  const ly =  ux * ahHalf;
  const head = `${x2},${y2} ${baseX + lx},${baseY + ly} ${baseX - lx},${baseY - ly}`;
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const offset = 12;
  const labelX = midX + -uy * offset;
  const labelY = midY +  ux * offset + 4;
  return (
    <g>
      <line
        x1={x1} y1={y1} x2={baseX} y2={baseY}
        stroke={color} strokeWidth={sw}
        strokeDasharray={dashed ? '5,4' : undefined}
      />
      <polygon points={head} fill={color} />
      {label && (
        <text
          x={labelX} y={labelY}
          textAnchor="middle"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize={11}
          fontStyle="italic"
          fontWeight={600}
          fill={color === '#1a1a1a' ? 'var(--ink-muted)' : color}
        >
          {label}
        </text>
      )}
    </g>
  );
}

function Scatter({
  cx, cy, size,
  data,
  title,
  overlay,
  pointColor = '#1a1a1a',
  pointOpacity = 0.4,
  regressionSlope,
  regressionLabel,
}: {
  cx: number; cy: number; size: number;
  data: { x: number; y: number }[];
  title: string;
  overlay?: { text: string; color?: string };
  pointColor?: string;
  pointOpacity?: number;
  regressionSlope?: number;
  regressionLabel?: string;
}) {
  const half = size / 2;
  const range = 3;
  const inner = half - 4;
  const mapX = (v: number) => cx + (v / range) * inner;
  const mapY = (v: number) => cy - (v / range) * inner;

  // Clip a line of slope s through the origin to the [-range, range] box.
  const slopeLine = (s: number) => {
    const yAtRight = s * range;
    if (Math.abs(yAtRight) <= range) {
      return { x1: -range, y1: -yAtRight, x2: range, y2: yAtRight };
    }
    const xCap = range / Math.abs(s);
    const sign = Math.sign(s);
    return { x1: -xCap, y1: -sign * range, x2: xCap, y2: sign * range };
  };

  return (
    <g>
      <rect
        x={cx - half} y={cy - half}
        width={size} height={size}
        fill="#fbfaf6"
        stroke="#d8d3c5"
        strokeWidth={0.6}
        rx={2}
      />
      <line x1={cx - half + 4} y1={cy} x2={cx + half - 4} y2={cy} stroke="#e0dccf" strokeWidth={0.4} />
      <line x1={cx} y1={cy - half + 4} x2={cx} y2={cy + half - 4} stroke="#e0dccf" strokeWidth={0.4} />
      {data.map((p, i) => (
        <circle
          key={i}
          cx={mapX(p.x)} cy={mapY(p.y)}
          r={1.3}
          fill={pointColor}
          opacity={pointOpacity}
        />
      ))}
      {regressionSlope !== undefined && (() => {
        const line = slopeLine(regressionSlope);
        return (
          <g>
            <line
              x1={mapX(line.x1)} y1={mapY(line.y1)}
              x2={mapX(line.x2)} y2={mapY(line.y2)}
              stroke="#b03a2e"
              strokeWidth={1.6}
            />
            {regressionLabel && (
              <g>
                <rect
                  x={cx - half + 4}
                  y={cy - half + 4}
                  width={regressionLabel.length * 5.5 + 6}
                  height={14}
                  fill="#fbfaf6"
                  opacity={0.85}
                />
                <text
                  x={cx - half + 7}
                  y={cy - half + 14}
                  textAnchor="start"
                  fontFamily="Inter, system-ui, sans-serif"
                  fontSize={10}
                  fontStyle="italic"
                  fontWeight={700}
                  fill="#b03a2e"
                >
                  {regressionLabel}
                </text>
              </g>
            )}
          </g>
        );
      })()}
      {overlay && (
        <text
          x={cx} y={cy + 8}
          textAnchor="middle"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize={26}
          fontWeight={800}
          fill={overlay.color ?? '#b03a2e'}
          opacity={0.55}
        >
          {overlay.text}
        </text>
      )}
      <text
        x={cx} y={cy + half + 14}
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize={11}
        fontStyle="italic"
        fill="var(--ink-muted)"
      >
        {title}
      </text>
    </g>
  );
}

/* ---------- chain DAG ---------- */

const X_POS = { x: 130, y: 60 };
const M_POS = { x: 270, y: 60 };
const Y_POS = { x: 410, y: 60 };

function ChainDAG({
  highlightPath = false,
  showSubstitution = false,
  showNoise = false,
}: {
  highlightPath?: boolean;
  showSubstitution?: boolean;
  showNoise?: boolean;
}) {
  const color = highlightPath ? '#b03a2e' : '#1a1a1a';
  const sw = highlightPath ? 2.2 : 1.6;
  return (
    <g>
      <Arrow ax={X_POS.x} ay={X_POS.y} bx={M_POS.x} by={M_POS.y} label="a" color={color} sw={sw} />
      <Arrow ax={M_POS.x} ay={M_POS.y} bx={Y_POS.x} by={Y_POS.y} label="b" color={color} sw={sw} />

      {showNoise && (
        <g>
          <NoiseArrow tx={M_POS.x} ty={M_POS.y} label="ε_M" />
          <NoiseArrow tx={Y_POS.x} ty={Y_POS.y} label="ε_Y" />
        </g>
      )}

      {showSubstitution && (
        <g>
          <path
            d={`M ${X_POS.x + NODE_R + 4} ${X_POS.y - 18} Q ${(X_POS.x + Y_POS.x) / 2} ${X_POS.y - 60} ${Y_POS.x - NODE_R - 4} ${Y_POS.y - 18}`}
            stroke="#b03a2e"
            strokeWidth={1.6}
            strokeDasharray="4,4"
            fill="none"
          />
          <text
            x={(X_POS.x + Y_POS.x) / 2} y={X_POS.y - 44}
            textAnchor="middle"
            fontFamily="Inter, system-ui, sans-serif"
            fontSize={11}
            fontStyle="italic"
            fill="#b03a2e"
            fontWeight={700}
          >
            effective slope ab
          </text>
        </g>
      )}

      <Node x={X_POS.x} y={X_POS.y} label="X" />
      <Node x={M_POS.x} y={M_POS.y} label="M" />
      <Node x={Y_POS.x} y={Y_POS.y} label="Y" />
    </g>
  );
}

function NoiseArrow({
  tx, ty, label,
}: {
  tx: number; ty: number; label: string;
}) {
  const startY = ty - 38;
  const endY = ty - NODE_R - 3;
  const ahLen = 6;
  const ahHalf = 4;
  const baseY = endY - ahLen;
  const head = `${tx},${endY} ${tx + ahHalf},${baseY} ${tx - ahHalf},${baseY}`;
  return (
    <g>
      <line
        x1={tx} y1={startY} x2={tx} y2={baseY}
        stroke="var(--ink-muted)" strokeWidth={1.2} strokeDasharray="3,3"
      />
      <polygon points={head} fill="var(--ink-muted)" opacity={0.7} />
      <text
        x={tx} y={startY - 4}
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize={11}
        fontStyle="italic"
        fill="var(--ink-muted)"
        fontWeight={600}
      >
        {label}
      </text>
    </g>
  );
}

/* ---------- multi-path DAG ---------- */

const MX = { x: 80,  y: 80 };
const MM = { x: 240, y: 30 };
const ML = { x: 240, y: 130 };
const MY = { x: 400, y: 80 };

const COLOR_DIRECT = '#b03a2e';
const COLOR_VIA_M  = '#2c5d8a';
const COLOR_VIA_L  = '#6a8e3e';

function MultiPathDAG() {
  return (
    <g>
      <Arrow ax={MX.x} ay={MX.y} bx={MM.x} by={MM.y} label="a" color={COLOR_VIA_M} sw={2} />
      <Arrow ax={MM.x} ay={MM.y} bx={MY.x} by={MY.y} label="b" color={COLOR_VIA_M} sw={2} />
      <Arrow ax={MX.x} ay={MX.y} bx={ML.x} by={ML.y} label="c" color={COLOR_VIA_L} sw={2} />
      <Arrow ax={ML.x} ay={ML.y} bx={MY.x} by={MY.y} label="d" color={COLOR_VIA_L} sw={2} />
      <Arrow ax={MX.x} ay={MX.y} bx={MY.x} by={MY.y} label="e" color={COLOR_DIRECT} sw={2} />

      <Node x={MX.x} y={MX.y} label="X" />
      <Node x={MM.x} y={MM.y} label="M" />
      <Node x={ML.x} y={ML.y} label="L" />
      <Node x={MY.x} y={MY.y} label="Y" />
    </g>
  );
}

/* ---------- per-phase visualisations ---------- */

const SCATTER_SIZE = 130;
const SCATTER_Y = 230;
const SCATTER_X1 = 100;
const SCATTER_X2 = 270;
const SCATTER_X3 = 440;

function ChainScatters({
  xyOverlay, highlightXY = false, showSlopes = false,
}: {
  xyOverlay?: { text: string; color?: string };
  highlightXY?: boolean;
  showSlopes?: boolean;
}) {
  return (
    <g>
      <Scatter
        cx={SCATTER_X1} cy={SCATTER_Y} size={SCATTER_SIZE}
        data={CHAIN.map((s) => ({ x: s.X, y: s.M }))}
        title="(X, M)  r = a"
        regressionSlope={showSlopes ? A : undefined}
        regressionLabel={showSlopes ? 'slope = a' : undefined}
      />
      <Scatter
        cx={SCATTER_X2} cy={SCATTER_Y} size={SCATTER_SIZE}
        data={CHAIN.map((s) => ({ x: s.M, y: s.Y }))}
        title="(M, Y)  r = b"
        regressionSlope={showSlopes ? B : undefined}
        regressionLabel={showSlopes ? 'slope = b' : undefined}
      />
      <Scatter
        cx={SCATTER_X3} cy={SCATTER_Y} size={SCATTER_SIZE}
        data={CHAIN.map((s) => ({ x: s.X, y: s.Y }))}
        title={highlightXY ? '(X, Y)  r = a · b' : '(X, Y)  r = ?'}
        overlay={xyOverlay}
        pointColor={highlightXY ? '#b03a2e' : '#1a1a1a'}
        pointOpacity={highlightXY ? 0.55 : 0.4}
        regressionSlope={highlightXY ? A * B : undefined}
        regressionLabel={highlightXY ? 'slope = a · b' : undefined}
      />
    </g>
  );
}

function Phase1Viz() {
  // Structural-equation phase: just the DAG with noise arrows. Shorter
  // viewBox than the other phases since there are no scatters to fit.
  const H1 = 180;
  return (
    <svg viewBox={`0 0 ${W} ${H1}`} style={{ width: '100%', maxWidth: 540, maxHeight: 260, display: 'block' }}>
      <ChainDAG showNoise />
      <text
        x={W / 2} y={130}
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize={12}
        fontStyle="italic"
        fill="var(--ink-muted)"
      >
        each noise term is independent of everything upstream;
      </text>
      <text
        x={W / 2} y={154}
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize={12}
        fontStyle="italic"
        fill="var(--ink-muted)"
      >
        its variance is set so that var(M) = var(Y) = 1.
      </text>
    </svg>
  );
}

function Phase2Viz() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: 600, maxHeight: 420, display: 'block' }}>
      <ChainDAG />
      <ChainScatters xyOverlay={{ text: '?' }} showSlopes />
    </svg>
  );
}

function Phase3Viz() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: 600, maxHeight: 420, display: 'block' }}>
      <ChainDAG showSubstitution />
      <ChainScatters xyOverlay={{ text: '?' }} />
    </svg>
  );
}

function Phase4Viz() {
  // Covariance refresher: show the two building blocks the expansion uses.
  // (X, X) lies on the diagonal — its covariance is var(X) = 1.
  // (X, ε_M) is round — covariance with independent noise is 0.
  // Compact viewBox since there is no DAG above the scatters.
  const H4 = 200;
  const cy = 80;
  const cxLeft = 180;
  const cxRight = 360;
  return (
    <svg viewBox={`0 0 ${W} ${H4}`} style={{ width: '100%', maxWidth: 540, maxHeight: 280, display: 'block' }}>
      <Scatter
        cx={cxLeft} cy={cy} size={SCATTER_SIZE}
        data={CHAIN.map((s) => ({ x: s.X, y: s.X }))}
        title="(X, X)  cov = var(X) = 1"
        regressionSlope={1}
        regressionLabel="slope = 1"
        pointColor="#b03a2e"
        pointOpacity={0.45}
      />
      <Scatter
        cx={cxRight} cy={cy} size={SCATTER_SIZE}
        data={CHAIN.map((s) => ({ x: s.X, y: s.eM }))}
        title="(X, ε_M)  cov = 0"
      />
    </svg>
  );
}

function Phase5Viz() {
  // Apply the building blocks to the substituted Y. Show all three pieces
  // of Y as separate scatters with X.
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: 600, maxHeight: 420, display: 'block' }}>
      <ChainDAG />
      <Scatter
        cx={SCATTER_X1} cy={SCATTER_Y} size={SCATTER_SIZE}
        data={CHAIN.map((s) => ({ x: s.X, y: s.M }))}
        title="(X, M)  r = a"
      />
      <Scatter
        cx={SCATTER_X2} cy={SCATTER_Y} size={SCATTER_SIZE}
        data={CHAIN.map((s) => ({ x: s.X, y: s.eM }))}
        title="(X, ε_M)  cov = 0"
      />
      <Scatter
        cx={SCATTER_X3} cy={SCATTER_Y} size={SCATTER_SIZE}
        data={CHAIN.map((s) => ({ x: s.X, y: s.Y }))}
        title="(X, Y)  r = ?"
        overlay={{ text: '?' }}
      />
    </svg>
  );
}

function Phase6Viz() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: 600, maxHeight: 420, display: 'block' }}>
      <ChainDAG highlightPath />
      <ChainScatters highlightXY />
    </svg>
  );
}

function Phase7Viz() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: 600, maxHeight: 420, display: 'block' }}>
      <MultiPathDAG />
      {/* Single big (X, Y) scatter centered, below the DAG */}
      <Scatter
        cx={W / 2} cy={265} size={150}
        data={MULTI.map((s) => ({ x: s.X, y: s.Y }))}
        title={`(X, Y)  r = e + a · b + c · d  ≈  ${MULTI_R.toFixed(2)}`}
        pointColor="#b03a2e"
        pointOpacity={0.55}
      />
    </svg>
  );
}

const STEPS: Step[] = [
  {
    caption:
      'The chain $X \\to M \\to Y$ is defined by *structural equations*: $M = aX + \\varepsilon_M$ means $M$\'s value is determined by $X$ (with strength $a$) plus an independent piece of noise $\\varepsilon_M$; similarly $Y = bM + \\varepsilon_Y$. These are *causal* claims, not just algebra. The arrows in the DAG are graphical shorthand for the equations, and $a$ is exactly how much $M$ moves when $X$ moves by one unit, holding the noise fixed. To keep the numbers comparable across arrows we set things up so every variable has variance $1$, which fixes the scale of the noise.',
    visualization: <Phase1Viz />,
    formula: 'M = a\\,X + \\varepsilon_M, \\qquad Y = b\\,M + \\varepsilon_Y',
  },
  {
    caption:
      'Sample data from the structural equations and plot the $(X, M)$ cloud. The best-fit line through it has slope exactly $a$ — *the same number as the causal coefficient on the arrow $X \\to M$*. The visible tilt of the data and the strength of the causal influence are not just related; they are the same number. The correlation $r(X, M) = \\mathrm{cov}(X, M) / \\sqrt{\\mathrm{var}(X)\\,\\mathrm{var}(M)}$ also equals $a$, because we standardised the variables so the variance denominators are $1$. (The "$\\tfrac{1}{2}$ per meiosis" from the inbreeding case was the same kind of object: a one-step correlation between adjacent gene copies.) The interesting case is $r(X, Y)$, where there is no direct arrow.',
    visualization: <Phase2Viz />,
    formula: 'r(X, M) = a, \\quad r(M, Y) = b, \\quad r(X, Y) = \\,?',
  },
  {
    caption:
      'Substitute the structural equations recursively. $M$\'s expression flows into $Y$\'s, and $Y$ becomes a linear function of $X$ with effective slope $ab$, plus two independent noise pieces.',
    visualization: <Phase3Viz />,
    formula: 'Y = b\\,M + \\varepsilon_Y = b\\,(a X + \\varepsilon_M) + \\varepsilon_Y = a b\\, X + b\\,\\varepsilon_M + \\varepsilon_Y',
  },
  {
    caption:
      'A quick switch of notation. So far we have been working with the *correlation* $r(X, Y)$, the tilt of the joint cloud scaled between $-1$ and $1$. The next step uses a slightly different quantity: the *covariance* $\\mathrm{cov}(X, Y) = E[(X - \\mu_X)(Y - \\mu_Y)]$, which is the same idea *before* dividing by the standard deviations. They are not the same quantity in general, but for our standardised variables (variance $1$) the division is by $1$, so $r(X, Y) = \\mathrm{cov}(X, Y)$: same number with two names. We work with $\\mathrm{cov}$ from here on because it has a clean *bilinearity* rule that $r$ does not. Two specific values are all we need: (1) $\\mathrm{cov}(X, X) = \\mathrm{var}(X) = 1$, the diagonal cloud; (2) $\\mathrm{cov}(X, \\varepsilon) = 0$ for any independent noise $\\varepsilon$, the round cloud.',
    visualization: <Phase4Viz />,
    formula:
      '\\begin{aligned} \\mathrm{cov}(X, A + B) &= \\mathrm{cov}(X, A) + \\mathrm{cov}(X, B) \\\\ \\mathrm{cov}(X, c\\,Z) &= c \\cdot \\mathrm{cov}(X, Z) \\end{aligned}',
  },
  {
    caption:
      'Apply the bilinearity rule to $Y = ab\\,X + b\\,\\varepsilon_M + \\varepsilon_Y$. The covariance splits into three terms, one per piece of $Y$. The first piece is $ab\\,X$, so its covariance with $X$ is $ab \\cdot \\mathrm{cov}(X, X) = ab \\cdot 1 = ab$. The other two pieces are independent noise, so their covariances with $X$ vanish: the $(X, \\varepsilon_M)$ and $(X, \\varepsilon_Y)$ clouds are round.',
    visualization: <Phase5Viz />,
    formula:
      '\\begin{aligned} \\mathrm{cov}(X, Y) &= a b\\,\\mathrm{cov}(X, X) + b\\,\\mathrm{cov}(X, \\varepsilon_M) + \\mathrm{cov}(X, \\varepsilon_Y) \\\\ &= a b \\cdot 1 + b \\cdot 0 + 0 \\;=\\; a b \\end{aligned}',
  },
  {
    caption:
      'The surviving piece is $ab$, exactly the product of coefficients along the only path from $X$ to $Y$. The $(X, Y)$ cloud has tilt $ab$; the path $X \\to M \\to Y$, highlighted, is the route the correlation came down.',
    visualization: <Phase6Viz />,
    formula: 'r(X, Y) = a \\cdot b',
  },
  {
    caption:
      'The same algebra, applied recursively to a DAG with multiple paths, gives a sum: each open path contributes the product of its coefficients, and the correlation $r(X, Y)$ is the sum over all open paths. This is Wright\'s general rule.',
    visualization: <Phase7Viz />,
    formula: 'r(X, Y) \\;=\\; e \\,+\\, a \\cdot b \\,+\\, c \\cdot d \\;=\\; \\sum_{\\text{open paths } p} \\prod_{e \\in p} c_e',
  },
];

export default function ChainRuleDerivation() {
  return <DerivationStepper title="From chain to general rule" steps={STEPS} />;
}
