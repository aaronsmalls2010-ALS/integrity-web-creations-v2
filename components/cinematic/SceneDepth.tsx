import type { ReactNode } from 'react'

/**
 * Depth placement layer — STATIC translateZ + compensation scale only (CSS).
 * TRANSFORM OWNERSHIP CONTRACT: never tween this element; timeline + mouse
 * transforms live on .scene__bg / .scene__copy inside it. Do not flatten.
 */
export default function SceneDepth({
  layer,
  children,
}: {
  layer: 'far' | 'mid' | 'near'
  children: ReactNode
}) {
  return <div className={`scene__depth scene__depth--${layer}`}>{children}</div>
}
