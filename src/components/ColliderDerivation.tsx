import DerivationStepper, { type Step } from './DerivationStepper.tsx';

/* ----------------------------------------------------------------
   ColliderDerivation. Five-step derivation of r(X, Y | Z) for a
   collider X -> Z <- Y with X and Y independent. Each step's
   visualisation is matched to its formula:
     1. base DAG + ε_Z noise + X⊥Y indicator + var(Z)=1.
     2. residual definitions X̃ = X − aZ, Ỹ = Y − bZ shown beside
        their parents.
     3. covariance ingredients cov(X,Y)=0, cov(X,Z)=a, cov(Y,Z)=b,
        var(Z)=1 annotated on the edges and nodes they correspond to.
     4. residual variances 1−a² and 1−b² shown beside X̃, Ỹ.
     5. induced partial correlation r(X,Y|Z) drawn as a dashed arc.
   ---------------------------------------------------------------- */

const W = 480;
const H = 300;
const NODE_R = 22;

const X_POS = { x: 90,  y: 90  };
const Y_POS = { x: 390, y: 90  };
const Z_POS = { x: 240, y: 210 };

type Phase = 1 | 2 | 3 | 4 | 5;

function ColliderViz({ phase }: { phase: Phase }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', maxWidth: 540, maxHeight: 320, display: 'block' }}
      role="img"
      aria-label="Collider DAG with step-specific annotations."
    >
      {/* === Step 5: induced partial-correlation arc, drawn first so nodes overlay it === */}
      {phase === 5 && (
        <g>
          <path
            d={`M ${X_POS.x + NODE_R - 4} ${X_POS.y - 8} Q ${(X_POS.x + Y_POS.x) / 2} ${X_POS.y - 70} ${Y_POS.x - NODE_R + 4} ${Y_POS.y - 8}`}
            stroke="#b03a2e" strokeWidth={1.8} strokeDasharray="5,4" fill="none"
          />
          <text
            x={(X_POS.x + Y_POS.x) / 2} y={X_POS.y - 50}
            textAnchor="middle"
            fontFamily="Inter, system-ui, sans-serif"
            fontSize={12}
            fontStyle="italic"
            fontWeight={700}
            fill="#b03a2e"
          >
            r(X, Y | Z)
          </text>
        </g>
      )}

      {/* === Step 1: X ⊥ Y indicator between X and Y === */}
      {phase === 1 && (
        <g>
          <line
            x1={X_POS.x + NODE_R + 6} y1={X_POS.y}
            x2={Y_POS.x - NODE_R - 6} y2={Y_POS.y}
            stroke="#aaa" strokeWidth={0.8} strokeDasharray="3,4"
          />
          <rect
            x={(X_POS.x + Y_POS.x) / 2 - 28}
            y={X_POS.y - 9}
            width={56} height={18}
            fill="#fbfaf6" stroke="none"
          />
          <text
            x={(X_POS.x + Y_POS.x) / 2} y={X_POS.y + 4}
            textAnchor="middle"
            fontFamily="Inter, system-ui, sans-serif"
            fontSize={12}
            fontStyle="italic"
            fill="var(--ink-muted)"
          >
            X ⊥ Y
          </text>
        </g>
      )}

      {/* === Step 3: cov(X, Y) = 0 between X and Y === */}
      {phase === 3 && (
        <g>
          <line
            x1={X_POS.x + NODE_R + 6} y1={X_POS.y}
            x2={Y_POS.x - NODE_R - 6} y2={Y_POS.y}
            stroke="#aaa" strokeWidth={0.8} strokeDasharray="3,4"
          />
          <rect
            x={(X_POS.x + Y_POS.x) / 2 - 50}
            y={X_POS.y - 9}
            width={100} height={18}
            fill="#fbfaf6" stroke="none"
          />
          <text
            x={(X_POS.x + Y_POS.x) / 2} y={X_POS.y + 4}
            textAnchor="middle"
            fontFamily="Inter, system-ui, sans-serif"
            fontSize={12}
            fontStyle="italic"
            fill="#b03a2e"
            fontWeight={600}
          >
            cov(X, Y) = 0
          </text>
        </g>
      )}

      {/* === Edges X→Z and Y→Z, with phase-specific labels === */}
      <Arrow
        ax={X_POS.x} ay={X_POS.y}
        bx={Z_POS.x} by={Z_POS.y}
        label={phase === 3 ? 'cov(X, Z) = a' : 'a'}
        labelHighlight={phase === 3}
      />
      <Arrow
        ax={Y_POS.x} ay={Y_POS.y}
        bx={Z_POS.x} by={Z_POS.y}
        label={phase === 3 ? 'cov(Y, Z) = b' : 'b'}
        labelHighlight={phase === 3}
      />

      {/* === Step 1: ε_Z noise arrow into Z from below === */}
      {phase === 1 && (
        <NoiseArrow
          startX={Z_POS.x} startY={H - 22}
          endX={Z_POS.x}   endY={Z_POS.y + NODE_R + 8}
          label="ε_Z"
        />
      )}

      {/* === Conditioning box around Z === */}
      <rect
        x={Z_POS.x - NODE_R - 5}
        y={Z_POS.y - NODE_R - 5}
        width={(NODE_R + 5) * 2}
        height={(NODE_R + 5) * 2}
        fill="none" stroke="#1a1a1a" strokeWidth={1}
      />

      {/* === Nodes === */}
      <Node x={X_POS.x} y={X_POS.y} label="X" filled={false} />
      <Node x={Y_POS.x} y={Y_POS.y} label="Y" filled={false} />
      <Node x={Z_POS.x} y={Z_POS.y} label="Z" filled={true} />

      {/* === Step 1 / Step 3: var(Z) = 1 annotation === */}
      {(phase === 1 || phase === 3) && (
        <text
          x={Z_POS.x + NODE_R + 14} y={Z_POS.y + 4}
          fontFamily="Inter, system-ui, sans-serif"
          fontSize={11}
          fontStyle="italic"
          fill={phase === 3 ? '#b03a2e' : 'var(--ink-muted)'}
          fontWeight={phase === 3 ? 600 : 400}
        >
          var(Z) = 1
        </text>
      )}

      {/* === Step 2: residual definitions === */}
      {/* X̃ and Ỹ are rendered as letter + manually drawn tilde to avoid
          font rendering bugs with combining tilde over X (no precomposed). */}
      {phase === 2 && (
        <g>
          <text
            x={X_POS.x} y={X_POS.y + NODE_R + 22}
            textAnchor="middle"
            fontFamily="Inter, system-ui, sans-serif"
            fontSize={12}
            fontStyle="italic"
            fontWeight={600}
            fill="#b03a2e"
          >
            X = X − aZ
          </text>
          <Tilde cx={X_POS.x - 25} cy={X_POS.y + NODE_R + 12} fill="#b03a2e" />
          <text
            x={Y_POS.x} y={Y_POS.y + NODE_R + 22}
            textAnchor="middle"
            fontFamily="Inter, system-ui, sans-serif"
            fontSize={12}
            fontStyle="italic"
            fontWeight={600}
            fill="#b03a2e"
          >
            Y = Y − bZ
          </text>
          <Tilde cx={Y_POS.x - 25} cy={Y_POS.y + NODE_R + 12} fill="#b03a2e" />
        </g>
      )}

      {/* === Step 4: residual variances === */}
      {phase === 4 && (
        <g>
          <text
            x={X_POS.x} y={X_POS.y + NODE_R + 22}
            textAnchor="middle"
            fontFamily="Inter, system-ui, sans-serif"
            fontSize={12}
            fontStyle="italic"
            fontWeight={600}
            fill="#b03a2e"
          >
            var(X) = 1 − a²
          </text>
          <Tilde cx={X_POS.x - 14} cy={X_POS.y + NODE_R + 12} fill="#b03a2e" />
          <text
            x={Y_POS.x} y={Y_POS.y + NODE_R + 22}
            textAnchor="middle"
            fontFamily="Inter, system-ui, sans-serif"
            fontSize={12}
            fontStyle="italic"
            fontWeight={600}
            fill="#b03a2e"
          >
            var(Y) = 1 − b²
          </text>
          <Tilde cx={Y_POS.x - 14} cy={Y_POS.y + NODE_R + 12} fill="#b03a2e" />
        </g>
      )}
    </svg>
  );
}

function Tilde({ cx, cy, fill }: { cx: number; cy: number; fill: string }) {
  /* Manually-drawn small tilde stroke, used as an overlay above a letter
     to render X̃ and Ỹ reliably (the combining tilde over X has no
     precomposed Unicode form, and some fonts render it inconsistently). */
  return (
    <path
      d={`M ${cx - 3.5} ${cy} q 1.75 -2 3.5 0 t 3.5 0`}
      stroke={fill}
      strokeWidth={1}
      fill="none"
      strokeLinecap="round"
    />
  );
}

function Node({
  x, y, label, filled,
}: {
  x: number; y: number; label: string; filled: boolean;
}) {
  return (
    <g>
      <circle
        cx={x} cy={y}
        r={NODE_R}
        fill={filled ? '#1a1a1a' : '#fbfaf6'}
        stroke="#1a1a1a" strokeWidth={1.5}
      />
      <text
        x={x} y={y + 5}
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize={14}
        fontWeight={600}
        fill={filled ? 'white' : '#1a1a1a'}
      >
        {label}
      </text>
    </g>
  );
}

function Arrow({
  ax, ay, bx, by, label, labelHighlight,
}: {
  ax: number; ay: number; bx: number; by: number;
  label: string; labelHighlight?: boolean;
}) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const x1 = ax + NODE_R * ux;
  const y1 = ay + NODE_R * uy;
  const x2 = bx - (NODE_R + 5) * ux;
  const y2 = by - (NODE_R + 5) * uy;
  const ahLen = 9;
  const ahHalf = 5;
  const baseX = x2 - ahLen * ux;
  const baseY = y2 - ahLen * uy;
  const lx = -uy * ahHalf;
  const ly =  ux * ahHalf;
  const head = `${x2},${y2} ${baseX + lx},${baseY + ly} ${baseX - lx},${baseY - ly}`;
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const offset = labelHighlight ? 26 : 14;
  const labelX = midX + -uy * offset;
  const labelY = midY +  ux * offset + 4;
  const labelWidth = label.length * 6.5;
  return (
    <g>
      <line x1={x1} y1={y1} x2={baseX} y2={baseY} stroke="#1a1a1a" strokeWidth={1.8} />
      <polygon points={head} fill="#1a1a1a" />
      {labelHighlight && (
        <rect
          x={labelX - labelWidth / 2 - 3}
          y={labelY - 11}
          width={labelWidth + 6}
          height={14}
          fill="#fbfaf6"
        />
      )}
      <text
        x={labelX} y={labelY}
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize={labelHighlight ? 11 : 12}
        fontStyle="italic"
        fontWeight={labelHighlight ? 700 : 600}
        fill={labelHighlight ? '#b03a2e' : 'var(--ink-muted)'}
      >
        {label}
      </text>
    </g>
  );
}

function NoiseArrow({
  startX, startY, endX, endY, label,
}: {
  startX: number; startY: number; endX: number; endY: number; label: string;
}) {
  const dx = endX - startX;
  const dy = endY - startY;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const ahLen = 7;
  const ahHalf = 4;
  const baseX = endX - ahLen * ux;
  const baseY = endY - ahLen * uy;
  const lx = -uy * ahHalf;
  const ly =  ux * ahHalf;
  const head = `${endX},${endY} ${baseX + lx},${baseY + ly} ${baseX - lx},${baseY - ly}`;
  return (
    <g>
      <line
        x1={startX} y1={startY}
        x2={baseX} y2={baseY}
        stroke="var(--ink-muted)" strokeWidth={1} strokeDasharray="3,3"
      />
      <polygon points={head} fill="var(--ink-muted)" opacity={0.7} />
      <text
        x={startX} y={startY + 12}
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize={11}
        fontStyle="italic"
        fill="var(--ink-muted)"
      >
        {label}
      </text>
    </g>
  );
}

/* ----------------------------------------------------------------
   ColliderDataPanel. A small companion scatter that pairs with the
   DAG at each step. Same fixed dataset of (X, Y, Z, X̃, Ỹ) triples
   throughout the derivation; what changes per step is which view
   is shown and what empirical readout is annotated. Lets the
   reader see actual data behind every formula on the DAG.
   ---------------------------------------------------------------- */

const DATA_A = 0.6;
const DATA_B = 0.7;
const N_DATA = 220;
const SIGMA_EPS_Z = Math.sqrt(Math.max(0.01, 1 - DATA_A * DATA_A - DATA_B * DATA_B));

function boxMullerCol(): [number, number] {
  const u1 = Math.max(Math.random(), 1e-10);
  const u2 = Math.random();
  const r = Math.sqrt(-2 * Math.log(u1));
  const t = 2 * Math.PI * u2;
  return [r * Math.cos(t), r * Math.sin(t)];
}

type ColliderSample = { x: number; y: number; z: number; xt: number; yt: number };

const COLLIDER_DATA: ColliderSample[] = (() => {
  const out: ColliderSample[] = [];
  for (let i = 0; i < N_DATA; i++) {
    const [n1, n2] = boxMullerCol();
    const [n3] = boxMullerCol();
    const x = n1;
    const y = n2;
    const z = DATA_A * x + DATA_B * y + SIGMA_EPS_Z * n3;
    const xt = x - DATA_A * z;
    const yt = y - DATA_B * z;
    out.push({ x, y, z, xt, yt });
  }
  return out;
})();

function computeR(pts: { x: number; y: number }[]): number | null {
  const n = pts.length;
  if (n < 3) return null;
  let mx = 0, my = 0;
  for (const p of pts) { mx += p.x; my += p.y; }
  mx /= n; my /= n;
  let cov = 0, vx = 0, vy = 0;
  for (const p of pts) {
    const dx = p.x - mx;
    const dy = p.y - my;
    cov += dx * dy;
    vx += dx * dx;
    vy += dy * dy;
  }
  if (vx < 1e-9 || vy < 1e-9) return null;
  return cov / Math.sqrt(vx * vy);
}

function computeCov(pts: { x: number; y: number }[]): number {
  const n = pts.length;
  if (n < 2) return 0;
  let mx = 0, my = 0;
  for (const p of pts) { mx += p.x; my += p.y; }
  mx /= n; my /= n;
  let cov = 0;
  for (const p of pts) cov += (p.x - mx) * (p.y - my);
  return cov / (n - 1);
}

function computeVar(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  let m = 0;
  for (const v of values) m += v;
  m /= n;
  let s = 0;
  for (const v of values) s += (v - m) ** 2;
  return s / (n - 1);
}

const DATA_R_XY = computeR(COLLIDER_DATA.map((s) => ({ x: s.x, y: s.y }))) ?? 0;
const DATA_R_XZ = computeR(COLLIDER_DATA.map((s) => ({ x: s.x, y: s.z }))) ?? 0;
const DATA_COV_RES = computeCov(COLLIDER_DATA.map((s) => ({ x: s.xt, y: s.yt })));
const DATA_VAR_XT = computeVar(COLLIDER_DATA.map((s) => s.xt));
const DATA_VAR_YT = computeVar(COLLIDER_DATA.map((s) => s.yt));
const DATA_R_PARTIAL = computeR(COLLIDER_DATA.map((s) => ({ x: s.xt, y: s.yt }))) ?? 0;
const EXPECTED_R_PARTIAL =
  -DATA_A * DATA_B / Math.sqrt((1 - DATA_A * DATA_A) * (1 - DATA_B * DATA_B));

const SW = 280;
const SH = 280;
const SPAD = 30;
const SRANGE = 3;

function smapX(v: number): number {
  return SPAD + ((v + SRANGE) / (2 * SRANGE)) * (SW - 2 * SPAD);
}
function smapY(v: number): number {
  return SH - SPAD - ((v + SRANGE) / (2 * SRANGE)) * (SH - 2 * SPAD);
}

type DataPhase = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const DATA_VAR_X = computeVar(COLLIDER_DATA.map((s) => s.x));
const DATA_VAR_Y = computeVar(COLLIDER_DATA.map((s) => s.y));

function ColliderDataPanel({ dataPhase }: { dataPhase: DataPhase }) {
  const isHistogram = dataPhase === 5 || dataPhase === 6;
  return (
    <svg
      viewBox={`0 0 ${SW} ${SH}`}
      style={{ width: '100%', maxWidth: 280, display: 'block' }}
      role="img"
      aria-label="Empirical view showing the quantity the formula at this step names."
    >
      <line
        x1={smapX(0)} y1={SPAD} x2={smapX(0)} y2={SH - SPAD}
        stroke="#1a1a1a" strokeOpacity={0.18} strokeWidth={0.5}
      />
      {!isHistogram && (
        <line
          x1={SPAD} y1={smapY(0)} x2={SW - SPAD} y2={smapY(0)}
          stroke="#1a1a1a" strokeOpacity={0.18} strokeWidth={0.5}
        />
      )}
      <rect
        x={SPAD} y={SPAD}
        width={SW - 2 * SPAD} height={SH - 2 * SPAD}
        fill="none" stroke="#1a1a1a" strokeOpacity={0.18} strokeWidth={0.5}
      />

      {dataPhase === 1 && <DotsRound axisX="X" axisY="Y" getX={(s) => s.x} getY={(s) => s.y}
        readout={`r(X, Y) = ${DATA_R_XY.toFixed(3)}`} />}

      {dataPhase === 2 && <DotsWithSlope
        axisX="X" axisY="Z" getX={(s) => s.x} getY={(s) => s.z} slope={DATA_A}
        readout={`r(X, Z) = ${DATA_R_XZ.toFixed(2)}  ≈  a = ${DATA_A.toFixed(2)}`}
      />}

      {dataPhase === 3 && <DotsWithResiduals />}

      {dataPhase === 4 && <DotsResiduals
        readoutLines={[`cov(X̃, Ỹ) = ${DATA_COV_RES.toFixed(3)}`,
        `expected −ab = ${(-DATA_A * DATA_B).toFixed(3)}`]}
      />}

      {dataPhase === 5 && <VarianceHistogramPanel
        originalValues={COLLIDER_DATA.map((s) => s.x)}
        residualValues={COLLIDER_DATA.map((s) => s.xt)}
        origLabel="X"
        resLabel="X̃"
        empVarOrig={DATA_VAR_X}
        empVarRes={DATA_VAR_XT}
        theoryVarRes={1 - DATA_A * DATA_A}
        theoryFormula="1 − a²"
      />}

      {dataPhase === 6 && <VarianceHistogramPanel
        originalValues={COLLIDER_DATA.map((s) => s.y)}
        residualValues={COLLIDER_DATA.map((s) => s.yt)}
        origLabel="Y"
        resLabel="Ỹ"
        empVarOrig={DATA_VAR_Y}
        empVarRes={DATA_VAR_YT}
        theoryVarRes={1 - DATA_B * DATA_B}
        theoryFormula="1 − b²"
      />}

      {dataPhase === 7 && <DotsResidualsWithLine
        readoutLines={[
          `r(X, Y | Z) = ${DATA_R_PARTIAL.toFixed(3)}`,
          `expected ${EXPECTED_R_PARTIAL.toFixed(3)}`,
        ]}
      />}
    </svg>
  );
}

function VarianceHistogramPanel({
  originalValues, residualValues,
  origLabel, resLabel,
  empVarOrig, empVarRes,
  theoryVarRes, theoryFormula,
}: {
  originalValues: number[];
  residualValues: number[];
  origLabel: string;
  resLabel: string;
  empVarOrig: number;
  empVarRes: number;
  theoryVarRes: number;
  theoryFormula: string;
}) {
  const NBINS = 26;
  const binWidth = (2 * SRANGE) / NBINS;
  const origCounts = Array(NBINS).fill(0);
  const resCounts = Array(NBINS).fill(0);
  for (const v of originalValues) {
    const idx = Math.floor((v + SRANGE) / binWidth);
    if (idx >= 0 && idx < NBINS) origCounts[idx]++;
  }
  for (const v of residualValues) {
    const idx = Math.floor((v + SRANGE) / binWidth);
    if (idx >= 0 && idx < NBINS) resCounts[idx]++;
  }
  const maxC = Math.max(...origCounts, ...resCounts, 1);
  const baseY = SH - SPAD - 30;
  const topY = SPAD + 10;
  const yScale = (baseY - topY) / maxC;
  return (
    <g>
      {/* original histogram (grey, behind) */}
      {origCounts.map((c, i) => {
        if (c === 0) return null;
        const x0 = smapX(-SRANGE + i * binWidth);
        const x1 = smapX(-SRANGE + (i + 1) * binWidth);
        return (
          <rect key={`o${i}`}
            x={x0 + 0.5} y={baseY - c * yScale}
            width={Math.max(x1 - x0 - 1, 1)} height={c * yScale}
            fill="#1a1a1a" fillOpacity={0.18}
          />
        );
      })}
      {/* residual histogram (red, on top) */}
      {resCounts.map((c, i) => {
        if (c === 0) return null;
        const x0 = smapX(-SRANGE + i * binWidth);
        const x1 = smapX(-SRANGE + (i + 1) * binWidth);
        return (
          <rect key={`r${i}`}
            x={x0 + 0.5} y={baseY - c * yScale}
            width={Math.max(x1 - x0 - 1, 1)} height={c * yScale}
            fill="#b03a2e" fillOpacity={0.55}
          />
        );
      })}
      {/* baseline */}
      <line
        x1={SPAD} y1={baseY} x2={SW - SPAD} y2={baseY}
        stroke="#1a1a1a" strokeOpacity={0.32} strokeWidth={0.6}
      />
      {/* x ticks */}
      {[-3, -2, -1, 0, 1, 2, 3].map((v) => (
        <g key={v}>
          <line x1={smapX(v)} y1={baseY} x2={smapX(v)} y2={baseY + 3}
            stroke="#1a1a1a" strokeOpacity={0.4} strokeWidth={0.5} />
          <text x={smapX(v)} y={baseY + 11} textAnchor="middle"
            fontSize={9} fontFamily="var(--font-mono)" fill="var(--ink-faint)">{v}</text>
        </g>
      ))}
      {/* swatch legend at top right */}
      <g>
        <rect x={SW - SPAD - 56} y={SPAD + 2} width={10} height={8} fill="#1a1a1a" fillOpacity={0.25} />
        <text x={SW - SPAD - 42} y={SPAD + 10} fontSize={9.5} fill="#1a1a1a"
          fontFamily="Inter, system-ui, sans-serif" fontStyle="italic">{origLabel}</text>
        <rect x={SW - SPAD - 24} y={SPAD + 2} width={10} height={8} fill="#b03a2e" fillOpacity={0.6} />
        <text x={SW - SPAD - 10} y={SPAD + 10} fontSize={9.5} fill="#b03a2e"
          fontFamily="Inter, system-ui, sans-serif" fontStyle="italic">{resLabel}</text>
      </g>
      <ReadoutLines lines={[
        `var(${origLabel}) = ${empVarOrig.toFixed(2)},  var(${resLabel}) = ${empVarRes.toFixed(2)}`,
        `theory: var(${resLabel}) = ${theoryFormula} = ${theoryVarRes.toFixed(2)}`,
      ]} />
    </g>
  );
}

function DotsRound({
  axisX, axisY, getX, getY, readout,
}: {
  axisX: string; axisY: string;
  getX: (s: ColliderSample) => number;
  getY: (s: ColliderSample) => number;
  readout: string;
}) {
  return (
    <g>
      {COLLIDER_DATA.map((s, i) => (
        <circle key={i} cx={smapX(getX(s))} cy={smapY(getY(s))} r={1.6}
          fill="#1a1a1a" opacity={0.45} />
      ))}
      <AxisLabels x={axisX} y={axisY} />
      <Readout1Line text={readout} />
    </g>
  );
}

function DotsWithSlope({
  axisX, axisY, getX, getY, slope, readout,
}: {
  axisX: string; axisY: string;
  getX: (s: ColliderSample) => number;
  getY: (s: ColliderSample) => number;
  slope: number;
  readout: string;
}) {
  return (
    <g>
      {COLLIDER_DATA.map((s, i) => (
        <circle key={i} cx={smapX(getX(s))} cy={smapY(getY(s))} r={1.6}
          fill="#1a1a1a" opacity={0.45} />
      ))}
      <line
        x1={smapX(-SRANGE * 0.95)} y1={smapY(-SRANGE * 0.95 * slope)}
        x2={smapX(SRANGE * 0.95)} y2={smapY(SRANGE * 0.95 * slope)}
        stroke="#b03a2e" strokeWidth={1.6}
      />
      <AxisLabels x={axisX} y={axisY} />
      <Readout1Line text={readout} />
    </g>
  );
}

function DotsWithResiduals() {
  /* (Z, X) view with the regression line X = a Z drawn. The residual
     X̃ = X − aZ is the vertical distance from each point to the line.
     A vertical slice at Z near a fixed value is highlighted to make
     the "Z fixed" intuition concrete: inside the strip, X varies only
     through X̃. */
  const SLICE_Z = 1.0;
  const SLICE_HALF = 0.3;
  const sliceLeft = smapX(SLICE_Z - SLICE_HALF);
  const sliceRight = smapX(SLICE_Z + SLICE_HALF);
  return (
    <g>
      {/* slice highlight: Z fixed at SLICE_Z */}
      <rect
        x={sliceLeft} y={SPAD}
        width={sliceRight - sliceLeft} height={SH - 2 * SPAD}
        fill="#b03a2e" fillOpacity={0.1}
        stroke="#b03a2e" strokeOpacity={0.5} strokeWidth={0.8}
        strokeDasharray="3,3"
      />
      {/* residual bars: X − aZ as vertical distance from line */}
      {COLLIDER_DATA.map((s, i) => (
        <line
          key={`r${i}`}
          x1={smapX(s.z)} y1={smapY(s.x)}
          x2={smapX(s.z)} y2={smapY(DATA_A * s.z)}
          stroke="#b03a2e" strokeOpacity={0.22} strokeWidth={0.5}
        />
      ))}
      {COLLIDER_DATA.map((s, i) => (
        <circle key={i} cx={smapX(s.z)} cy={smapY(s.x)} r={1.6}
          fill="#1a1a1a" opacity={0.45} />
      ))}
      <line
        x1={smapX(-SRANGE * 0.95)} y1={smapY(-SRANGE * 0.95 * DATA_A)}
        x2={smapX(SRANGE * 0.95)} y2={smapY(SRANGE * 0.95 * DATA_A)}
        stroke="#b03a2e" strokeWidth={1.6}
      />
      {/* slice label */}
      <text
        x={(sliceLeft + sliceRight) / 2} y={SPAD - 4}
        textAnchor="middle"
        fontSize={9}
        fontStyle="italic"
        fill="#b03a2e"
        fontFamily="Inter, system-ui, sans-serif"
      >Z fixed</text>
      <AxisLabels x="Z" y="X" />
      <Readout1Line text="inside the slice, only X̃ varies" />
    </g>
  );
}

function DotsResiduals({ readoutLines }: { readoutLines: string[] }) {
  return (
    <g>
      {COLLIDER_DATA.map((s, i) => (
        <circle key={i} cx={smapX(s.xt)} cy={smapY(s.yt)} r={1.8}
          fill="#b03a2e" opacity={0.6} />
      ))}
      <AxisLabels x="X̃" y="Ỹ" />
      <ReadoutLines lines={readoutLines} />
    </g>
  );
}

function DotsResidualsWithLine({ readoutLines }: { readoutLines: string[] }) {
  /* Draw the (X̃, Ỹ) cloud with its best-fit regression line. The
     line slope is the partial correlation times sd(Ỹ)/sd(X̃), which
     here works out to -ab/(1 - a^2). */
  const slope = (-DATA_A * DATA_B) / Math.max(1 - DATA_A * DATA_A, 1e-9);
  return (
    <g>
      {COLLIDER_DATA.map((s, i) => (
        <circle key={i} cx={smapX(s.xt)} cy={smapY(s.yt)} r={1.8}
          fill="#b03a2e" opacity={0.6} />
      ))}
      <line
        x1={smapX(-SRANGE * 0.85)} y1={smapY(-SRANGE * 0.85 * slope)}
        x2={smapX(SRANGE * 0.85)} y2={smapY(SRANGE * 0.85 * slope)}
        stroke="#b03a2e" strokeWidth={2}
      />
      <AxisLabels x="X̃" y="Ỹ" />
      <ReadoutLines lines={readoutLines} />
    </g>
  );
}

function AxisLabels({ x, y }: { x: string; y: string }) {
  return (
    <g>
      <text
        x={SW - SPAD - 4} y={smapY(0) - 4}
        textAnchor="end"
        fontSize={11}
        fontStyle="italic"
        fill="#777"
        fontFamily="Inter, system-ui, sans-serif"
      >{x}</text>
      <text
        x={smapX(0) + 6} y={SPAD + 11}
        fontSize={11}
        fontStyle="italic"
        fill="#777"
        fontFamily="Inter, system-ui, sans-serif"
      >{y}</text>
    </g>
  );
}

function Readout1Line({ text }: { text: string }) {
  return (
    <text
      x={SW / 2} y={SH - 8}
      textAnchor="middle"
      fontSize={10.5}
      fill="#1a1a1a"
      fontFamily="var(--font-mono)"
    >{text}</text>
  );
}

function ReadoutLines({ lines }: { lines: string[] }) {
  const lineH = 12;
  const startY = SH - 6 - (lines.length - 1) * lineH;
  return (
    <g>
      {lines.map((t, i) => (
        <text
          key={i}
          x={SW / 2} y={startY + i * lineH}
          textAnchor="middle"
          fontSize={10}
          fill="#1a1a1a"
          fontFamily="var(--font-mono)"
        >{t}</text>
      ))}
    </g>
  );
}

function vizSlot(vizPhase: Phase, dataPhase: DataPhase): React.ReactNode {
  return (
    <div style={{
      display: 'flex',
      gap: '1.2rem',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
    }}>
      <div style={{
        flex: '1 1 320px',
        maxWidth: 380,
        display: 'flex',
        justifyContent: 'center',
      }}>
        <ColliderViz phase={vizPhase} />
      </div>
      <div style={{
        flex: '1 1 240px',
        maxWidth: 280,
        display: 'flex',
        justifyContent: 'center',
      }}>
        <ColliderDataPanel dataPhase={dataPhase} />
      </div>
    </div>
  );
}

const STEPS: Step[] = [
  {
    caption:
      'The puzzle to solve: $X$ and $Y$ are independent (the symbol $X \\perp Y$ is read "X is independent of Y": knowing one tells you nothing about the other), so the unconditional cloud is round and $r(X, Y) = 0$. They both feed into a collider $Z$ via the structural equation $Z = a X + b Y + \\varepsilon_Z$. Question: when we restrict the data to a slice with $Z$ near a fixed value, what tilt does $(X, Y)$ pick up *inside* that slice? In symbols, what is $r(X, Y \\mid Z)$?',
    visualization: vizSlot(1, 1),
    formula: 'X \\perp Y, \\quad Z = a X + b Y + \\varepsilon_Z, \\quad r(X, Y \\mid Z) = \\,?',
  },
  {
    caption:
      'First, read the path-coefficient correlations off the structural equation. Substitute $Z = aX + bY + \\varepsilon_Z$ inside cov(X, Z) and expand by bilinearity. Two of the three terms vanish: cov(X, Y) = 0 because X and Y are independent, and cov(X, ε_Z) = 0 because the noise on Z is independent of every upstream variable. The same calculation gives cov(Y, Z) = b. With unit variances, correlations equal covariances, so $r_{XZ} = a$ and $r_{YZ} = b$.',
    visualization: vizSlot(3, 2),
    formula:
      '\\begin{aligned}'
      + ' \\mathrm{cov}(X, Z) &= \\mathrm{cov}(X,\\; aX + bY + \\varepsilon_Z) \\\\'
      + ' &= a\\,\\mathrm{var}(X) + b\\,\\mathrm{cov}(X, Y) + \\mathrm{cov}(X, \\varepsilon_Z) \\\\'
      + ' &= a \\cdot 1 + 0 + 0 = a \\\\'
      + ' r_{XZ} &= a, \\qquad r_{YZ} = b'
      + ' \\end{aligned}',
  },
  {
    caption:
      'Important caveat first: the causal arrow runs $X \\to Z$, not the other way. But conditioning on Z is *observational*, not causal. Observing Z still tells us about X. A wet umbrella reveals it rained, even though rain caused the wetness rather than the reverse. So define $\\tilde X$ as the *residual* of X: the part of X\'s variation that knowing Z does not pin down. For jointly Gaussian variables with unit variances, the conditional mean of X given Z is $r_{XZ} \\cdot Z = aZ$ (a statistical quantity, derived from the joint distribution; the causal direction does not enter). The residual is what X does on top of this conditional mean: $\\tilde X = X - aZ$. In the data panel, $aZ$ is the regression line and $\\tilde X$ is the vertical distance from the line to each point. Same for Y: $\\tilde Y = Y - bZ$. Why is this what *conditioning on Z* looks at? Restrict to a slice with Z fixed (the dashed strip). Inside it, $X = aZ + \\tilde X$ has $aZ$ as a constant; only $\\tilde X$ varies. Y splits as $bZ + \\tilde Y$. The within-slice covariation of $(X, Y)$ is therefore exactly the covariation of $(\\tilde X, \\tilde Y)$, and $r(X, Y \\mid Z) = \\mathrm{corr}(\\tilde X, \\tilde Y)$.',
    visualization: vizSlot(2, 3),
    formula:
      '\\begin{aligned}'
      + ' \\tilde X &= X - aZ, \\qquad \\tilde Y = Y - bZ \\\\'
      + ' r(X, Y \\mid Z) &= \\mathrm{corr}(\\tilde X, \\tilde Y)'
      + ' \\end{aligned}',
  },
  {
    caption:
      'Compute cov(X̃, Ỹ) by writing it out and applying bilinearity of covariance. Distribute over each argument: the four cross-products give cov(X, Y), then two cov(·, Z) terms with the signs of the residual subtractions, and finally an $ab\\,$cov(Z, Z) term where the two minus signs multiply to plus. Substitute the values from earlier steps: cov(X, Y) = 0 (independence), cov(X, Z) = a and cov(Y, Z) = b (step 2), var(Z) = 1 (assumption). The two cross-terms each contribute −ab; the +ab from var(Z) cancels one of them; what is left is −ab.',
    visualization: vizSlot(3, 4),
    formula:
      '\\begin{aligned}'
      + ' \\mathrm{cov}(\\tilde X, \\tilde Y)'
      + ' &= \\mathrm{cov}(X - aZ,\\; Y - bZ) \\\\'
      + ' &= \\mathrm{cov}(X, Y - bZ) - a\\,\\mathrm{cov}(Z, Y - bZ) \\\\'
      + ' &= \\mathrm{cov}(X, Y) - b\\,\\mathrm{cov}(X, Z) - a\\,\\mathrm{cov}(Y, Z) + ab\\,\\mathrm{var}(Z) \\\\'
      + ' &= 0 - b \\cdot a - a \\cdot b + ab \\cdot 1 \\\\'
      + ' &= -ab'
      + ' \\end{aligned}',
  },
  {
    caption:
      'Compute var(X̃) by writing the variance as a self-covariance, var(W) = cov(W, W), and applying bilinearity. The four cross-products give var(X), two copies of $a\\,$cov(X, Z) (which combine by symmetry of cov), and $a^2\\,$var(Z). Substitute var(X) = 1, cov(X, Z) = a, var(Z) = 1. The 1 from var(X) loses 2$a^2$ from the cross-term and gains $a^2$ back from the var(Z) term; the result is $1 − a^2$. Residualizing on Z removes $a^2$ of X\'s variance, the slice that Z explained. The histogram on the right shows X̃ (red) sitting inside X (grey): visibly narrower.',
    visualization: vizSlot(4, 5),
    formula:
      '\\begin{aligned}'
      + ' \\mathrm{var}(\\tilde X)'
      + ' &= \\mathrm{cov}(X - aZ,\\; X - aZ) \\\\'
      + ' &= \\mathrm{cov}(X, X) - a\\,\\mathrm{cov}(X, Z) - a\\,\\mathrm{cov}(Z, X) + a^2\\,\\mathrm{cov}(Z, Z) \\\\'
      + ' &= \\mathrm{var}(X) - 2a\\,\\mathrm{cov}(X, Z) + a^2\\,\\mathrm{var}(Z) \\\\'
      + ' &= 1 - 2a \\cdot a + a^2 \\cdot 1 \\\\'
      + ' &= 1 - a^2'
      + ' \\end{aligned}',
  },
  {
    caption:
      'Same calculation for var(Ỹ), with b in place of a. Bilinear expansion of cov(Y − bZ, Y − bZ) gives var(Y) − 2$b\\,$cov(Y, Z) + $b^2\\,$var(Z). Substitute var(Y) = 1, cov(Y, Z) = b, var(Z) = 1, and simplify to $1 − b^2$. Together with the previous step, the two residuals lose $a^2$ and $b^2$ of variance respectively, exactly the slices Z explained. The histogram on the right shows Ỹ (red) inside Y (grey).',
    visualization: vizSlot(4, 6),
    formula:
      '\\begin{aligned}'
      + ' \\mathrm{var}(\\tilde Y)'
      + ' &= \\mathrm{cov}(Y - bZ,\\; Y - bZ) \\\\'
      + ' &= \\mathrm{cov}(Y, Y) - b\\,\\mathrm{cov}(Y, Z) - b\\,\\mathrm{cov}(Z, Y) + b^2\\,\\mathrm{cov}(Z, Z) \\\\'
      + ' &= \\mathrm{var}(Y) - 2b\\,\\mathrm{cov}(Y, Z) + b^2\\,\\mathrm{var}(Z) \\\\'
      + ' &= 1 - 2b \\cdot b + b^2 \\cdot 1 \\\\'
      + ' &= 1 - b^2'
      + ' \\end{aligned}',
  },
  {
    caption:
      'Plug the three pieces from steps 4–6 into the partial correlation formula $r(X, Y \\mid Z) = \\mathrm{corr}(\\tilde X, \\tilde Y) = \\mathrm{cov}(\\tilde X, \\tilde Y) / \\sqrt{\\mathrm{var}(\\tilde X)\\,\\mathrm{var}(\\tilde Y)}$. The covariance is $-ab$; the variances are $1 - a^2$ and $1 - b^2$; the result is $-ab$ over $\\sqrt{(1 - a^2)(1 - b^2)}$. The negative sign is the whole point: conditioning on a collider couples the two upstream causes in opposite directions, even though they were unconditionally independent. The dashed arc on the DAG is the correlation that appears once Z is held fixed.',
    visualization: vizSlot(5, 7),
    formula:
      '\\begin{aligned}'
      + ' r(X, Y \\mid Z)'
      + ' &= \\mathrm{corr}(\\tilde X, \\tilde Y) \\\\'
      + ' &= \\frac{\\mathrm{cov}(\\tilde X, \\tilde Y)}{\\sqrt{\\mathrm{var}(\\tilde X)\\,\\mathrm{var}(\\tilde Y)}} \\\\'
      + ' &= \\frac{-ab}{\\sqrt{(1 - a^2)(1 - b^2)}}'
      + ' \\end{aligned}',
  },
];

export default function ColliderDerivation() {
  return <DerivationStepper title="The collider partial correlation" steps={STEPS} />;
}
