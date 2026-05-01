import { useMemo, useState } from 'react';
import katex from 'katex';

/* ----------------------------------------------------------------
   DerivationStepper. Generic carousel for walking a reader through
   a derivation step by step. Each Step is { caption, visualization,
   formula? }; the component handles rendering the formula via KaTeX,
   navigation via Prev/Next + step dots, and a fixed-height area so
   the page does not jump as the user advances.
   ---------------------------------------------------------------- */

export type Step = {
  caption: string;
  visualization: React.ReactNode;
  formula?: string;
};

type Props = {
  title: string;
  steps: Step[];
};

export default function DerivationStepper({ title, steps }: Props) {
  const [idx, setIdx] = useState(0);
  const step = steps[idx];

  const formulaHtml = useMemo(
    () =>
      step.formula
        ? katex.renderToString(step.formula, { displayMode: true, throwOnError: false })
        : null,
    [step.formula],
  );

  const goPrev = () => setIdx((i) => Math.max(0, i - 1));
  const goNext = () => setIdx((i) => Math.min(steps.length - 1, i + 1));

  return (
    <figure style={{
      margin: '2.4rem 0',
      padding: '1.4rem',
      background: 'white',
      border: '1px solid var(--rule)',
      borderRadius: 4,
    }}>
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: '1rem',
        fontFamily: 'var(--font-sans)',
      }}>
        <span style={{
          fontSize: '.78rem',
          textTransform: 'uppercase',
          letterSpacing: '.1em',
          color: 'var(--ink-muted)',
          fontWeight: 600,
        }}>{title}</span>
        <span style={{
          fontSize: '.75rem',
          color: 'var(--ink-faint)',
        }}>Step {idx + 1} of {steps.length}</span>
      </header>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {step.visualization}
      </div>

      <div
        style={{
          margin: '1rem auto .4rem',
          textAlign: 'center',
          minHeight: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {formulaHtml ? (
          <span dangerouslySetInnerHTML={{ __html: formulaHtml }} />
        ) : (
          <span style={{ color: 'var(--ink-faint)', fontFamily: 'var(--font-sans)', fontSize: '.85rem' }}>
            (no formula yet)
          </span>
        )}
      </div>

      <p style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '.88rem',
        color: 'var(--ink-muted)',
        margin: '.4rem 0 1.2rem',
        lineHeight: 1.55,
      }}>{renderCaption(step.caption)}</p>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
      }}>
        <button
          type="button"
          onClick={goPrev}
          disabled={idx === 0}
          style={btnStyle(idx === 0)}
        >← Previous</button>

        <div style={{ display: 'flex', gap: '.5rem' }}>
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`Go to step ${i + 1}`}
              style={{
                width: 10, height: 10,
                borderRadius: 5,
                background: i === idx ? 'var(--ink)' : 'var(--rule)',
                border: 0,
                padding: 0,
                cursor: 'pointer',
              }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={goNext}
          disabled={idx === steps.length - 1}
          style={btnStyle(idx === steps.length - 1)}
        >Next →</button>
      </div>
    </figure>
  );
}

/* Caption renderer that supports inline math via $...$ and italic via
   *...*. Done in two passes (math first, italic second) so that the
   two can nest, e.g. *italic phrase containing $x = 1$ math*. */
function renderCaption(text: string): React.ReactNode {
  const withMath = text.replace(/\$([^$\n]+)\$/g, (_, tex: string) =>
    katex.renderToString(tex, { throwOnError: false }),
  );
  const withItalic = withMath.replace(/\*([^*\n]+)\*/g, (_, body: string) =>
    `<em>${body}</em>`,
  );
  return <span dangerouslySetInnerHTML={{ __html: withItalic }} />;
}

function btnStyle(disabled: boolean): React.CSSProperties {
  return {
    fontFamily: 'var(--font-sans)',
    fontSize: '.82rem',
    padding: '.45rem .9rem',
    border: '1px solid ' + (disabled ? 'var(--rule)' : 'var(--ink)'),
    background: disabled ? 'transparent' : 'var(--ink)',
    color: disabled ? 'var(--ink-faint)' : 'white',
    borderRadius: 3,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
  };
}
