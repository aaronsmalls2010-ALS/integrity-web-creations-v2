'use client'

/**
 * ALL fixed chrome lives OUTSIDE the smooth wrapper — position:fixed breaks
 * inside transformed ancestors (ScrollSmoother transforms #smooth-content).
 * Scene counter + nav dots removed per Aaron 2026-06-11.
 */
import TopNav from './TopNav'
import BrandMark from './BrandMark'
import ProgressLine from './ProgressLine'
import ScrollCue from './ScrollCue'
import LegalLine from './LegalLine'
import SkipIntro from './SkipIntro'

export default function Chrome({
  onNavigate,
}: {
  onNavigate: (label: string) => void
}) {
  return (
    <div id="chrome">
      <TopNav />
      <BrandMark />
      <ProgressLine />
      <ScrollCue />
      <LegalLine />
      <SkipIntro onNavigate={onNavigate} />
    </div>
  )
}
