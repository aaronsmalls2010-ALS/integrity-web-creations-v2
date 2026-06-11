import type { CSSProperties } from 'react'
import type { SceneConfig } from '@/lib/sceneData'
import SceneDepth from './SceneDepth'
import SceneBg from './SceneBg'
import SceneCopy from './SceneCopy'

/**
 * Scene shell — depth (static translateZ) and motion (timeline transforms)
 * are SEPARATE nested layers; they must never share an element.
 *
 * `placeholder` = Build Order step 3 de-risk plate color. While set, the
 * scene renders a solid plate and no copy (scenes 3–7 until the step-5
 * checkpoint is signed off); the timeline code is identical either way.
 */
export default function Scene({
  cfg,
  index,
  placeholder,
}: {
  cfg: SceneConfig
  index: number
  placeholder?: string
}) {
  return (
    <div
      className="scene"
      id={cfg.id}
      style={
        {
          '--focal-desktop': cfg.objectPosition.desktop,
          '--focal-mobile': cfg.objectPosition.mobile,
        } as CSSProperties
      }
    >
      <SceneDepth layer="far">
        <SceneBg cfg={cfg} index={index} placeholder={placeholder} />
      </SceneDepth>
      <SceneDepth layer="mid">
        <div className="scene__grad" style={{ background: cfg.gradient }} />
      </SceneDepth>
      <SceneDepth layer="near">
        {!placeholder && (
          <SceneCopy cfg={cfg} headingLevel={index === 0 ? 'h1' : 'h2'} />
        )}
      </SceneDepth>
    </div>
  )
}
