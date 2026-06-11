import type { ReactNode } from 'react'

/**
 * ScrollSmoother DOM contract. Fixed chrome must live OUTSIDE this wrapper
 * (ScrollSmoother transforms #smooth-content; position:fixed breaks inside
 * transformed ancestors). Reused by /contact (standard scroll, no pin).
 */
export default function SmoothWrapper({ children }: { children: ReactNode }) {
  return (
    <div id="smooth-wrapper">
      <div id="smooth-content">{children}</div>
    </div>
  )
}
