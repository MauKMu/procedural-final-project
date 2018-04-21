import Camera from '../Camera';
import Collider from './Collider';
import {clamp, maxVec2, absVec2} from '../Utils';
import {vec2, vec3, mat4} from 'gl-matrix';

const ZERO_VEC2 = vec2.fromValues(0, 0);

class SquareCollider extends Collider {
    dims: vec2;

    constructor(position: vec2, radius: number) {
        super(position, radius);
        this.dims = vec2.fromValues(radius, radius);
    }

    // if collision happens, returns position where no collision happens
    // else, return null
    collide(otherPos: vec2, otherRadius: number): vec2 {
        // from IQ: http://iquilezles.org/www/articles/distfunctions/distfunctions.htm
        // center around square
        let centeredOther = vec2.create();
        vec2.subtract(centeredOther, otherPos, this.position);
        let absCenteredOther = absVec2(centeredOther);
        let diff = vec2.create();
        vec2.subtract(diff, absCenteredOther, this.dims);
        let dist = vec2.length(maxVec2(diff, ZERO_VEC2));
        if (dist >= otherRadius) {
            return null;
        }
        else {
            let outsidePos = vec2.clone(otherPos);
            if (diff[0] > diff[1]) {
                let adjustment = otherRadius - diff[0];
                if (otherPos[0] > this.position[0]) {
                    outsidePos[0] += adjustment;
                }
                else {
                    outsidePos[0] -= adjustment;
                }
            }
            else {
                let adjustment = otherRadius - diff[1];
                if (otherPos[1] > this.position[1]) {
                    outsidePos[1] += adjustment;
                }
                else {
                    outsidePos[1] -= adjustment;
                }
            }
            return outsidePos;
        }
    }

};

export default SquareCollider;
