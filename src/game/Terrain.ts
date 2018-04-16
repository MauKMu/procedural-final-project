import TerrainPlane from '../geometry/TerrainPlane';
import {mod} from '../Utils';
import {vec2, vec3, mat4} from 'gl-matrix';

class Terrain {
    terrainPlanes: Array<TerrainPlane>;
    origin: vec3; // bottom-left corner
    tileDim: number; // dimension (height and width) of each tile (for planes)
    tileNum: number; // how many tiles exist on each axis (for planes)
    planeDim: number; // total dimension of each plane (height and width)
    planeNumX: number;
    planeNumZ: number;
    totalDimX: number;
    totalDimZ: number;

    constructor(origin: vec3, tileDim: number, tileNum: number, planeNumX: number, planeNumZ: number) {
        this.origin = vec3.clone(origin);
        this.tileDim = tileDim;
        this.tileNum = tileNum;
        this.planeDim = tileDim * tileNum;
        this.planeNumX = planeNumX;
        this.planeNumZ = planeNumZ;
        this.totalDimX = this.planeDim * planeNumX;
        this.totalDimZ = this.planeDim * planeNumZ;

        this.terrainPlanes = [];
        let planeOrigin = vec3.create();
        let planeOffset = vec3.create();
        for (let x = 0; x < planeNumX; x++) {
            for (let z = 0; z < planeNumZ; z++) {
                vec3.set(planeOffset, x, 0, z);
                vec3.scaleAndAdd(planeOrigin, this.origin, planeOffset, tileDim * tileNum);
                let tp = new TerrainPlane(planeOrigin, tileDim, tileNum);
                tp.create();
                // planes inactive at first; made active when updated
                tp.isActive = false;
                this.terrainPlanes.push(tp);
            }
        }
    }

    // makes planes active or not depending on player's position
    updatePlanes(playerPos: vec3) {
        // position after "looping" around terrain
        let posLooped = vec2.fromValues(mod(playerPos[0], this.totalDimX), mod(playerPos[2], this.totalDimZ));
        vec3.set(playerPos, posLooped[0], playerPos[1], posLooped[1]);
        // XZ "indices" of plane where player is
        let posPlane = vec2.fromValues(Math.floor(posLooped[0] / this.planeDim), Math.floor(posLooped[1] / this.planeDim));
        // set all to inactive
        for (let i = 0; i < this.terrainPlanes.length; i++) {
            this.terrainPlanes[i].isActive = false;
        }
        // make 3x3 grid around player active, deactivate other planes
        for (let x = -1; x <= 1; x++) {
            let xIdx = posPlane[0] + x;
            // index may not be valid for array, so correct if needed
            let xUnderflow = xIdx < 0;
            let xOverflow = xIdx >= this.planeNumX;
            if (xUnderflow) {
                xIdx += this.planeNumX;
            }
            else if (xOverflow) {
                xIdx -= this.planeNumX;
            }
            for (let z = -1; z <= 1; z++) {
                let zIdx = posPlane[1] + z;
                // index may not be valid for array, so correct if needed
                let zUnderflow = zIdx < 0;
                let zOverflow = zIdx >= this.planeNumZ;
                if (zUnderflow) {
                    zIdx += this.planeNumZ;
                }
                else if (zOverflow) {
                    zIdx -= this.planeNumZ;
                }

                // now have good indices
                this.terrainPlanes[xIdx * this.planeNumZ + zIdx].isActive = true;
                let xTranslate =
                    xUnderflow ? -this.totalDimX :
                    xOverflow ? this.totalDimX : 0;
                let zTranslate =
                    zUnderflow ? -this.totalDimZ :
                    zOverflow ? this.totalDimZ : 0;
                mat4.fromTranslation(this.terrainPlanes[xIdx * this.planeNumZ + zIdx].modelMatrix, vec3.fromValues(xTranslate, 0, zTranslate));
            }
        }
        let posInPlane = vec2.fromValues(mod(playerPos[0], this.tileDim), mod(playerPos[2], this.tileDim));
    }

};

export default Terrain;
