/** Fades once scroll progress passes 5% (updateChrome toggles .is-hidden). */
export default function ScrollCue() {
  return (
    <div id="scroll-cue" aria-hidden="true">
      <span className="scroll-cue__text">Scroll</span>
      <span className="scroll-cue__line"></span>
    </div>
  )
}
