'use client'

/**
 * ALL fixed chrome lives OUTSIDE the smooth wrapper — position:fixed breaks
 * inside transformed ancestors (ScrollSmoother transforms #smooth-content).
 */
import TopNav from './TopNav'
import SceneCounter from './SceneCounter'
import BrandMark from './BrandMark'
import NavDots from './NavDots'
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
      <SceneCounter />
      <BrandMark />
      <NavDots onNavigate={onNavigate} />
      <ProgressLine />
      <ScrollCue />
      <LegalLine />
      <SkipIntro onNavigate={onNavigate} />
    </div>
  )
}
