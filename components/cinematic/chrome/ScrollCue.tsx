/** Upward chevron — indicates the swipe/scroll motion (content moves up).
 *  Fades once scroll progress passes 5% (updateChrome toggles .is-hidden). */
export default function ScrollCue() {
  return (
    <div id="scroll-cue" aria-hidden="true">
      <span className="scroll-cue__arrow"></span>
      <span className="scroll-cue__text">Scroll</span>
    </div>
  )
}
