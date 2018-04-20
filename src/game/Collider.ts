import Camera from '../Camera';
import {clamp} from '../Utils';
import {vec2, vec3, mat4} from 'gl-matrix';

class Collider {
    position: vec2;
    radius: number;

    constructor(position: vec2, radius: number) {
        this.position = vec2.clone(position);
        this.radius = radius;
    }

    // if collision happens, returns position where no collision happens
    // else, return null
    collide(otherPos: vec2, otherRadius: number): vec2 {
        let dist = vec2.distance(this.position, otherPos);
        if (dist >= this.radius + otherRadius) {
            return null;
        }
        else {
            let toOther = vec2.create();
            vec2.subtract(toOther, otherPos, this.position);
            vec2.normalize(toOther, toOther);
            vec2.scale(toOther, toOther, (this.radius + otherRadius));
            vec2.add(toOther, toOther, this.position);
            return toOther;
        }
    }

};

export default Collider;
