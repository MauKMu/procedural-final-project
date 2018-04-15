import Camera from '../Camera';
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

class Player {
    camera: Camera;
    movementFlags: MovementFlags;
    position: vec3;
    forward: vec3;
    right: vec3;

    constructor(camera: Camera, position: vec3, forward: vec3) {
        this.camera = camera;
        this.movementFlags = MovementFlags.NONE;
        this.position = vec3.clone(position);
        this.forward = vec3.clone(forward);
        vec3.normalize(this.forward, this.forward);
        this.right = vec3.create();
        vec3.cross(this.right, this.forward, UP);
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

    move(deltaTime: number) {
        if (this.movementFlags == MovementFlags.NONE || this.movementFlags == MovementFlags.ALL) {
            return;
        }

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
        this.move(deltaTime);
        // TODO: update camera position, target, direction
        vec3.copy(this.camera.position, this.position);
        vec3.copy(this.camera.direction, this.forward);
        this.camera.update();
        //this.controls.tick();

        //vec3.add(this.target, this.position, this.direction);
        //mat4.lookAt(this.viewMatrix, this.controls.eye, this.controls.center, this.up);
        //mat4.lookAt(this.viewMatrix, this.position, this.target, this.up);
    }
};

export default Player;
