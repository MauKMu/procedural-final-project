import Drawable from '../rendering/gl/Drawable';
import TerrainPlane from '../geometry/TerrainPlane';
import Decoration from '../geometry/Decoration';
import BasicTree from './BasicTree';
import Snowman from './Snowman';
import Collider from './Collider';
import SquareCollider from './SquareCollider';
import {clamp, mod, modfVec2, baryInterp, normalizeRGB, perlinGain} from '../Utils';
import {vec2, vec3, mat4} from 'gl-matrix';

const TERRAIN_COLOR = normalizeRGB(201, 142, 14);
const TREE_COLORS = [
    normalizeRGB(4, 221, 15),
    normalizeRGB(4, 221, 15),
    normalizeRGB(4, 201, 15),
    normalizeRGB(4, 201, 15),
    normalizeRGB(155, 149, 0),
    normalizeRGB(155, 149, 0),
    normalizeRGB(0, 155, 90),
];
const PYRAMID_COLOR = normalizeRGB(255, 140, 0);

const SNOW_COLOR = normalizeRGB(200, 200, 255);

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

        this.buildLevel2();
    }

    buildLevel2() {
        let planeOrigin = vec3.create();
        let planeOffset = vec3.create();
        for (let x = 0; x < this.planeNumX; x++) {
            for (let z = 0; z < this.planeNumZ; z++) {
                vec3.set(planeOffset, x, 0, z);
                vec3.scaleAndAdd(planeOrigin, this.origin, planeOffset, this.planeDim);
                // constructor will generate height fields
                let heightModifier = function (height: number): number {
                    return perlinGain(clamp(height + 0.2, 0.0, 1.0), 0.12) * 5.0;
                }
                let tp = new TerrainPlane(planeOrigin, this.tileDim, this.tileNum, 0.1, heightModifier);
                tp.setColor(SNOW_COLOR);
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
            // average heights
            for (let j = 0; j < this.tileNum + 1; j++) {
                let avgHeight = (tpB.heightField[this.tileNum][j] + tpA.heightField[0][j]) * 0.5;
                tpB.heightField[this.tileNum][j] = avgHeight;
                tpA.heightField[0][j] = avgHeight;
            }
        }
        // Z border: 0, planeNumZ - 1
        for (let x = 0; x < this.planeNumX; x++) {
            let tpA = this.terrainPlanes[this.getAbsIdx(x, 0)];
            let tpB = this.terrainPlanes[this.getAbsIdx(x, this.planeNumZ - 1)];
            // average heights
            for (let j = 0; j < this.tileNum + 1; j++) {
                let avgHeight = (tpB.heightField[j][this.tileNum] + tpA.heightField[j][0]) * 0.5;
                tpB.heightField[j][this.tileNum] = avgHeight;
                tpA.heightField[j][0] = avgHeight;
            }
        }

        // actually create planes' VBOs, now that stitching is done
        // also copy over to drawables
        for (let i = 0; i < this.terrainPlanes.length; i++) {
            this.terrainPlanes[i].create();
            this.drawables.push(this.terrainPlanes[i]);
        }

        function addTrees(xClone: number, zClone: number, tp: TerrainPlane) {
            let numClusters = Math.floor(Math.random() * 3.0 + 1.01);
            for (let cluster = 0; cluster < numClusters; cluster++) {
                vec3.scaleAndAdd(planeOrigin, this.origin, planeOffset, this.planeDim);
                let baseInPlane = vec3.fromValues((Math.random() * 0.65 + 0.15) * this.planeDim, 0, (Math.random() * 0.65 + 0.15) * this.planeDim);
                planeOrigin[0] += baseInPlane[0];
                planeOrigin[2] += baseInPlane[2];
                let treesInCluster = Math.floor(Math.random() * 4.0 + 1.01);
                let treeOrigin = vec3.create();
                let angle = Math.random() * Math.PI;
                let angleIncrement = 2.0 * Math.PI / treesInCluster;
                let posInPlane = vec3.create();
                for (let i = 0; i < treesInCluster; i++) {
                    decorations.useColor(SNOW_COLOR);
                    angle += angleIncrement;
                    vec3.set(treeOrigin, Math.cos(angle), 0, Math.sin(angle));
                    vec3.scaleAndAdd(posInPlane, baseInPlane, treeOrigin, 1.6 * this.tileDim);
                    vec3.scaleAndAdd(treeOrigin, planeOrigin, treeOrigin, 1.6 * this.tileDim);
                    // find tile information
                    let posTileIdx = vec2.create();
                    let posInTile = modfVec2(vec2.fromValues(posInPlane[0], posInPlane[2]), this.tileDim, posTileIdx);
                    // find and use height
                    let height = this.getHeight(posInTile, posTileIdx, tp);
                    treeOrigin[1] = this.origin[1] + height - 1.0;
                    //let tree = new BasicTree(decorations);
                    let tree = new Snowman(decorations, Math.floor(Math.random() * 2048));
                    tree.initAlphabet();
                    tree.resetTurtleStack(treeOrigin);
                    tree.expandString();
                    tree.expandString();
                    tree.executeString();

                    // add collider
                    let collider = new Collider(vec2.fromValues(treeOrigin[0], treeOrigin[2]), 1.0);
                    let xMin = Math.max(0, posTileIdx[0] - 1);
                    let xMax = Math.min(this.tileNum - 1, posTileIdx[0] + 1);
                    let zMin = Math.max(0, posTileIdx[1] - 1);
                    let zMax = Math.min(this.tileNum - 1, posTileIdx[1] + 1);
                    for (let tileX = xMin; tileX <= xMax; tileX++) {
                        for (let tileZ = zMin; tileZ <= zMax; tileZ++) {
                            // TODO: would be nice to check more precisely if
                            // collider should go in this tile... but this
                            // should help filter it a bit anyway
                            tp.colliders[tileX][tileZ].push(collider);
                        }
                    }
                    //this.colliders.push(new Collider(vec2.fromValues(treeOrigin[0], treeOrigin[2]), 1.0));

                    // add clones to maintain continuity when looping
                    if (xClone != 0) {
                        let cloneOrigin = vec3.clone(treeOrigin);
                        cloneOrigin[0] += xClone;
                        tree.resetTurtleStack(cloneOrigin);
                        tree.executeString();
                    }
                    if (zClone != 0) {
                        let cloneOrigin = vec3.clone(treeOrigin);
                        cloneOrigin[2] += zClone;
                        tree.resetTurtleStack(cloneOrigin);
                        tree.executeString();
                    }
                    if (xClone != 0 && zClone != 0) {
                        let cloneOrigin = vec3.clone(treeOrigin);
                        cloneOrigin[0] += xClone;
                        cloneOrigin[2] += zClone;
                        tree.resetTurtleStack(cloneOrigin);
                        tree.executeString();
                    }
                }
            }
        }

        // add some decorations
        let decorations = new Decoration();
        let decorationMat = mat4.create();

        // pick a plane in which to place the pyramid
        let pyramidX = 2;
        let pyramidZ = Math.floor(Math.random() * this.planeNumZ * 0.999);
        console.log(["pyramid: ", pyramidX, pyramidZ]);

        // add decorations on each terrain plane
        for (let x = 0; x < this.planeNumX; x++) {
            let xClone = this.totalDimX * ((x == 0) ? 1 : (x == this.planeNumX - 1) ? -1 : 0);
            for (let z = 0; z < this.planeNumZ; z++) {
                let zClone = this.totalDimZ * ((z == 0) ? 1 : (z == this.planeNumZ - 1) ? -1 : 0);
                // find terrain plane so we can add colliders
                let tp = this.terrainPlanes[this.getAbsIdx(x, z)];
                // compute position of decoration
                vec3.set(planeOffset, x, 0, z);
                addTrees.call(this, xClone, zClone, tp);
            }
        }


        decorations.create();
        this.drawables.push(decorations);
    }

    buildLevel() {
        let planeOrigin = vec3.create();
        let planeOffset = vec3.create();
        for (let x = 0; x < this.planeNumX; x++) {
            for (let z = 0; z < this.planeNumZ; z++) {
                vec3.set(planeOffset, x, 0, z);
                vec3.scaleAndAdd(planeOrigin, this.origin, planeOffset, this.planeDim);
                // constructor will generate height fields
                let heightModifier = function (height: number): number {
                    return height * 5.0;
                }
                let tp = new TerrainPlane(planeOrigin, this.tileDim, this.tileNum, 1.0, heightModifier);
                tp.setColor(TERRAIN_COLOR);
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

        function addTrees(xClone: number, zClone: number, tp: TerrainPlane) {
            let numClusters = Math.floor(Math.random() * 3.0 + 1.01);
            for (let cluster = 0; cluster < numClusters; cluster++) {
                vec3.scaleAndAdd(planeOrigin, this.origin, planeOffset, this.planeDim);
                let baseInPlane = vec3.fromValues((Math.random() * 0.65 + 0.15) * this.planeDim, 0, (Math.random() * 0.65 + 0.15) * this.planeDim);
                planeOrigin[0] += baseInPlane[0];
                planeOrigin[2] += baseInPlane[2];
                let treesInCluster = Math.floor(Math.random() * 4.0 + 1.01);
                let treeOrigin = vec3.create();
                let angle = Math.random() * Math.PI;
                let angleIncrement = 2.0 * Math.PI / treesInCluster;
                let posInPlane = vec3.create();
                for (let i = 0; i < treesInCluster; i++) {
                    decorations.useColor(TREE_COLORS[Math.floor(Math.random() * TREE_COLORS.length * 0.999)]);
                    angle += angleIncrement;
                    vec3.set(treeOrigin, Math.cos(angle), 0, Math.sin(angle));
                    vec3.scaleAndAdd(posInPlane, baseInPlane, treeOrigin, 1.6 * this.tileDim);
                    vec3.scaleAndAdd(treeOrigin, planeOrigin, treeOrigin, 1.6 * this.tileDim);
                    let tree = new BasicTree(decorations);
                    tree.initAlphabet();
                    tree.resetTurtleStack(treeOrigin);
                    tree.expandString();
                    tree.expandString();
                    tree.executeString();

                    // add collider
                    let collider = new Collider(vec2.fromValues(treeOrigin[0], treeOrigin[2]), 1.0);
                    let posTileIdx = vec2.fromValues(Math.floor(posInPlane[0] / this.tileDim), Math.floor(posInPlane[2] / this.tileDim));
                    let xMin = Math.max(0, posTileIdx[0] - 1);
                    let xMax = Math.min(this.tileNum - 1, posTileIdx[0] + 1);
                    let zMin = Math.max(0, posTileIdx[1] - 1);
                    let zMax = Math.min(this.tileNum - 1, posTileIdx[1] + 1);
                    for (let tileX = xMin; tileX <= xMax; tileX++) {
                        for (let tileZ = zMin; tileZ <= zMax; tileZ++) {
                            // TODO: would be nice to check more precisely if
                            // collider should go in this tile... but this
                            // should help filter it a bit anyway
                            tp.colliders[tileX][tileZ].push(collider);
                        }
                    }
                    //this.colliders.push(new Collider(vec2.fromValues(treeOrigin[0], treeOrigin[2]), 1.0));

                    // add clones to maintain continuity when looping
                    if (xClone != 0) {
                        let cloneOrigin = vec3.clone(treeOrigin);
                        cloneOrigin[0] += xClone;
                        tree.resetTurtleStack(cloneOrigin);
                        tree.executeString();
                    }
                    if (zClone != 0) {
                        let cloneOrigin = vec3.clone(treeOrigin);
                        cloneOrigin[2] += zClone;
                        tree.resetTurtleStack(cloneOrigin);
                        tree.executeString();
                    }
                    if (xClone != 0 && zClone != 0) {
                        let cloneOrigin = vec3.clone(treeOrigin);
                        cloneOrigin[0] += xClone;
                        cloneOrigin[2] += zClone;
                        tree.resetTurtleStack(cloneOrigin);
                        tree.executeString();
                    }
                }
            }
        }

        // TODO
        function addPyramid(xClone: number, zClone: number, tp: TerrainPlane) {
            decorations.useColor(PYRAMID_COLOR);
            // add just pyramid
            vec3.scaleAndAdd(planeOrigin, this.origin, planeOffset, this.planeDim);
            let baseInPlane = vec3.fromValues((Math.random() * 0.15 + 0.45) * this.planeDim, 0, (Math.random() * 0.15 + 0.45) * this.planeDim);
            planeOrigin[0] += baseInPlane[0];
            planeOrigin[2] += baseInPlane[2];
            let pyramidMat = mat4.create();
            mat4.fromTranslation(pyramidMat, planeOrigin);

            decorations.addPyramid(pyramidMat, 20, 30);
            // TODO: add pyramid collider
            tp.bigColliders.push(new SquareCollider(vec2.fromValues(planeOrigin[0], planeOrigin[2]), 20));
            // add clones to maintain continuity when looping
            if (xClone != 0) {
                let cloneOrigin = vec3.clone(planeOrigin);
                cloneOrigin[0] += xClone;
                mat4.fromTranslation(pyramidMat, cloneOrigin);
                decorations.addPyramid(pyramidMat, 20, 30);
            }
            if (zClone != 0) {
                let cloneOrigin = vec3.clone(planeOrigin);
                cloneOrigin[2] += zClone;
                mat4.fromTranslation(pyramidMat, cloneOrigin);
                decorations.addPyramid(pyramidMat, 20, 30);
            }
            if (xClone != 0 && zClone != 0) {
                let cloneOrigin = vec3.clone(planeOrigin);
                cloneOrigin[0] += xClone;
                cloneOrigin[2] += zClone;
                mat4.fromTranslation(pyramidMat, cloneOrigin);
                decorations.addPyramid(pyramidMat, 20, 30);
            }
            /*
            let numClusters = Math.floor(Math.random() * 2.0 + 1.01);
            for (let cluster = 0; cluster < numClusters; cluster++) {
                let treesInCluster = Math.floor(Math.random() * 4.0 + 1.01);
                let treeOrigin = vec3.create();
                let angle = Math.random() * Math.PI;
                let angleIncrement = 2.0 * Math.PI / treesInCluster;
                let posInPlane = vec3.create();
                for (let i = 0; i < treesInCluster; i++) {
                    angle += angleIncrement;
                    vec3.set(treeOrigin, Math.cos(angle), 0, Math.sin(angle));
                    vec3.scaleAndAdd(posInPlane, baseInPlane, treeOrigin, 1.6 * this.tileDim);
                    vec3.scaleAndAdd(treeOrigin, planeOrigin, treeOrigin, 1.6 * this.tileDim);
                    let tree = new BasicTree(decorations);
                    tree.initAlphabet();
                    tree.resetTurtleStack(treeOrigin);
                    tree.expandString();
                    tree.expandString();
                    tree.executeString();

                    // add collider
                    let collider = new Collider(vec2.fromValues(treeOrigin[0], treeOrigin[2]), 1.0);
                    let posTileIdx = vec2.fromValues(Math.floor(posInPlane[0] / this.tileDim), Math.floor(posInPlane[2] / this.tileDim));
                    let xMin = Math.max(0, posTileIdx[0] - 1);
                    let xMax = Math.min(this.tileNum - 1, posTileIdx[0] + 1);
                    let zMin = Math.max(0, posTileIdx[1] - 1);
                    let zMax = Math.min(this.tileNum - 1, posTileIdx[1] + 1);
                    for (let tileX = xMin; tileX <= xMax; tileX++) {
                        for (let tileZ = zMin; tileZ <= zMax; tileZ++) {
                            // TODO: would be nice to check more precisely if
                            // collider should go in this tile... but this
                            // should help filter it a bit anyway
                            tp.colliders[tileX][tileZ].push(collider);
                        }
                    }
                    //this.colliders.push(new Collider(vec2.fromValues(treeOrigin[0], treeOrigin[2]), 1.0));

                    // add clones to maintain continuity when looping
                    if (xClone != 0) {
                        let cloneOrigin = vec3.clone(treeOrigin);
                        cloneOrigin[0] += xClone;
                        tree.resetTurtleStack(cloneOrigin);
                        tree.executeString();
                    }
                    if (zClone != 0) {
                        let cloneOrigin = vec3.clone(treeOrigin);
                        cloneOrigin[2] += zClone;
                        tree.resetTurtleStack(cloneOrigin);
                        tree.executeString();
                    }
                    if (xClone != 0 && zClone != 0) {
                        let cloneOrigin = vec3.clone(treeOrigin);
                        cloneOrigin[0] += xClone;
                        cloneOrigin[2] += zClone;
                        tree.resetTurtleStack(cloneOrigin);
                        tree.executeString();
                    }
                }
            }
            */
        }

        // add some decorations
        let decorations = new Decoration();
        let decorationMat = mat4.create();

        // pick a plane in which to place the pyramid
        let pyramidX = 2;
        let pyramidZ = Math.floor(Math.random() * this.planeNumZ * 0.999);
        console.log(["pyramid: ", pyramidX, pyramidZ]);

        // add decorations on each terrain plane
        for (let x = 0; x < this.planeNumX; x++) {
            let xClone = this.totalDimX * ((x == 0) ? 1 : (x == this.planeNumX - 1) ? -1 : 0);
            for (let z = 0; z < this.planeNumZ; z++) {
                let zClone = this.totalDimZ * ((z == 0) ? 1 : (z == this.planeNumZ - 1) ? -1 : 0);
                // find terrain plane so we can add colliders
                let tp = this.terrainPlanes[this.getAbsIdx(x, z)];
                // compute position of decoration
                vec3.set(planeOffset, x, 0, z);
                if (x == pyramidX && z == pyramidZ) {
                    addPyramid.call(this, xClone, zClone, tp);
                }
                else {
                    addTrees.call(this, xClone, zClone, tp);
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

    getLoopedPositionVec2(pos: vec2) {
        return vec2.fromValues(mod(pos[0], this.totalDimX), mod(pos[1], this.totalDimZ));
    }

    getHeight(posInTile: vec2, posTileIdx: vec2, tp: TerrainPlane): number {
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
        return vec3.dot(weights, heights);
    }

    // takes in Player's "target" position (where they would move
    // if terrain was flat) and returns target position shifted to
    // height coherent with terrain
    collide(target: vec3, startPos: vec3, targetSpeed: number): vec3 {
        // janky collision
        // doesn't work for things too close to edge of loop rectangle
        let posAfterCollision: vec2;
        let targetVec2 = vec2.fromValues(target[0], target[2]);
        // position after "looping" around terrain
        let posLooped = this.getLoopedPositionVec2(targetVec2);
        // XZ "indices" of plane where player is
        let posPlaneIdx = vec2.create();
        let posInPlane = modfVec2(posLooped, this.planeDim, posPlaneIdx);
        // XZ "indices" of tile within plane
        let posTileIdx = vec2.create();
        let posInTile = modfVec2(posInPlane, this.tileDim, posTileIdx);
        // get plane
        let tp = this.terrainPlanes[this.getAbsIdx(posPlaneIdx[0], posPlaneIdx[1])];
        let collided = false;
        let colliders = tp.colliders[posTileIdx[0]][posTileIdx[1]];
        for (let i = 0; i < colliders.length; i++) {
            let collision = colliders[i].collide(targetVec2, 0.5);
            if (collision == null) {
                continue;
            }
            //console.log("coll");
            collided = true;
            posAfterCollision = collision;
            //posLooped = this.getLoopedPosition(startPos);
        }
        colliders = tp.bigColliders;
        for (let i = 0; i < colliders.length; i++) {
            let collision = colliders[i].collide(targetVec2, 0.5);
            if (collision == null) {
                continue;
            }
            //console.log("coll");
            collided = true;
            posAfterCollision = collision;
            //posLooped = this.getLoopedPosition(startPos);
        }
        if (!collided) {
            posAfterCollision = targetVec2;
        }
        else {
            // update with collided position
            // position after "looping" around terrain
            posLooped = this.getLoopedPositionVec2(posAfterCollision);
            // XZ "indices" of plane where player is
            posInPlane = modfVec2(posLooped, this.planeDim, posPlaneIdx);
            // XZ "indices" of tile within plane
            posInTile = modfVec2(posInPlane, this.tileDim, posTileIdx);
            // get plane
            tp = this.terrainPlanes[this.getAbsIdx(posPlaneIdx[0], posPlaneIdx[1])];
        }
        //console.log(posPlaneIdx);
        let height = this.getHeight(posInTile, posTileIdx, tp);
        let newTarget = vec3.fromValues(posAfterCollision[0], this.origin[1] + height, posAfterCollision[1]);
        // find direction towards terrain-aware target, adjust its length
        // NOTE: this may not work if tiles are too small relative to step size
        let movDir = vec3.create();
        let startPosLoopedVec2 = this.getLoopedPosition(startPos);
        let startPosLooped = vec3.fromValues(startPosLoopedVec2[0], startPos[1], startPosLoopedVec2[1]);
        vec3.subtract(movDir, newTarget, startPos);
        // skip speed adjustment if unnecessary
        if (collided && vec3.length(movDir) <= targetSpeed) {
            return newTarget;
        }
        vec3.normalize(movDir, movDir);
        vec3.scaleAndAdd(newTarget, startPos, movDir, targetSpeed);
        return newTarget;
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
