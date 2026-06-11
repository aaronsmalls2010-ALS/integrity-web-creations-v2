'use client'

import { useEffect } from 'react'

/**
 * Brings the landing's motion language to the subpages: the page fades in
 * from black, and content reveals sequentially top→bottom as it enters the
 * viewport — one element at a time, never overlapping (same principle as
 * the cinematic's line-by-line reveals). Respects prefers-reduced-motion.
 */
const TARGETS = [
  '.subpage__header > *',
  '.subpage h2',
  '.subpage > .subpage__inner > .lede',
  '.sub-card',
  '.process-steps li',
  '.cta-banner',
  '.contact-grid > *',
  '.subpage-footer__grid > div',
].join(', ')

export default function SubpageFx() {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const els = Array.from(document.querySelectorAll(TARGETS))
    els.forEach((el) => el.classList.add('fx-reveal'))

    let batch: Element[] = []
    let timer: ReturnType<typeof setTimeout> | undefined
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            batch.push(e.target)
            io.unobserve(e.target)
          }
        }
        if (batch.length) {
          clearTimeout(timer)
          timer = setTimeout(() => {
            // strictly sequential: top of the page reveals first
            batch.sort(
              (a, b) =>
                a.getBoundingClientRect().top - b.getBoundingClientRect().top,
            )
            batch.forEach((el, i) => {
              ;(el as HTMLElement).style.transitionDelay = `${i * 0.22}s`
              el.classList.add('is-in')
            })
            batch = []
          }, 40)
        }
      },
      { threshold: 0.12 },
    )
    els.forEach((el) => io.observe(el))
    return () => {
      clearTimeout(timer)
      io.disconnect()
    }
  }, [])
  return null
}
