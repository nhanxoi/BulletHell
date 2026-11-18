/**
 * ArenaView.ts
 * Visual of the arena: sizes, places and tints the floor and the four walls from GameConfig.ARENA,
 * so changing the arena size in config needs no scene edit. Visual only: the real boundary is
 * ArenaBounds in the model.
 *
 * Attach to node World; each referenced node needs a UITransform and a Sprite (white square).
 */
import { _decorator, Color, Component, Node, Sprite, UITransform } from 'cc';
import { GameConfig } from '../config/GameConfig';
const { ccclass, property } = _decorator;

/** Lays out the floor and the four walls once, at load. */
@ccclass('ArenaView')
export class ArenaView extends Component {
    @property(Node)
    private floor: Node = null!;

    @property(Node)
    private wallTop: Node = null!;

    @property(Node)
    private wallBottom: Node = null!;

    @property(Node)
    private wallLeft: Node = null!;

    @property(Node)
    private wallRight: Node = null!;

    // ---- Lifecycle ----

    protected onLoad(): void {
        if (!this.floor || !this.wallTop || !this.wallBottom || !this.wallLeft || !this.wallRight) {
            console.error(`[ArenaView] floor or a wall node is not assigned on node "${this.node.name}"`);
            this.enabled = false;
            return;
        }
        this.layoutArena();
    }

    // ---- Private ----

    private layoutArena(): void {
        const { WIDTH, HEIGHT, WALL_THICKNESS } = GameConfig.ARENA;
        const floorColor = new Color(GameConfig.COLORS.FLOOR);
        const wallColor = new Color(GameConfig.COLORS.WALL);
        // Walls sit just outside the inner rect; top and bottom are longer to cover the corners.
        const outerWidth = WIDTH + 2 * WALL_THICKNESS;
        const wallOffsetX = WIDTH / 2 + WALL_THICKNESS / 2;
        const wallOffsetY = HEIGHT / 2 + WALL_THICKNESS / 2;

        this.layoutBlock(this.floor, WIDTH, HEIGHT, 0, 0, floorColor);
        this.layoutBlock(this.wallTop, outerWidth, WALL_THICKNESS, 0, wallOffsetY, wallColor);
        this.layoutBlock(this.wallBottom, outerWidth, WALL_THICKNESS, 0, -wallOffsetY, wallColor);
        this.layoutBlock(this.wallLeft, WALL_THICKNESS, HEIGHT, -wallOffsetX, 0, wallColor);
        this.layoutBlock(this.wallRight, WALL_THICKNESS, HEIGHT, wallOffsetX, 0, wallColor);
    }

    /** Sizes, places and tints one rectangle node. */
    private layoutBlock(block: Node, width: number, height: number, x: number, y: number, color: Color): void {
        const transform = block.getComponent(UITransform);
        const sprite = block.getComponent(Sprite);
        if (!transform || !sprite) {
            console.error(`[ArenaView] node "${block.name}" needs a UITransform and a Sprite`);
            return;
        }
        // NOTE: CUSTOM so the sprite keeps the size set here instead of the texture size.
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        transform.setContentSize(width, height);
        block.setPosition(x, y, 0);
        sprite.color = color;
    }
}
