/* ----------------------------------------------------------------
   PedigreeContrast. Side-by-side: an outbred individual's ancestry
   (clean binary tree, 15 distinct ancestors over four generations)
   vs an intensely inbred individual's ancestry (the same generations
   collapse onto seven individuals descending from just two founders).
   The visual difference is the motivation for path analysis.
   ---------------------------------------------------------------- */

type Kind = 'focal' | 'ancestor' | 'founder';
type PNode = { id: string; x: number; y: number; kind: Kind };
type PEdge = { from: string; to: string };
type PedigreeData = { w: number; h: number; nodes: PNode[]; edges: PEdge[] };

const OUTBRED: PedigreeData = (() => {
  const w = 320, h = 280;
  const nodes: PNode[] = [];
  const edges: PEdge[] = [];

  const g3x = [20, 60, 100, 140, 180, 220, 260, 300];
  g3x.forEach((x, i) => nodes.push({ id: `G3_${i}`, x, y: 30, kind: 'ancestor' }));

  const g2x = [40, 120, 200, 280];
  g2x.forEach((x, i) => {
    nodes.push({ id: `G2_${i}`, x, y: 110, kind: 'ancestor' });
    edges.push({ from: `G3_${i * 2}`,     to: `G2_${i}` });
    edges.push({ from: `G3_${i * 2 + 1}`, to: `G2_${i}` });
  });

  const g1x = [80, 240];
  g1x.forEach((x, i) => {
    nodes.push({ id: `G1_${i}`, x, y: 190, kind: 'ancestor' });
    edges.push({ from: `G2_${i * 2}`,     to: `G1_${i}` });
    edges.push({ from: `G2_${i * 2 + 1}`, to: `G1_${i}` });
  });

  nodes.push({ id: 'O', x: 160, y: 260, kind: 'focal' });
  edges.push({ from: 'G1_0', to: 'O' });
  edges.push({ from: 'G1_1', to: 'O' });

  return { w, h, nodes, edges };
})();

const INBRED: PedigreeData = {
  w: 320, h: 280,
  nodes: [
    { id: 'A',  x: 130, y: 30,  kind: 'founder' },
    { id: 'B',  x: 190, y: 30,  kind: 'founder' },
    { id: 'G1', x: 130, y: 110, kind: 'ancestor' },
    { id: 'G2', x: 190, y: 110, kind: 'ancestor' },
    { id: 'P1', x: 130, y: 190, kind: 'ancestor' },
    { id: 'P2', x: 190, y: 190, kind: 'ancestor' },
    { id: 'O',  x: 160, y: 260, kind: 'focal' },
  ],
  edges: [
    { from: 'A',  to: 'G1' }, { from: 'B',  to: 'G1' },
    { from: 'A',  to: 'G2' }, { from: 'B',  to: 'G2' },
    { from: 'G1', to: 'P1' }, { from: 'G2', to: 'P1' },
    { from: 'G1', to: 'P2' }, { from: 'G2', to: 'P2' },
    { from: 'P1', to: 'O' },  { from: 'P2', to: 'O' },
  ],
};

function PedigreeSVG({
  data, title, footnote,
}: {
  data: PedigreeData;
  title: string;
  footnote: string;
}) {
  const byId = new Map(data.nodes.map((n) => [n.id, n]));
  const r = 8;
  return (
    <div style={{ flex: '1 1 240px', minWidth: 220, maxWidth: 360 }}>
      <div style={{
        textAlign: 'center',
        fontFamily: 'var(--font-sans)',
        fontSize: '.75rem',
        textTransform: 'uppercase',
        letterSpacing: '.08em',
        color: 'var(--ink-muted)',
        marginBottom: '.6rem',
      }}>{title}</div>
      <svg
        viewBox={`0 0 ${data.w} ${data.h}`}
        style={{ width: '100%', maxHeight: 260, display: 'block' }}
        role="img"
        aria-label={`${title} pedigree`}
      >
        {data.edges.map((e, i) => {
          const a = byId.get(e.from)!;
          const b = byId.get(e.to)!;
          return (
            <line
              key={i}
              x1={a.x} y1={a.y + r * 0.7}
              x2={b.x} y2={b.y - r * 0.7}
              stroke="#9a958a"
              strokeWidth={1}
            />
          );
        })}
        {data.nodes.map((n) => {
          const fill =
            n.kind === 'founder' ? '#b03a2e' :
            n.kind === 'focal'   ? '#2c5d8a' :
                                   '#1a1a1a';
          return (
            <circle
              key={n.id}
              cx={n.x} cy={n.y}
              r={r}
              fill={fill}
            />
          );
        })}
      </svg>
      <div style={{
        textAlign: 'center',
        fontFamily: 'var(--font-sans)',
        fontSize: '.78rem',
        color: 'var(--ink-muted)',
        marginTop: '.6rem',
        lineHeight: 1.45,
      }}>{footnote}</div>
    </div>
  );
}

export default function PedigreeContrast() {
  return (
    <figure style={{
      margin: '2.4rem 0',
      padding: '1.4rem',
      background: 'white',
      border: '1px solid var(--rule)',
      borderRadius: 4,
    }}>
      <div style={{
        display: 'flex',
        gap: '2rem',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        <PedigreeSVG
          data={OUTBRED}
          title="Outbred"
          footnote="15 distinct ancestors over four generations."
        />
        <PedigreeSVG
          data={INBRED}
          title="After two generations of full-sib mating"
          footnote="The same four generations collapse onto seven individuals, descending from just two founders (red)."
        />
      </div>
      <figcaption style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '.82rem',
        color: 'var(--ink-muted)',
        textAlign: 'center',
        marginTop: '1rem',
        lineHeight: 1.5,
      }}>
        The same focal animal (blue) has many more redundant paths back
        to its founders on the right than on the left. Wright's question
        is how to summarise that redundancy in a single number.
      </figcaption>
    </figure>
  );
}
