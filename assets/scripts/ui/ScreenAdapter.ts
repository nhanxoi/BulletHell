/**
 * ScreenAdapter.ts
 * Picks the resolution policy from the screen shape so the whole 1280x720 design area always fits:
 * screens at least as wide as the design (16:9, 19.5:9 phones) use Fit Height and show extra space
 * at the sides; narrower screens (4:3 tablets, portrait web) use Fit Width and show extra space above
 * and below. With a single fixed policy, the HUD would be cut off on one of those two families.
 * Notches and rounded corners are handled separately by the SafeArea node that holds the HUD.
 *
 * Attach to node Canvas.
 */
import { _decorator, Component, ResolutionPolicy, view } from 'cc';
import { ViewEvents } from '../core/ViewEvents';
const { ccclass } = _decorator;

/** Switches between Fit Height and Fit Width when the screen is wider or narrower than the design. */
@ccclass('ScreenAdapter')
export class ScreenAdapter extends Component {
    /** Policy applied last; -1 until the first fit, so the first call always applies one. */
    private appliedPolicy = -1;

    // ---- Lifecycle ----

    protected onEnable(): void {
        view.on(ViewEvents.CANVAS_RESIZE, this.fitDesignToScreen, this);
        this.fitDesignToScreen();
    }

    protected onDisable(): void {
        // CLEANUP: pairs with view.on in onEnable; same event, handler and target.
        view.off(ViewEvents.CANVAS_RESIZE, this.fitDesignToScreen, this);
    }

    // ---- Private ----

    private fitDesignToScreen(): void {
        // NOTE: both getters allocate a Size; this only runs on enable and on resize, never per frame.
        const visibleSize = view.getVisibleSize();
        const designSize = view.getDesignResolutionSize();
        if (visibleSize.height <= 0 || designSize.height <= 0) {
            return;
        }
        const screenAspect = visibleSize.width / visibleSize.height;
        const designAspect = designSize.width / designSize.height;
        const policy = screenAspect >= designAspect ? ResolutionPolicy.FIXED_HEIGHT : ResolutionPolicy.FIXED_WIDTH;
        // NOTE: setResolutionPolicy re-applies the design size; skip it when nothing changed so a resize
        // does not trigger needless work (it does not emit canvas-resize, so there is no feedback loop).
        if (policy === this.appliedPolicy) {
            return;
        }
        this.appliedPolicy = policy;
        view.setResolutionPolicy(policy);
    }
}
