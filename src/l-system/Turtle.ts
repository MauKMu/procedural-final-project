import {vec3, mat3, mat4, quat} from 'gl-matrix';

// what's up?
const UP = vec3.fromValues(0, 1, 0);

class Turtle {
    position: vec3;
    orientation: vec3;
    depth: number;
    scaleBottom: number;
    scaleTop: number;

    constructor() {
        this.position = vec3.create();
        this.orientation = vec3.create();
        vec3.copy(this.orientation, UP);
        this.depth = 0;
        this.scaleBottom = 12;
        this.scaleTop = 12;
    }

    moveForward(distance: number) {
        vec3.scaleAndAdd(this.position, this.position, this.orientation, distance);
    }

    getTransformationToTurtle(): mat4 {
        let q = quat.create();
        quat.rotationTo(q, UP, this.orientation); 
        let m = mat4.create();
        mat4.fromRotationTranslation(m, q, this.position);
        return m;
    }

    makeDeepCopy(): Turtle {
        let copy = new Turtle();
        vec3.copy(copy.position, this.position);
        vec3.copy(copy.orientation, this.orientation);
        copy.depth = this.depth;
        copy.scaleBottom = this.scaleBottom;
        copy.scaleTop = this.scaleTop;
        return copy;
    }

    rotateX(rad: number) {
        let rotMat4 = mat4.create();
        mat4.fromXRotation(rotMat4, rad);
        let rotMat3 = mat3.create();
        mat3.fromMat4(rotMat3, rotMat4);
        vec3.transformMat3(this.orientation, this.orientation, rotMat3);
    }

    rotateY(rad: number) {
        let rotMat4 = mat4.create();
        mat4.fromYRotation(rotMat4, rad);
        let rotMat3 = mat3.create();
        mat3.fromMat4(rotMat3, rotMat4);
        vec3.transformMat3(this.orientation, this.orientation, rotMat3);
    }

    rotateZ(rad: number) {
        let rotMat4 = mat4.create();
        mat4.fromZRotation(rotMat4, rad);
        let rotMat3 = mat3.create();
        mat3.fromMat4(rotMat3, rotMat4);
        vec3.transformMat3(this.orientation, this.orientation, rotMat3);
    }

};

export default Turtle;
