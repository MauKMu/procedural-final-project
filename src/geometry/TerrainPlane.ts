import {vec2, vec3, vec4} from 'gl-matrix';
import Drawable from '../rendering/gl/Drawable';
import {gl} from '../globals';
import {smoothNoise} from '../noise/Noise';

const NOISE_OFFSET = vec2.fromValues(3.141, -5.965);

class TerrainPlane extends Drawable {
    indices: Uint32Array;
    positions: Float32Array;
    normals: Float32Array;
    colors: Float32Array;
    uvs: Float32Array;
    origin: vec3; // bottom-left corner
    tileDim: number; // dimension (height and width) of each tile
    tileNum: number; // how many tiles exist on each axis
    heightScale: number = 5;

    constructor(origin: vec3, tileDim: number, tileNum: number) {
        super(); // Call the constructor of the super class. This is required.
        this.origin = vec3.clone(origin);
        //this.origin = vec4.fromValues(origin[0], origin[1], origin[2], 1);
        this.tileDim = tileDim;
        this.tileNum = tileNum;
    }

    create() {
        let posTemp: Array<number> = [];
        let norTemp: Array<number> = [];
        let uvsTemp: Array<number> = [];
        let idxTemp: Array<number> = [];
        let colTemp: Array<number> = [];

        let heightField: Array<Array<number>> = [];

        // populate height field (indices refer to each tile, starting from origin)
        let xzOrigin = vec2.fromValues(this.origin[0], this.origin[2]);
        vec2.add(xzOrigin, xzOrigin, NOISE_OFFSET);
        let xzOffset = vec2.create();
        let xzPoint = vec2.create();
        for (let i = 0; i < this.tileNum + 1; i++) {
            let heights: Array<number> = [];
            for (let j = 0; j < this.tileNum + 1; j++) {
                vec2.set(xzOffset, i, j);
                vec2.scaleAndAdd(xzPoint, xzOrigin, xzOffset, this.tileDim);
                heights.push(this.heightScale * smoothNoise(xzPoint));
            }
            heightField.push(heights);
        }

        // assumes heightField is initialized
        function addPos(i: number, j: number, xOffset: number, zOffset: number): vec3 {
            let pos = vec3.fromValues(
                xzPoint[0] + xOffset * this.tileDim,
                this.origin[1] + heightField[i + xOffset][j + zOffset],
                xzPoint[1] + zOffset * this.tileDim
            );
            posTemp.push(pos[0]);
            posTemp.push(pos[1]);
            posTemp.push(pos[2]);
            posTemp.push(1.0);
            return pos;
        }

        function addNor(nor: vec3) {
            norTemp.push(nor[0]);
            norTemp.push(nor[1]);
            norTemp.push(nor[2]);
            norTemp.push(0.0);
        }

        // populate posTemp, etc. based on noise
        vec2.set(xzOrigin, this.origin[0], this.origin[2]);
        let absIdx = 0; // absolute index: i * (tileNum) + j
        for (let i = 0; i < this.tileNum; i++) {
            for (let j = 0; j < this.tileNum; j++) {
                vec2.set(xzOffset, i, j);
                vec2.scaleAndAdd(xzPoint, xzOrigin, xzOffset, this.tileDim);
                // TODO: create pos, idx, etc.
                // looking from top:
                // 3--2
                // | /|
                // |/ |
                // 0--1
                // positions 0 and 2 are added twice, since  they
                // can have different normals
                // so positions look like [0, 1, 2, 0, 2, 3]
                // indices are [0, 1, 2, 3, 4, 5]
                // positions ==================================================
                // call() makes "this" visible in addPos (wow!)
                let pos0 = addPos.call(this, i, j, 0, 0);
                let pos1 = addPos.call(this, i, j, 1, 0);
                let pos2 = addPos.call(this, i, j, 1, 1);
                addPos.call(this, i, j, 0, 0); // add 0 again
                addPos.call(this, i, j, 1, 1); // add 2 again
                let pos3 = addPos.call(this, i, j, 0, 1);
                // normals ====================================================
                let sideA = vec3.create();
                let sideB = vec3.create();

                let nor012 = vec3.create();
                vec3.subtract(sideA, pos2, pos1);
                vec3.subtract(sideB, pos0, pos1);
                vec3.cross(nor012, sideA, sideB);
                vec3.normalize(nor012, nor012);

                let nor023 = vec3.create();
                vec3.subtract(sideA, pos2, pos0);
                vec3.subtract(sideB, pos3, pos0);
                vec3.cross(nor023, sideA, sideB);
                vec3.normalize(nor023, nor023);

                for (let k = 0; k < 3; k++) {
                    addNor(nor012);
                }
                for (let k = 0; k < 3; k++) {
                    addNor(nor023);
                }
                // indices ====================================================
                for (let k = 0; k < 6; k++) {
                    idxTemp.push(absIdx * 6 + k);
                    colTemp.push(1.0);
                    colTemp.push(1.0);
                    colTemp.push(1.0);
                    colTemp.push(1.0);
                    uvsTemp.push(0.0);
                    uvsTemp.push(0.0);
                }
                absIdx++;
            }
        }

        //posTemp = loadedMesh.vertices;
        //for (var i = 0; i < loadedMesh.vertices.length; i++) {
            //posTemp.push(loadedMesh.vertices[i]);
            //if (i % 3 == 2) posTemp.push(1.0);
        //}

        //for (var i = 0; i < loadedMesh.vertexNormals.length; i++) {
            //norTemp.push(loadedMesh.vertexNormals[i]);
            //if (i % 3 == 2) norTemp.push(0.0);
        //}

        //uvsTemp = loadedMesh.textures;
        //idxTemp = loadedMesh.indices;

        // white vert color for now
        //this.colors = new Float32Array(posTemp.length);
        //for (var i = 0; i < posTemp.length; ++i) {
            //this.colors[i] = 1.0;
        //}

        this.indices = new Uint32Array(idxTemp);
        this.normals = new Float32Array(norTemp);
        this.positions = new Float32Array(posTemp);
        this.uvs = new Float32Array(uvsTemp);
        this.colors = new Float32Array(colTemp);

        this.generateIdx();
        this.generatePos();
        this.generateNor();
        this.generateUV();
        this.generateCol();

        this.count = this.indices.length;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufIdx);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufNor);
        gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
        gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufCol);
        gl.bufferData(gl.ARRAY_BUFFER, this.colors, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufUV);
        gl.bufferData(gl.ARRAY_BUFFER, this.uvs, gl.STATIC_DRAW);

    }
};

export default TerrainPlane;
