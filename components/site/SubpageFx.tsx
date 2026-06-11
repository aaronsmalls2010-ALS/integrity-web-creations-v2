'use client'

import { useEffect } from 'react'

/**
 * Brings the landing's motion language to the subpages: the page fades in
 * from black, content reveals sequentially top→bottom as it enters the
 * viewport (one element at a time, never overlapping), CTAs get a magnetic
 * hover pull, and internal navigation exits through black — the same
 * fade-through-black grammar as the scene transitions. Respects
 * prefers-reduced-motion (plain reveals + instant navigation).
 */
const TARGETS = [
  '.subpage__header > *',
  '.subpage h2',
  '.subpage__inner > .lede',
  '.sub-card',
  '.process-steps li',
  '.timeline li',
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

    // magnetic CTA hovers (desktop pointers only)
    const cleanups: (() => void)[] = []
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      document.querySelectorAll<HTMLElement>('.subpage .cta').forEach((cta) => {
        const move = (e: PointerEvent) => {
          const r = cta.getBoundingClientRect()
          const x = (e.clientX - r.left) / r.width - 0.5
          const y = (e.clientY - r.top) / r.height - 0.5
          cta.style.transform = `translate(${(x * 10).toFixed(1)}px, ${(y * 8).toFixed(1)}px)`
        }
        const leave = () => {
          cta.style.transform = ''
        }
        cta.addEventListener('pointermove', move)
        cta.addEventListener('pointerleave', leave)
        cleanups.push(() => {
          cta.removeEventListener('pointermove', move)
          cta.removeEventListener('pointerleave', leave)
        })
      })
    }

    // internal links exit through black (same grammar as scene transitions)
    const onClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return
      const a = (e.target as Element).closest('a')
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return
      const href = a.getAttribute('href')
      if (!href || !href.startsWith('/')) return
      if (href === location.pathname) return
      e.preventDefault()
      document.body.classList.add('route-leave')
      setTimeout(() => {
        window.location.href = href
      }, 420)
    }
    document.addEventListener('click', onClick)

    return () => {
      clearTimeout(timer)
      io.disconnect()
      cleanups.forEach((fn) => fn())
      document.removeEventListener('click', onClick)
      document.body.classList.remove('route-leave')
    }
  }, [])
  return null
}
