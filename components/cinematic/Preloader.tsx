/**
 * Fixed overlay (deep navy), IWC monogram, thin gold progress bar.
 * Lives OUTSIDE the smooth wrapper. Visible < 100ms (styles ship in the
 * render-blocking global stylesheet). The bar fill + fade are driven directly
 * from the boot sequence in Cinematic.tsx; every #cinematic image decodes
 * before the experience starts — the loop revisits all scenes, so nothing
 * inside the pin may lazy-load.
 */
export default function Preloader() {
  return (
    <div id="preloader" role="status" aria-label="Loading Integrity Web Creations">
      <div className="preloader__mark" aria-hidden="true">
        IWC
      </div>
      <div className="preloader__sub" aria-hidden="true">
        Integrity Web Creations
      </div>
      <div className="preloader__bar" aria-hidden="true">
        <span id="preloader-bar-fill"></span>
      </div>
    </div>
  )
}
