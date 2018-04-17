import Camera from '../Camera';
import {clamp} from '../Utils';
import {vec3, mat4} from 'gl-matrix';

enum MovementFlags {
    NONE = 0,
    FORWARD = 1 << 0,
    BACKWARD = 1 << 1,
    RIGHT = 1 << 2,
    LEFT = 1 << 3,
    UP = 1 << 4,
    DOWN = 1 << 5,
    ALL = (1 << 6) - 1,
}

const UP = vec3.fromValues(0, 1, 0);
const EYE_OFFSET = vec3.fromValues(0, 2, 0);
const TWO_PI = 2.0 * Math.PI;
const MOUSE_SCALE = 0.001;
const Y_LIMIT = 0.95;

class Player {
    camera: Camera;
    movementFlags: MovementFlags;
    position: vec3;
    eye: vec3;
    forward: vec3;
    right: vec3;
    xzAngle: number;
    flatForward: vec3; // forward projected on XZ plane

    constructor(camera: Camera, position: vec3, forward: vec3) {
        this.camera = camera;
        this.movementFlags = MovementFlags.NONE;
        this.position = vec3.clone(position);
        this.eye = vec3.create();
        this.forward = vec3.clone(forward);
        this.right = vec3.create();
        this.flatForward = vec3.fromValues(0, 0, 0);
        // compute right
        //vec3.normalize(this.forward, this.forward);
        //vec3.cross(this.right, this.forward, UP);
        // compute spherical angle
        this.xzAngle = Math.atan2(forward[2], forward[0]);
        // copied from mouse handler
        if (this.xzAngle > TWO_PI) {
            this.xzAngle -= TWO_PI;
        }
        else if (this.xzAngle < 0) {
            this.xzAngle += TWO_PI;
        }
        this.flatForward[0] = Math.cos(this.xzAngle);
        this.flatForward[2] = Math.sin(this.xzAngle);
        // call mouse event handler to avoid "jerk" when first activating mouse
        let mouseEvent = new MouseEvent("Fake event");
        this.handleMouseMovement(mouseEvent);
    }

    handleKeyDownEvent(event: KeyboardEvent) {
        if (event.defaultPrevented) {
            return; // Do nothing if event was already processed
        }

        switch (event.key) {
            case "w":
            case "W":
                this.movementFlags |= MovementFlags.FORWARD;
                break;
            case "s":
            case "S":
                this.movementFlags |= MovementFlags.BACKWARD;
                break;
            case "d":
            case "D":
                this.movementFlags |= MovementFlags.RIGHT;
                break;
            case "a":
            case "A":
                this.movementFlags |= MovementFlags.LEFT;
                break;
            case "e":
            case "E":
                this.movementFlags |= MovementFlags.UP;
                break;
            case "q":
            case "Q":
                this.movementFlags |= MovementFlags.DOWN;
                break;
            default:
                return;
        }
    }

    handleKeyUpEvent(event: KeyboardEvent) {
        if (event.defaultPrevented) {
            return; // Do nothing if event was already processed
        }

        switch (event.key) {
            case "w":
            case "W":
                this.movementFlags &= ~MovementFlags.FORWARD;
                break;
            case "s":
            case "S":
                this.movementFlags &= ~MovementFlags.BACKWARD;
                break;
            case "d":
            case "D":
                this.movementFlags &= ~MovementFlags.RIGHT;
                break;
            case "a":
            case "A":
                this.movementFlags &= ~MovementFlags.LEFT;
                break;
            case "e":
            case "E":
                this.movementFlags &= ~MovementFlags.UP;
                break;
            case "q":
            case "Q":
                this.movementFlags &= ~MovementFlags.DOWN;
                break;
            default:
                return;
        }
    }

    handleLostFocus() {
        this.movementFlags = MovementFlags.NONE;
    }

    handleMouseMovement(event: MouseEvent) {
        if (event.movementX != 0) {
            // normalize based on window dimensions?
            this.xzAngle += event.movementX * MOUSE_SCALE;
            if (this.xzAngle > TWO_PI) {
                this.xzAngle -= TWO_PI;
            }
            else if (this.xzAngle < 0) {
                this.xzAngle += TWO_PI;
            }
            this.flatForward[0] = Math.cos(this.xzAngle);
            this.flatForward[2] = Math.sin(this.xzAngle);
        }
        if (event.movementY != 0) {
            // need to negate movementY
            let newY = this.forward[1] - event.movementY * MOUSE_SCALE;
            this.forward[1] = clamp(newY, -Y_LIMIT, Y_LIMIT);
        }
        // compute length of xz component
        let xzLength = 1.0 - this.forward[1] * this.forward[1];
        // faster than pow(x, 0.25)?
        let xzScale = Math.sqrt(Math.sqrt(xzLength));
        this.forward[0] = this.flatForward[0] * xzScale;
        this.forward[2] = this.flatForward[2] * xzScale;
        // forward should be roughly normalized; compute right
        vec3.cross(this.right, this.forward, UP);
        vec3.normalize(this.right, this.right);
        // but not really normalized -- ok for now?
        // ok because we store projected forward separately anyway,
        // camera direction just used to compute lookAt target
    }

    move(deltaTime: number) {
        if (this.movementFlags == MovementFlags.NONE || this.movementFlags == MovementFlags.ALL) {
            return;
        }
        // TODO: use xz direction only;
        // can store in handlemouseevent

        // compute move direction -- guaranteed not to be <0, 0, 0>, since
        // this only happens on MovementFlags.NONE or MovementFlags.ALL
        let movDir = vec3.fromValues(0, 0, 0);
        if (this.movementFlags & MovementFlags.FORWARD) {
            vec3.add(movDir, movDir, this.forward);
        }
        if (this.movementFlags & MovementFlags.BACKWARD) {
            vec3.scaleAndAdd(movDir, movDir, this.forward, -1);
        }
        if (this.movementFlags & MovementFlags.RIGHT) {
            vec3.add(movDir, movDir, this.right);
        }
        if (this.movementFlags & MovementFlags.LEFT) {
            vec3.scaleAndAdd(movDir, movDir, this.right, -1);
        }
        if (this.movementFlags & MovementFlags.UP) {
            vec3.add(movDir, movDir, UP);
        }
        if (this.movementFlags & MovementFlags.DOWN) {
            vec3.scaleAndAdd(movDir, movDir, UP, -1);
        }

        vec3.normalize(movDir, movDir);
        vec3.scaleAndAdd(this.position, this.position, movDir, deltaTime * 10.0);

        // TODO: collision
    }

    update(deltaTime: number) {
        //this.move(deltaTime);
        // TODO: update camera position, target, direction
        vec3.add(this.eye, this.position, EYE_OFFSET);
        vec3.copy(this.camera.position, this.eye);
        vec3.copy(this.camera.direction, this.forward);
        this.camera.update();
        //this.controls.tick();

        //vec3.add(this.target, this.position, this.direction);
        //mat4.lookAt(this.viewMatrix, this.controls.eye, this.controls.center, this.up);
        //mat4.lookAt(this.viewMatrix, this.position, this.target, this.up);
    }
};

export default Player;
