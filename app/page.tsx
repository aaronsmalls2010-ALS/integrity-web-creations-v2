import Cinematic from '@/components/cinematic/Cinematic'

/**
 * The homepage IS the loop — an infinitely looping, scroll-driven cinematic:
 * [Logo intro — plays once] → Scene 2 → 3 → 4 → 5 → 6 → 7 → T7 descend →
 * (invisible wrap) → Scene 2 → … No below-fold content exists; navigation and
 * legal live in fixed chrome.
 */
export default function Home() {
  return <Cinematic />
}
