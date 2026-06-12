import Image from 'next/image'
import type { SceneConfig } from '@/lib/sceneData'

/**
 * Timeline-owned background plate (xPercent/yPercent/scale/autoAlpha via the
 * scrubbed master; x/y px via mouse parallax — independent properties).
 *
 * The loop revisits every scene, so nothing here may lazy-load: all images are
 * eager and the preloader decodes each before the experience starts.
 *
 * `placeholder` renders the Build-Order-step-3 de-risk plate (solid color) —
 * the same .scene__bg element receives the same timeline transforms, so the
 * choreography and wrap are validated before real imagery lands (step 6).
 */
export default function SceneBg({
  cfg,
  index,
  placeholder,
}: {
  cfg: SceneConfig
  index: number
  placeholder?: string
}) {
  return (
    <div className="scene__bg">
      {placeholder ? (
        <div className="scene__ph" style={{ background: placeholder }}>
          <span aria-hidden="true">
            SCENE 0{index + 1} · PLACEHOLDER
          </span>
        </div>
      ) : (
        <>
          <Image
            src={cfg.image}
            alt=""
            fill
            sizes="100vw"
            quality={82}
            priority={index <= 1}
            loading={index <= 1 ? undefined : 'eager'}
            // scenes with a reveal plate open from BLACK: the base plate
            // fades in first (intro), so it starts hidden
            className={cfg.revealImage ? 'object-cover bg-base' : 'object-cover'}
          />
          {cfg.revealImage && (
            // dissolves in over the base plate on load (intro owns the fade;
            // it stays revealed for the life of the session — the loop lands
            // on the complete card)
            <Image
              src={cfg.revealImage}
              alt=""
              fill
              sizes="100vw"
              quality={82}
              priority={index <= 1}
              className="object-cover bg-reveal"
            />
          )}
          {cfg.video && (
            // mobile "living scene" (Aaron 2026-06-11 night): the scene's
            // film segment plays once over the still when the scene becomes
            // active (Cinematic.setActiveScene), then freezes. Hidden on
            // desktop (film mode scrubs the full film instead).
            <video
              className="scene-video"
              src={cfg.video}
              muted
              playsInline
              preload="metadata"
              aria-hidden="true"
              tabIndex={-1}
            />
          )}
        </>
      )}
    </div>
  )
}
