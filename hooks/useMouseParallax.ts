'use client'

/**
 * Dual-layer mouse parallax (desktop only) — background WITH cursor, copy
 * AGAINST it. x/y (px) and xPercent/yPercent are independent GSAP properties
 * that compose — mouse parallax never fights the scrub. `overwrite: 'auto'`
 * is safe because it only kills other x/y px tweens.
 *
 * Wired in Build Order step 8 (depth pass). Exported now so the architecture
 * is complete; NOT invoked before the checkpoint.
 */

import { gsap } from '@/lib/gsap'

export function enableMouseParallax(): () => void {
  if (!matchMedia('(pointer: fine)').matches) return () => {}

  let raf = 0
  const onMove = (e: MouseEvent) => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => {
      const x = e.clientX / innerWidth - 0.5
      const y = e.clientY / innerHeight - 0.5
      gsap.to('.scene.is-active .scene__bg', {
        x: x * 16,
        y: y * 10,
        duration: 1.8,
        ease: 'power1.out',
        overwrite: 'auto',
      })
      gsap.to('.scene.is-active .scene__copy', {
        x: x * -6,
        y: y * -4,
        duration: 1.8,
        ease: 'power1.out',
        overwrite: 'auto',
      })
    })
  }

  addEventListener('mousemove', onMove)
  return () => {
    cancelAnimationFrame(raf)
    removeEventListener('mousemove', onMove)
  }
}
