/**
 * BulletLayerView.ts
 * Draws every bullet of one side (player or boss). Bullets live in a BulletStore as plain numbers;
 * this view keeps a list of bullet nodes ("slots") and, every frame, shows the first `count`
 * slots at the stored positions and hides the rest. The slots are the pool: nodes are created
 * once and only toggled, never destroyed during play.
 *
 * Attach to nodes PlayerBulletLayer (side Player) and BossBulletLayer (side Boss).
 * The bullet prefab root needs a UITransform and a Sprite (white circle), layer DEFAULT.
 */
import { _decorator, Color, Component, Enum, instantiate, isValid, Node, Prefab, Sprite, UITransform } from 'cc';
import { GameConfig } from '../config/GameConfig';
import { GameManager } from '../controller/GameManager';
import { BulletStore } from '../model/BulletStore';
import { Combatant } from '../model/Combatant';
const { ccclass, property } = _decorator;

/** Mirrors one BulletStore onto a fixed set of reusable bullet nodes. */
@ccclass('BulletLayerView')
export class BulletLayerView extends Component {
    @property(GameManager)
    private gameManager: GameManager = null!;

    @property(Prefab)
    private bulletPrefab: Prefab = null!;

    /** Which side's bullets this layer draws. */
    @property({ type: Enum(Combatant) })
    private side: Combatant = Combatant.Player;

    private readonly slots: Node[] = [];
    /** How many slots are active right now, so only the slots that change are toggled. */
    private shownCount = 0;
    private store: BulletStore | null = null;
    private readonly bulletColor = new Color();
    private bulletDiameter = 0;

    // ---- Lifecycle ----

    protected onLoad(): void {
        if (!this.gameManager || !this.bulletPrefab) {
            console.error(`[BulletLayerView] gameManager or bulletPrefab is not assigned on node "${this.node.name}"`);
            this.enabled = false;
            return;
        }
        if (!this.bulletPrefab.data.getComponent(Sprite)) {
            console.error(`[BulletLayerView] prefab "${this.bulletPrefab.name}" has no Sprite on its root`);
            this.enabled = false;
            return;
        }
        const isPlayer = this.side === Combatant.Player;
        const radius = isPlayer ? GameConfig.PLAYER.BULLET_RADIUS : GameConfig.BOSS.BULLET_RADIUS;
        const colorHex = isPlayer ? GameConfig.COLORS.PLAYER_BULLET : GameConfig.COLORS.BOSS_BULLET;
        const preloadCount = isPlayer ? GameConfig.BULLETS.PLAYER_PRELOAD : GameConfig.BULLETS.BOSS_PRELOAD;
        this.bulletDiameter = 2 * radius;
        Color.fromHEX(this.bulletColor, colorHex);
        // PERF: create the first slots at load so the first volleys do not instantiate mid-fight.
        for (let i = 0; i < preloadCount; i++) {
            this.createSlot();
        }
    }

    protected start(): void {
        // NOTE: start() runs after every onLoad, so GameManager has already created the world.
        const world = this.gameManager.world;
        if (!world) {
            console.error(`[BulletLayerView] no battle world on node "${this.node.name}"`);
            this.enabled = false;
            return;
        }
        // PERF: pick the store once instead of branching on the side every frame.
        this.store = this.side === Combatant.Player ? world.playerBullets : world.bossBullets;
    }

    protected lateUpdate(): void {
        const store = this.store;
        if (!store) {
            return;
        }
        const count = store.count;
        this.ensureSlots(count);
        const xs = store.x;
        const ys = store.y;
        for (let i = 0; i < count; i++) {
            this.slots[i].setPosition(xs[i], ys[i], 0);
        }
        this.updateVisibleCount(count);
    }

    protected onDestroy(): void {
        // CLEANUP: pairs with instantiate in createSlot(). When the whole layer is destroyed the
        // children are already gone (isValid is false); this covers removing only the component.
        for (const slot of this.slots) {
            if (isValid(slot, true)) {
                slot.destroy();
            }
        }
        this.slots.length = 0;
        this.store = null;
    }

    // ---- Private ----

    /** Grows the slot list when more bullets are alive than ever before (bounded by store capacity). */
    private ensureSlots(count: number): void {
        while (this.slots.length < count) {
            this.createSlot();
        }
    }

    /** Toggles only the slots between the old and the new visible count. */
    private updateVisibleCount(count: number): void {
        // PERF: changing node.active walks the node's components, so never set it when unchanged.
        for (let i = this.shownCount; i < count; i++) {
            this.slots[i].active = true;
        }
        for (let i = count; i < this.shownCount; i++) {
            this.slots[i].active = false;
        }
        this.shownCount = count;
    }

    private createSlot(): void {
        const slot = instantiate(this.bulletPrefab);
        // onLoad checked that the prefab root has a Sprite (which also requires a UITransform).
        const sprite = slot.getComponent(Sprite);
        if (sprite) {
            // NOTE: CUSTOM so the sprite keeps this size instead of the texture size.
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            sprite.color = this.bulletColor;
        }
        slot.getComponent(UITransform)?.setContentSize(this.bulletDiameter, this.bulletDiameter);
        slot.active = false;
        this.node.addChild(slot);
        this.slots.push(slot);
    }
}
