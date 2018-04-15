import * as CameraControls from '3d-view-controls';
import {vec3, mat4} from 'gl-matrix';

class Camera {
    //controls: any;
    projectionMatrix: mat4 = mat4.create();
    viewMatrix: mat4 = mat4.create();
    fovy: number = 45 * 3.1415962 / 180.0;
    aspectRatio: number = 1;
    near: number = 0.1;
    far: number = 1000;
    position: vec3 = vec3.create();
    direction: vec3 = vec3.fromValues(0, 0, 1);
    target: vec3 = vec3.create();
    up: vec3 = vec3.fromValues(0, 1, 0);
    right: vec3 = vec3.fromValues(1, 0, 0);

    constructor(position: vec3, target: vec3) {
        //this.controls = CameraControls(document.getElementById('canvas'), {
        //eye: position,
        //center: target,
        //});
        //this.controls.mode = 'turntable';
        vec3.copy(this.position, position);
        vec3.subtract(this.direction, target, position);
        vec3.normalize(this.direction, this.direction);
        vec3.cross(this.right, this.direction, this.up);
        vec3.add(this.target, this.position, this.direction);
        mat4.lookAt(this.viewMatrix, this.position, this.target, this.up);
    }

    setAspectRatio(aspectRatio: number) {
        this.aspectRatio = aspectRatio;
    }

    updateProjectionMatrix() {
        mat4.perspective(this.projectionMatrix, this.fovy, this.aspectRatio, this.near, this.far);
    }

    moveForward() {
        vec3.add(this.position, this.position, this.direction);
    }

    moveBackward() {
        vec3.scaleAndAdd(this.position, this.position, this.direction, -1);
    }

    moveRight() {
        vec3.add(this.position, this.position, this.right);
    }

    moveLeft() {
        vec3.scaleAndAdd(this.position, this.position, this.right, -1);
    }

    changeDirection() {
        console.log("UNIMPLEMENTED!");
        vec3.cross(this.right, this.direction, this.up);
    }

    update() {
        //this.controls.tick();

        vec3.add(this.target, this.position, this.direction);
        //mat4.lookAt(this.viewMatrix, this.controls.eye, this.controls.center, this.up);
        mat4.lookAt(this.viewMatrix, this.position, this.target, this.up);
    }
};

export default Camera;
