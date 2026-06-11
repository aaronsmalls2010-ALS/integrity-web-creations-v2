'use client'

/** 7 dots — jump anywhere instantly (the loop never traps the user).
 *  ≥44×44px hit area on mobile. Active state driven by updateChrome. */
export default function NavDots({
  onNavigate,
}: {
  onNavigate: (label: string) => void
}) {
  return (
    <nav id="nav-dots" aria-label="Scenes">
      {Array.from({ length: 7 }, (_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Go to scene ${i + 1}`}
          className={i === 0 ? 'is-active' : ''}
          onClick={() => onNavigate(`scene${i + 1}`)}
        >
          <span aria-hidden="true" />
        </button>
      ))}
    </nav>
  )
}
