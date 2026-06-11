import type { ReactNode } from 'react'
import type { SceneColumn, SceneConfig } from '@/lib/sceneData'
import ContactForm from '@/components/site/ContactForm'

/** wraps the exact gold substring of a headline line in italic-gold <em> */
function renderLine(
  line: string,
  isGoldLine: boolean,
  goldText: string,
): ReactNode {
  if (!isGoldLine || !goldText) return line
  const i = line.indexOf(goldText)
  if (i === -1) return line
  return (
    <>
      {line.slice(0, i)}
      <em className="gold">{goldText}</em>
      {line.slice(i + goldText.length)}
    </>
  )
}

/** gold line icons matching the concept-3 mockup columns */
function ColIcon({ icon }: { icon: SceneColumn['icon'] }) {
  const stroke = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
  } as const
  return (
    <svg viewBox="0 0 48 48" className="col__icon" aria-hidden="true" {...stroke}>
      {icon === 'target' && (
        <>
          <circle cx="24" cy="24" r="14" />
          <circle cx="24" cy="24" r="8" />
          <circle cx="24" cy="24" r="2.4" fill="currentColor" stroke="none" />
          <path d="M24 24 L37 11 M33 11 h4 v4" />
        </>
      )}
      {icon === 'monitor' && (
        <>
          <rect x="9" y="12" width="30" height="20" />
          <rect x="12" y="15" width="24" height="6" />
          <rect x="12" y="23" width="11" height="6" />
          <rect x="25" y="23" width="11" height="6" />
          <path d="M24 32 v5 M17 39 h14" />
        </>
      )}
      {icon === 'squares' && (
        <>
          <rect x="11" y="11" width="18" height="18" />
          <rect x="19" y="19" width="18" height="18" />
        </>
      )}
      {icon === 'code' && <path d="M18 14 L8 24 L18 34 M30 14 L40 24 L30 34 M27 10 L21 38" />}
    </svg>
  )
}

/**
 * Copy block — real text always in the DOM (SEO/a11y). Timeline owns
 * autoAlpha/y of the children (copyIn/copyOut, scroll-staggered); mouse
 * parallax counter-drifts the container in x/y px (step 8).
 */
export default function SceneCopy({
  cfg,
  headingLevel,
}: {
  cfg: SceneConfig
  headingLevel: 'h1' | 'h2'
}) {
  const Heading = headingLevel
  if (cfg.textInImage) {
    // the text is part of the artwork — keep real text for SEO/a11y only.
    // plain elements (no .label/.headline classes) so the timeline,
    // SplitText, and copyIn/copyOut never touch it.
    return (
      <div className="visually-hidden">
        <Heading>{cfg.headline.join(' ')}</Heading>
        <p>{cfg.label}</p>
        <p>{cfg.body}</p>
      </div>
    )
  }
  return (
    <div className={`scene__copy copy--${cfg.copyLayout}`}>
      <div className="scene__copy-inner">
        {cfg.monogram && (
          <p className="monogram" aria-hidden="true">
            {cfg.monogram}
          </p>
        )}
        {cfg.label && <p className="label">{cfg.label}</p>}
        <Heading className="headline">
          {cfg.headline.map((line, i) => (
            <span className="headline__line" key={i}>
              {renderLine(line, i === cfg.goldLine, cfg.goldText)}
            </span>
          ))}
        </Heading>
        <p className="body-copy">{cfg.body}</p>
        {cfg.points && (
          <ul className="points-wrap">
            {cfg.points.map((p) => (
              <li className="point" key={p.title}>
                <p className="point__title">{p.title}</p>
                <p className="point__body">{p.body}</p>
              </li>
            ))}
          </ul>
        )}
        {cfg.services && (
          <ul className="services-wrap" aria-label="Services">
            {cfg.services.map((s) => (
              <li className="chip" key={s}>
                {s}
              </li>
            ))}
          </ul>
        )}
        {cfg.ctas && (
          <div className="cta-wrap">
            {cfg.ctas.map((cta) => (
              <a
                key={cta.text}
                href={cta.scrollLabel ? `#${cta.scrollLabel}` : cta.href}
                className={`cta cta--${cta.variant}`}
                data-scroll-label={cta.scrollLabel}
                data-cta={cta.analyticsId}
              >
                {cta.text}
              </a>
            ))}
          </div>
        )}
      </div>
      {cfg.contactForm && (
        <div className="form-panel">
          <p className="form-panel__title">Send a Message</p>
          <ContactForm />
        </div>
      )}
      {cfg.columns && (
        <ul className="columns-wrap" aria-label="What we do">
          {cfg.columns.map((col) => (
            <li className="col" key={col.title}>
              <ColIcon icon={col.icon} />
              <p className="col__title">{col.title}</p>
              <p className="col__body">{col.body}</p>
            </li>
          ))}
        </ul>
      )}
      {cfg.strap && <p className="strap">{cfg.strap}</p>}
    </div>
  )
}
