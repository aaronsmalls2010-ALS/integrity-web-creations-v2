'use client'

/** Accessibility: visible on focus; jumps to the scene7 label (the CTA) —
 *  there is no "past" the cinematic, the loop IS the page. */
export default function SkipIntro({
  onNavigate,
}: {
  onNavigate: (label: string) => void
}) {
  return (
    <a
      id="skip-intro"
      href="#"
      data-target="scene7"
      onClick={(e) => {
        e.preventDefault()
        onNavigate('scene7')
      }}
    >
      Skip to offer
    </a>
  )
}
