import { useMemo, useState } from 'react';

/* ------------------------------------------------------------------
   PedigreeF — interactive demonstration of Wright's path argument.
   Two parents X and Y share one common ancestor A. The user drags:
     - n1: number of generative links from A down to parent X
     - n2: number of generative links from A down to parent Y
     - fA: inbreeding coefficient of A itself
   The widget draws the pedigree and reports F of the offspring O = X x Y
   computed as F = (1/2)^(n1 + n2 + 1) * (1 + fA), the simplest case
   of Wright's formula.
   ------------------------------------------------------------------ */

type Props = {
  initialN1?: number;
  initialN2?: number;
  initialFA?: number;
};

export default function PedigreeF({ initialN1 = 1, initialN2 = 1, initialFA = 0 }: Props) {
  const [n1, setN1] = useState(initialN1);
  const [n2, setN2] = useState(initialN2);
  const [fA, setFA] = useState(initialFA);

  const F = useMemo(
    () => 0.5 ** (n1 + n2 + 1) * (1 + fA),
    [n1, n2, fA],
  );

  const layout = usePedigreeLayout(n1, n2);

  return (
    <div className="widget">
        <div className="widget__title">Wright's path formula — single common ancestor</div>

        <PedigreeSVG layout={layout} />

        <div className="widget__controls">
          <label>
            Links A&nbsp;→&nbsp;X (n₁): <strong style={{ color: 'var(--ink)' }}>{n1}</strong>
            <input
              type="range" min={1} max={5} step={1}
              value={n1}
              onChange={(e) => setN1(parseInt((e.target as HTMLInputElement).value, 10))}
            />
          </label>
          <label>
            Links A&nbsp;→&nbsp;Y (n₂): <strong style={{ color: 'var(--ink)' }}>{n2}</strong>
            <input
              type="range" min={1} max={5} step={1}
              value={n2}
              onChange={(e) => setN2(parseInt((e.target as HTMLInputElement).value, 10))}
            />
          </label>
          <label>
            f<sub>A</sub> of common ancestor: <strong style={{ color: 'var(--ink)' }}>{fA.toFixed(2)}</strong>
            <input
              type="range" min={0} max={1} step={0.05}
              value={fA}
              onChange={(e) => setFA(parseFloat((e.target as HTMLInputElement).value))}
            />
          </label>
          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
            <span style={{
              fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.06em',
              color: 'var(--ink-muted)',
            }}>
              F of offspring O
            </span>
            <span className="widget__readout">{F.toFixed(5)}</span>
          </div>
        </div>

        <p style={{
          marginTop: '1rem', marginBottom: 0,
          fontFamily: 'var(--font-sans)', fontSize: '.85rem', color: 'var(--ink-muted)',
        }}>
          {'F = (½)'}<sup>n₁+n₂+1</sup>{' · (1 + f'}<sub>A</sub>{') = (½)'}
          <sup>{n1 + n2 + 1}</sup>{` · (1 + ${fA.toFixed(2)}) = ${F.toFixed(5)}`}
        </p>
      </div>
  );
}

/* ---------- layout ---------- */

type Node = { id: string; label: string; x: number; y: number; kind: 'A' | 'mid' | 'parent' | 'O' };
type Edge = { from: string; to: string };

function usePedigreeLayout(n1: number, n2: number) {
  return useMemo<{ nodes: Node[]; edges: Edge[]; w: number; h: number }>(() => {
    const rowH = 64;
    const colW = 90;
    const maxN = Math.max(n1, n2);
    const h = (maxN + 2) * rowH + 30;

    // Common ancestor at top center.
    const cx = 0;
    const ay = 30;

    const left: Node[] = [];
    const right: Node[] = [];
    const edges: Edge[] = [];

    const A: Node = { id: 'A', label: 'A', x: cx, y: ay, kind: 'A' };

    // Build left chain A -> ... -> X
    let prev = A;
    for (let i = 1; i <= n1; i++) {
      const isParent = i === n1;
      const node: Node = {
        id: `L${i}`,
        label: isParent ? 'X' : '',
        x: cx - i * colW,
        y: ay + i * rowH,
        kind: isParent ? 'parent' : 'mid',
      };
      left.push(node);
      edges.push({ from: prev.id, to: node.id });
      prev = node;
    }
    const X = prev;

    // Build right chain A -> ... -> Y
    prev = A;
    for (let i = 1; i <= n2; i++) {
      const isParent = i === n2;
      const node: Node = {
        id: `R${i}`,
        label: isParent ? 'Y' : '',
        x: cx + i * colW,
        y: ay + i * rowH,
        kind: isParent ? 'parent' : 'mid',
      };
      right.push(node);
      edges.push({ from: prev.id, to: node.id });
      prev = node;
    }
    const Y = prev;

    const O: Node = {
      id: 'O',
      label: 'O',
      x: (X.x + Y.x) / 2,
      y: Math.max(X.y, Y.y) + rowH,
      kind: 'O',
    };
    edges.push({ from: X.id, to: 'O' });
    edges.push({ from: Y.id, to: 'O' });

    const nodes = [A, ...left, ...right, O];

    const xs = nodes.map((n) => n.x);
    const minX = Math.min(...xs) - 30;
    const maxX = Math.max(...xs) + 30;
    const w = maxX - minX;

    // shift everything so the SVG origin is at the bounding box's left edge
    for (const n of nodes) n.x -= minX;

    return { nodes, edges, w, h };
  }, [n1, n2]);
}

function PedigreeSVG({
  layout,
}: {
  layout: { nodes: Node[]; edges: Edge[]; w: number; h: number };
}) {
  const { nodes, edges, w, h } = layout;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const r = 18;

  return (
    <svg
      role="img"
      aria-label="Pedigree showing common ancestor A connected to parents X and Y, who produce offspring O."
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: '100%', maxHeight: 360, display: 'block' }}
    >
      {edges.map((e, i) => {
        const a = byId.get(e.from)!;
        const b = byId.get(e.to)!;
        return (
          <line
            key={i}
            x1={a.x} y1={a.y + r * 0.6}
            x2={b.x} y2={b.y - r * 0.6}
            stroke="#444" strokeWidth={1.2}
          />
        );
      })}
      {nodes.map((n) => {
        const fill =
          n.kind === 'A' ? '#b03a2e' :
          n.kind === 'O' ? '#2c5d8a' :
          n.kind === 'parent' ? '#1a1a1a' :
          '#fbfaf6';
        const stroke = n.kind === 'mid' ? '#555' : fill;
        const labelColor = n.kind === 'mid' ? '#1a1a1a' : 'white';
        return (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r={r} fill={fill} stroke={stroke} strokeWidth={1.5} />
            {n.label && (
              <text
                x={n.x} y={n.y + 4}
                textAnchor="middle"
                fontFamily="Inter, system-ui, sans-serif"
                fontSize={13}
                fontWeight={600}
                fill={labelColor}
              >
                {n.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
