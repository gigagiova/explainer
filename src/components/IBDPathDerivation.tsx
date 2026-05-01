import DerivationStepper, { type Step } from './DerivationStepper.tsx';

/* ----------------------------------------------------------------
   IBDPathDerivation. Walks the reader through deriving F_O for the
   simplest case: two parents X, Y sharing one common ancestor A
   (with two visible gene copies labeled 1 and 2), and one
   intermediate ancestor between A and each parent. Five steps:
     1. Setup: A has two distinct gene copies.
     2. Probability copy 1 reaches O via X.
     3. Probability copy 1 reaches O via Y.
     4. Independence -> multiply.
     5. Either copy could be shared -> add, doubling the result.
   ---------------------------------------------------------------- */

const W = 360;
const H = 250;

const A_POS  = { x: 180, y: 40 };
const IL_POS = { x: 95,  y: 105 };
const IR_POS = { x: 265, y: 105 };
const X_POS  = { x: 95,  y: 170 };
const Y_POS  = { x: 265, y: 170 };
const O_POS  = { x: 180, y: 220 };

const NODE_R = 18;
const A_R = 22;

type EdgeId = 'A-IL' | 'IL-X' | 'X-O' | 'A-IR' | 'IR-Y' | 'Y-O';

const EDGES: { id: EdgeId; from: { x: number; y: number }; to: { x: number; y: number } }[] = [
  { id: 'A-IL', from: A_POS,   to: IL_POS },
  { id: 'IL-X', from: IL_POS,  to: X_POS },
  { id: 'X-O',  from: X_POS,   to: O_POS },
  { id: 'A-IR', from: A_POS,   to: IR_POS },
  { id: 'IR-Y', from: IR_POS,  to: Y_POS },
  { id: 'Y-O',  from: Y_POS,   to: O_POS },
];

const LEFT_PATH: EdgeId[] = ['A-IL', 'IL-X', 'X-O'];
const RIGHT_PATH: EdgeId[] = ['A-IR', 'IR-Y', 'Y-O'];

function PedigreeViz({
  highlightLeft,
  highlightRight,
  copy1,
  copy2,
}: {
  highlightLeft: boolean;
  highlightRight: boolean;
  copy1: boolean;
  copy2: boolean;
}) {
  const leftSet = new Set(LEFT_PATH);
  const rightSet = new Set(RIGHT_PATH);

  const colorFor = (id: EdgeId) => {
    const onLeft = highlightLeft && leftSet.has(id);
    const onRight = highlightRight && rightSet.has(id);
    return onLeft || onRight ? '#b03a2e' : '#bdb6a8';
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', maxWidth: 460, maxHeight: 320, display: 'block' }}
      role="img"
      aria-label="Pedigree from common ancestor A through both parents to focal individual O."
    >
      {EDGES.map((e) => {
        const color = colorFor(e.id);
        const highlighted = color !== '#bdb6a8';
        const sw = highlighted ? 2 : 1;
        const dx = e.to.x - e.from.x;
        const dy = e.to.y - e.from.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const fromR = e.from === A_POS ? A_R : NODE_R;
        const toR = NODE_R;
        const x1 = e.from.x + fromR * 0.6 * ux;
        const y1 = e.from.y + fromR * 0.6 * uy;
        const x2 = e.to.x - toR * 0.6 * ux;
        const y2 = e.to.y - toR * 0.6 * uy;
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const sign = e.from.x < W / 2 ? -1 : e.from.x > W / 2 ? 1 : (e.to.x < W / 2 ? -1 : 1);
        const offset = 12;
        const lx = midX + (-uy) * offset * sign;
        const ly = midY + ux * offset * sign + 4;

        return (
          <g key={e.id}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={sw} />
            <text
              x={lx} y={ly}
              textAnchor="middle"
              fontFamily="Inter, system-ui, sans-serif"
              fontStyle="italic"
              fontSize={11}
              fill={highlighted ? '#b03a2e' : 'var(--ink-faint)'}
            >½</text>
          </g>
        );
      })}

      {/* Intermediate ancestors */}
      <circle cx={IL_POS.x} cy={IL_POS.y} r={NODE_R} fill="#fbfaf6" stroke="#888" strokeWidth={1.5} />
      <circle cx={IR_POS.x} cy={IR_POS.y} r={NODE_R} fill="#fbfaf6" stroke="#888" strokeWidth={1.5} />

      {/* Parents */}
      <Node x={X_POS.x} y={X_POS.y} label="X" fill="#1a1a1a" labelFill="white" />
      <Node x={Y_POS.x} y={Y_POS.y} label="Y" fill="#1a1a1a" labelFill="white" />

      {/* Focal */}
      <Node x={O_POS.x} y={O_POS.y} label="O" fill="#2c5d8a" labelFill="white" />

      {/* Common ancestor A with two visible gene copies */}
      <circle cx={A_POS.x} cy={A_POS.y} r={A_R} fill="#b03a2e" />
      <text
        x={A_POS.x} y={A_POS.y - 5}
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize={11}
        fontWeight={700}
        fill="white"
      >A</text>
      <Copy x={A_POS.x - 8} y={A_POS.y + 8} label="1" active={copy1} />
      <Copy x={A_POS.x + 8} y={A_POS.y + 8} label="2" active={copy2} />
    </svg>
  );
}

function Node({
  x, y, label, fill, labelFill,
}: {
  x: number; y: number; label: string; fill: string; labelFill: string;
}) {
  return (
    <g>
      <circle cx={x} cy={y} r={NODE_R} fill={fill} />
      <text
        x={x} y={y + 5}
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize={13}
        fontWeight={600}
        fill={labelFill}
      >{label}</text>
    </g>
  );
}

function Copy({
  x, y, label, active,
}: {
  x: number; y: number; label: string; active: boolean;
}) {
  const fill = active ? '#fbfaf6' : '#7e3324';
  const txt = active ? '#b03a2e' : '#d4a89f';
  return (
    <g>
      <circle cx={x} cy={y} r={5.5} fill={fill} stroke="#fbfaf6" strokeWidth={0.8} />
      <text
        x={x} y={y + 2.5}
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize={8}
        fontWeight={700}
        fill={txt}
      >{label}</text>
    </g>
  );
}

const STEPS: Step[] = [
  {
    caption:
      'The shared ancestor A is diploid: it carries two physically distinct gene copies at this locus, labeled 1 and 2. Each parent-child meiosis transmits one specific copy with probability ½, independently of every other meiosis.',
    visualization: <PedigreeViz highlightLeft={false} highlightRight={false} copy1={false} copy2={false} />,
    formula: 'F_O \\;=\\; \\Pr(\\text{both gene copies in } O \\text{ are IBD via } A) \\;=\\; \\,?',
  },
  {
    caption:
      'Pick copy 1 and trace it down through X. The path has n₁ links from A to X, plus one final transmission X → O. Each step contributes a factor of ½, all independent.',
    visualization: <PedigreeViz highlightLeft={true} highlightRight={false} copy1={true} copy2={false} />,
    formula: '\\Pr(\\text{copy 1 reaches } O \\text{ via } X) \\;=\\; \\left(\\tfrac{1}{2}\\right)^{n_1 + 1}',
  },
  {
    caption:
      'By the same argument on the other side, copy 1 reaches O via Y with the analogous probability.',
    visualization: <PedigreeViz highlightLeft={true} highlightRight={true} copy1={true} copy2={false} />,
    formula: '\\Pr(\\text{copy 1 reaches } O \\text{ via } Y) \\;=\\; \\left(\\tfrac{1}{2}\\right)^{n_2 + 1}',
  },
  {
    caption:
      'The two paths share no individual other than A itself, so the transmissions on the two sides are independent. The probability that BOTH sides deliver copy 1 is the product.',
    visualization: <PedigreeViz highlightLeft={true} highlightRight={true} copy1={true} copy2={false} />,
    formula:
      '\\begin{aligned} \\Pr(\\text{both deliver copy 1}) &= \\left(\\tfrac{1}{2}\\right)^{n_1 + 1} \\!\\cdot\\! \\left(\\tfrac{1}{2}\\right)^{n_2 + 1} \\\\ &= \\left(\\tfrac{1}{2}\\right)^{n_1 + n_2 + 2} \\end{aligned}',
  },
  {
    caption:
      'Either of A\'s two copies could play the role of "the shared one" (copy 1 OR copy 2), and the two cases are mutually exclusive. We add their probabilities, which doubles the result.',
    visualization: <PedigreeViz highlightLeft={true} highlightRight={true} copy1={true} copy2={true} />,
    formula:
      '\\begin{aligned} F_O &= 2 \\!\\cdot\\! \\left(\\tfrac{1}{2}\\right)^{n_1 + n_2 + 2} \\\\ &= \\left(\\tfrac{1}{2}\\right)^{n_1 + n_2 + 1} \\end{aligned}',
  },
];

export default function IBDPathDerivation() {
  return <DerivationStepper title="The single-ancestor case" steps={STEPS} />;
}
