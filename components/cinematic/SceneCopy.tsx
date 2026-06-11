import type { ReactNode } from 'react'
import type { SceneConfig } from '@/lib/sceneData'

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

/**
 * Copy block — real text always in the DOM (SEO/a11y). Timeline owns
 * autoAlpha/y of the children (copyIn/copyOut); mouse parallax counter-drifts
 * the container in x/y px (step 8).
 */
export default function SceneCopy({
  cfg,
  headingLevel,
}: {
  cfg: SceneConfig
  headingLevel: 'h1' | 'h2'
}) {
  const Heading = headingLevel
  return (
    <div className={`scene__copy copy--${cfg.copyLayout}`}>
      <div className="scene__copy-inner">
        <p className="label">{cfg.label}</p>
        <Heading className="headline">
          {cfg.headline.map((line, i) => (
            <span className="headline__line" key={i}>
              {renderLine(line, i === cfg.goldLine, cfg.goldText)}
            </span>
          ))}
        </Heading>
        <p className="body-copy">{cfg.body}</p>
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
    </div>
  )
}
