/**
 * BurstPool.ts
 * Fixed pool of "burst" nodes: a circle that grows and fades out at a point. It owns the nodes and
 * their animation; ImpactEffects decides when and where to play them. Not a component: the owner
 * calls tick(dt) from its lateUpdate and destroyAll() from its onDestroy.
 *
 * Every node is instantiated in the constructor and only reused after that, never created or
 * destroyed during play. Animation is time-based (no tween), so nothing has to be stopped when a
 * burst ends.
 */
import { Color, instantiate, isValid, Node, Prefab, Sprite, UITransform } from 'cc';

/** One reusable burst node and its animation state. */
interface BurstSlot {
    readonly node: Node;
    readonly transform: UITransform;
    readonly sprite: Sprite;
    /** Owned by the slot; play() copies the requested colour into it, tick() changes its alpha. */
    readonly color: Color;
    startAlpha: number;
    startSize: number;
    endSize: number;
    duration: number;
    /** Seconds since the burst started. */
    age: number;
    isActive: boolean;
}

/** Preallocated burst nodes under one parent; when all are busy the one closest to its end is reused. */
export class BurstPool {
    private readonly slots: BurstSlot[] = [];
    /** Bursts running now, so tick() exits at once when there is nothing to animate. */
    private activeCount = 0;

    /**
     * @param prefab Root must have a Sprite (white circle), which also brings a UITransform. A prefab
     *               without them logs one error and leaves the pool empty, so play() does nothing.
     * @param parent Node the bursts are added to; positions passed to play() are in its local space.
     * @param size   How many burst nodes to create.
     */
    constructor(prefab: Prefab, parent: Node, size: number) {
        for (let i = 0; i < size; i++) {
            // NOTE: every slot comes from the same prefab, so one failure means all would fail.
            if (!this.createSlot(prefab, parent)) {
                return;
            }
        }
    }

    /**
     * Starts one burst at (x, y): it grows from startSize to endSize px while its alpha fades from
     * color.a to 0 over `duration` seconds. When all are busy, reuses the one with the least time left.
     */
    play(x: number, y: number, color: Color, startSize: number, endSize: number, duration: number): void {
        if (duration <= 0 || this.slots.length === 0) {
            return;
        }
        const slot = this.pickSlot();
        if (!slot.isActive) {
            slot.isActive = true;
            slot.node.active = true;
            this.activeCount++;
        }
        slot.color.set(color);
        slot.startAlpha = color.a;
        slot.startSize = startSize;
        slot.endSize = endSize;
        slot.duration = duration;
        slot.age = 0;
        slot.node.setPosition(x, y, 0);
        this.applyFrame(slot, 0);
    }

    /** Advances every running burst by dt seconds and hides the finished ones. */
    tick(dt: number): void {
        if (this.activeCount === 0) {
            return;
        }
        // PERF: index loop, no iterator object per frame.
        for (let i = 0; i < this.slots.length; i++) {
            const slot = this.slots[i];
            if (!slot.isActive) {
                continue;
            }
            slot.age += dt;
            if (slot.age >= slot.duration) {
                this.release(slot);
            } else {
                this.applyFrame(slot, slot.age / slot.duration);
            }
        }
    }

    /** Hides every running burst (new round, owner disabled). */
    stopAll(): void {
        for (const slot of this.slots) {
            if (slot.isActive) {
                this.release(slot);
            }
        }
    }

    /**
     * Destroys the pooled nodes. CLEANUP: pairs with instantiate in createSlot(). When the parent was
     * destroyed first the nodes are already gone (isValid is false), so each one is checked.
     */
    destroyAll(): void {
        for (const slot of this.slots) {
            if (isValid(slot.node, true)) {
                slot.node.destroy();
            }
        }
        this.slots.length = 0;
        this.activeCount = 0;
    }

    // ---- Private ----

    /** @returns false when the prefab root lacks a Sprite or UITransform (nothing was added). */
    private createSlot(prefab: Prefab, parent: Node): boolean {
        const node = instantiate(prefab);
        const sprite = node.getComponent(Sprite);
        const transform = node.getComponent(UITransform);
        if (!sprite || !transform) {
            console.error(`[BurstPool] prefab "${prefab.name}" needs a Sprite and a UITransform on its root`);
            node.destroy();
            return false;
        }
        // NOTE: CUSTOM so the sprite follows the size set every frame instead of the texture size.
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        node.active = false;
        parent.addChild(node);
        this.slots.push({
            node, transform, sprite, color: new Color(),
            startAlpha: 0, startSize: 0, endSize: 0, duration: 0, age: 0, isActive: false,
        });
        return true;
    }

    /**
     * A free slot if there is one, otherwise the running burst with the least time left
     * (duration - age). NOTE: not simply the oldest: bursts have different durations, so the oldest
     * one (a long explosion) may still have more left to show than a short spark started later.
     */
    private pickSlot(): BurstSlot {
        let closestToEnd = this.slots[0];
        for (let i = 0; i < this.slots.length; i++) {
            const slot = this.slots[i];
            if (!slot.isActive) {
                return slot;
            }
            if (slot.duration - slot.age < closestToEnd.duration - closestToEnd.age) {
                closestToEnd = slot;
            }
        }
        return closestToEnd;
    }

    /** Writes size and alpha for progress t in [0, 1). */
    private applyFrame(slot: BurstSlot, t: number): void {
        // Ease-out growth (fast start, soft end) reads as an impact; alpha fades linearly.
        const eased = 1 - (1 - t) * (1 - t);
        const size = slot.startSize + (slot.endSize - slot.startSize) * eased;
        slot.transform.setContentSize(size, size);
        slot.color.a = Math.round(slot.startAlpha * (1 - t));
        slot.sprite.color = slot.color;
    }

    private release(slot: BurstSlot): void {
        slot.isActive = false;
        slot.node.active = false;
        this.activeCount--;
    }
}
