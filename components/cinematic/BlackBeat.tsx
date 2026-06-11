/**
 * T5 black moment — the screen fills the frame and the scrub-driven
 * typewriter runs. The blinking cursor dot is pure CSS animation (allowed:
 * stateless decoration). Text content is owned by the tweened state object
 * in t5_liftOver — never set it from anywhere else.
 */
export default function BlackBeat() {
  return (
    <div id="black-beat" aria-hidden="true">
      <p></p>
      <span className="cursor-dot"></span>
    </div>
  )
}
