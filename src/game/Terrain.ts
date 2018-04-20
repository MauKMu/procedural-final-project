import Drawable from '../rendering/gl/Drawable';
import TerrainPlane from '../geometry/TerrainPlane';
import Decoration from '../geometry/Decoration';
import {clamp, mod, modfVec2, baryInterp} from '../Utils';
import {vec2, vec3, mat4} from 'gl-matrix';

class Terrain {
    drawables: Array<Drawable>;
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
        this.drawables = [];
        let planeOrigin = vec3.create();
        let planeOffset = vec3.create();
        for (let x = 0; x < planeNumX; x++) {
            for (let z = 0; z < planeNumZ; z++) {
                vec3.set(planeOffset, x, 0, z);
                vec3.scaleAndAdd(planeOrigin, this.origin, planeOffset, tileDim * tileNum);
                // constructor will generate height fields
                let tp = new TerrainPlane(planeOrigin, tileDim, tileNum);
                //tp.create();
                // planes inactive at first; made active when updated
                tp.isActive = false;
                this.terrainPlanes.push(tp);
            }
        }
        // "stitch" height fields at borders together
        // X border: 0, planeNumX - 1
        for (let z = 0; z < this.planeNumZ; z++) {
            let tpA = this.terrainPlanes[this.getAbsIdx(0, z)];
            let tpB = this.terrainPlanes[this.getAbsIdx(this.planeNumX - 1, z)];
            // just copy one subset of height field to the other
            for (let j = 0; j < this.tileNum + 1; j++) {
                tpB.heightField[this.tileNum][j] = tpA.heightField[0][j];
            }
        }
        // Z border: 0, planeNumZ - 1
        for (let x = 0; x < this.planeNumX; x++) {
            let tpA = this.terrainPlanes[this.getAbsIdx(x, 0)];
            let tpB = this.terrainPlanes[this.getAbsIdx(x, this.planeNumZ - 1)];
            // just copy one subset of height field to the other
            // could try something else, like averaging, but this seems to work
            for (let j = 0; j < this.tileNum + 1; j++) {
                tpB.heightField[j][this.tileNum] = tpA.heightField[j][0];
            }
        }

        // actually create planes' VBOs, now that stitching is done
        // also copy over to drawables
        for (let i = 0; i < this.terrainPlanes.length; i++) {
            this.terrainPlanes[i].create();
            this.drawables.push(this.terrainPlanes[i]);
        }

        // add some decorations
        let decorations = new Decoration();
        let decorationMat = mat4.create();

        // add decorations on each terrain plane
        for (let x = 0; x < this.planeNumX; x++) {
            let xClone = this.totalDimX * ((x == 0) ? 1 : (x == this.planeNumX - 1) ? -1 : 0);
            for (let z = 0; z < this.planeNumZ; z++) {
                let zClone = this.totalDimZ * ((z == 0) ? 1 : (z == this.planeNumZ - 1) ? -1 : 0);
                vec3.set(planeOffset, x, 0, z);
                vec3.scaleAndAdd(planeOrigin, this.origin, planeOffset, tileDim * tileNum);
                planeOrigin[1] += 3 + Math.random() * 2;
                mat4.fromTranslation(decorationMat, planeOrigin);
                decorations.addNormalCorrectPrism(decorationMat, 5, 1, 1, 1);
                // add clones to maintain continuity when looping
                if (xClone != 0) {
                    let cloneOrigin = vec3.clone(planeOrigin);
                    cloneOrigin[0] += xClone;
                    mat4.fromTranslation(decorationMat, cloneOrigin);
                    decorations.addNormalCorrectPrism(decorationMat, 5, 1, 1, 1);
                }
                if (zClone != 0) {
                    let cloneOrigin = vec3.clone(planeOrigin);
                    cloneOrigin[2] += zClone;
                    mat4.fromTranslation(decorationMat, cloneOrigin);
                    decorations.addNormalCorrectPrism(decorationMat, 5, 1, 1, 1);
                }
                if (xClone != 0 && zClone != 0) {
                    let cloneOrigin = vec3.clone(planeOrigin);
                    cloneOrigin[0] += xClone;
                    cloneOrigin[2] += zClone;
                    mat4.fromTranslation(decorationMat, cloneOrigin);
                    decorations.addNormalCorrectPrism(decorationMat, 5, 1, 1, 1);
                }
            }
        }

        decorations.create();
        this.drawables.push(decorations);
    }

    getAbsIdx(x: number, z: number): number {
        return x * this.planeNumZ + z;
    }

    getLoopedPosition(pos: vec3) {
        return vec2.fromValues(mod(pos[0], this.totalDimX), mod(pos[2], this.totalDimZ));
    }

    // takes in Player's "target" position (where they would move
    // if terrain was flat) and returns target position shifted to
    // height coherent with terrain
    collide(target: vec3): vec3 {
        // position after "looping" around terrain
        let posLooped = this.getLoopedPosition(target);
        // XZ "indices" of plane where player is
        let posPlaneIdx = vec2.create();
        let posInPlane = modfVec2(posLooped, this.planeDim, posPlaneIdx);
        //let posPlaneIdx = vec2.fromValues(Math.floor(posLooped[0] / this.planeDim), Math.floor(posLooped[1] / this.planeDim));
        //incorrect? let posInPlane = vec2.fromValues(Math.floor(posLooped[0] - posPlaneIdx[0] * this.planeDim), Math.floor(posLooped[0] - posPlaneIdx[0] * this.planeDim)); 
        // XZ "indices" of tile within plane
        let posTileIdx = vec2.create();
        let posInTile = modfVec2(posInPlane, this.tileDim, posTileIdx);
        //let posTileIdx = vec2.fromValues(posInPlane[0] / this.tileDim, posInPlane[1] / this.tileDim);
        //let posTile = vec2.fromValues(mod(posLooped[0], this.tileDim), mod(posLooped[1], this.tileDim));
        // get plane
        let tp = this.terrainPlanes[this.getAbsIdx(posPlaneIdx[0], posPlaneIdx[1])];
        // do barycentric interpolation to find height
        let a = vec2.fromValues(0, 0);
        let b: vec2;
        let c = vec2.fromValues(this.tileDim, this.tileDim);
        let heights: vec3;
        // which triangle are we in? 012 or 023? (see TerrainPlane)
        if (posInTile[0] > posInTile[1]) {
            // triangle is 012
            b = vec2.fromValues(this.tileDim, 0);
            heights = vec3.fromValues(
                tp.heightField[posTileIdx[0]][posTileIdx[1]],
                tp.heightField[posTileIdx[0] + 1][posTileIdx[1]],
                tp.heightField[posTileIdx[0] + 1][posTileIdx[1] + 1]
            );
        }
        else {
            // triangle is 023
            b = vec2.fromValues(0, this.tileDim);
            heights = vec3.fromValues(
                tp.heightField[posTileIdx[0]][posTileIdx[1]],
                tp.heightField[posTileIdx[0]][posTileIdx[1] + 1],
                tp.heightField[posTileIdx[0] + 1][posTileIdx[1] + 1]
            );
        }
        let weights = baryInterp(a, b, c, posInTile);
        let height = vec3.dot(weights, heights);
        return vec3.fromValues(target[0], this.origin[1] + height, target[2]);
    }

    // makes planes active or not depending on player's position
    updatePlanes(playerPos: vec3) {
        // position after "looping" around terrain
        // already looped in collide()
        //let posLooped = vec2.fromValues(mod(playerPos[0], this.totalDimX), mod(playerPos[2], this.totalDimZ));
        //vec3.set(playerPos, posLooped[0], playerPos[1], posLooped[1]);
        let posLooped = vec2.fromValues(playerPos[0], playerPos[2]);
        // XZ "indices" of plane where player is
        let posPlane = vec2.fromValues(Math.floor(posLooped[0] / this.planeDim), Math.floor(posLooped[1] / this.planeDim));
        // set all to inactive
        // TODO: could optimize to only update ones that need to be updated
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
                this.terrainPlanes[this.getAbsIdx(xIdx, zIdx)].isActive = true;
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
