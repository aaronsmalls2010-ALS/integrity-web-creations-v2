/** Bottom progress line — width follows raw scroll progress. Resets to ~8%
 *  on wrap (scene2 position): intentional, it communicates the cycle. */
export default function ProgressLine() {
  return (
    <div id="progress-line" aria-hidden="true">
      <span id="progress-line-fill"></span>
    </div>
  )
}
