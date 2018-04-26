import {vec3, vec4, mat3, mat4, quat} from 'gl-matrix';
import Turtle from '../l-system/Turtle';
import {LSymbol, ExpansionRule} from '../l-system/LSymbol';
import LSystem from '../l-system/LSystem';
import Decoration from '../geometry/Decoration';
import {PRISM_HEIGHT} from '../geometry/Decoration';
import LString from '../l-system/LString';
import {lRandom, LRANDOM_DETERMINISTIC} from '../l-system/LRandom';
import {readTextFileSync} from '../globals';
import {normalizeRGB, mat3ToMat4} from '../Utils';
import * as Loader from 'webgl-obj-loader';

// ""static"" variables (I love JS. It's so bad.)
let ghostBody: any = null;
let roundEyes: any = null;
let angryEyes: any = null;
let scarf: any = null;

const TWIG_SCALE = 0.1;
const FINGER_SCALE = 0.05;
const NOSE_SCALE = 0.075;

const EYE_COLOR = normalizeRGB(200, 200, 255);
const BODY_COLOR = normalizeRGB(17, 17, 17);
const NOSE_COLOR = normalizeRGB(455, 83, 30);
const NICE_COLOR = normalizeRGB(20, 140, 225);
const SCARF_COLOR = normalizeRGB(200, 200, 25);

export enum GhostType {
    EVIL = 1,
    NICE, // is it really a dichotomy, tho. hm. :thinking:
}

class Ghost extends LSystem {

    seed: number;
    rotation: mat3;
    playerOffset: vec3;
    bobValue: number;
    bobFrequency: number;
    type: GhostType;

    constructor(decoration: Decoration, seed: number, type: GhostType) {
        super();
        this.type = type;
        if (ghostBody == null) {
            let objString = readTextFileSync("res/models/ghostBody.obj");
            ghostBody = new Loader.Mesh(objString);
        }
        if (roundEyes == null) {
            let objString = readTextFileSync("res/models/roundEyes.obj");
            roundEyes = new Loader.Mesh(objString);
        }
        if (scarf == null) {
            let objString = readTextFileSync("res/models/scarf.obj");
            scarf = new Loader.Mesh(objString);
        }
        if (angryEyes == null) {
            let objString = readTextFileSync("res/models/angryEyes.obj");
            angryEyes = new Loader.Mesh(objString);
        }
        this.decoration = decoration;
        this.prismSides = 5;
        this.seed = seed;
        // compute this snowman's rotation about Y
        // get deterministic direction
        lRandom.setMode(LRANDOM_DETERMINISTIC);
        let oldSeed = lRandom.state;
        lRandom.setSeed(this.seed);
        let xzAngle = lRandom.getNext() * Math.PI * 2.0;
        this.bobValue = lRandom.getNext() * Math.PI;
        this.bobFrequency = 3.0 + 5.0 * lRandom.getNext();
        lRandom.setSeed(oldSeed);
        // compute matrix
        //let rotMat4 = mat4.create();
        //mat4.fromYRotation(rotMat4, xzAngle);
        this.rotation = mat3.create();
        //mat3.fromMat4(this.rotation, rotMat4);

        this.playerOffset = vec3.create();
    }

    resetTurtleStack(pos: vec3) {
        let t = new Turtle();
        vec3.copy(t.position, pos);
        t.scaleBottom = 1.5;
        t.scaleTop = 1.5;
        this.turtleStack = [t];
    }

    // TODO
    initAlphabet() {
        this.alphabet = [];
        // do this to avoid "this" issues
        let snowmanRotation = this.rotation;
        let bodyColor = (this.type == GhostType.EVIL) ? BODY_COLOR : NICE_COLOR;
        let eyeColor = (this.type == GhostType.EVIL) ? EYE_COLOR : BODY_COLOR;
        // body
        let B = new LSymbol("B", function (lsys: LSystem) {
            lsys.useColor(bodyColor);
            let turtle = lsys.getTopTurtle();
            lsys.addMeshAtTurtleRotation(turtle, vec3.fromValues(turtle.scaleBottom, turtle.scaleBottom, turtle.scaleBottom), mat3ToMat4(snowmanRotation), ghostBody);
        });
        this.alphabet.push(B);
        // eyes
        let neutral = new LSymbol("(00)", function (lsys: LSystem) {
            lsys.useColor(eyeColor);
            let turtle = lsys.getTopTurtle();
            lsys.addMeshAtTurtleRotation(turtle, vec3.fromValues(turtle.scaleBottom, turtle.scaleBottom, turtle.scaleBottom), mat3ToMat4(snowmanRotation), roundEyes);
        });
        this.alphabet.push(neutral);
        let angry = new LSymbol("(\\/)", function (lsys: LSystem) {
            lsys.useColor(eyeColor);
            let turtle = lsys.getTopTurtle();
            lsys.addMeshAtTurtleRotation(turtle, vec3.fromValues(turtle.scaleBottom, turtle.scaleBottom, turtle.scaleBottom), mat3ToMat4(snowmanRotation), angryEyes);
        });
        this.alphabet.push(angry);
        // scarf
        let S = new LSymbol("S", function (lsys: LSystem) {
            lsys.useColor(SCARF_COLOR);
            let turtle = lsys.getTopTurtle();
            turtle.position[1] += 2.0;
            lsys.addMeshAtTurtleRotation(turtle, vec3.fromValues(turtle.scaleBottom, turtle.scaleBottom, turtle.scaleBottom), mat3ToMat4(snowmanRotation), scarf);
            turtle.position[1] -= 2.0;
        });
        this.alphabet.push(B);

        // set expansion rules
        if (this.type == GhostType.EVIL) {
            this.setAxiom([
                B, neutral
            ]);
        }
        else {
            this.setAxiom([
                B, neutral, S
            ]);
        }

    }

    executeString() {
        lRandom.setMode(LRANDOM_DETERMINISTIC);
        let seed = lRandom.state;
        lRandom.setSeed(this.seed);
        super.executeString();
        lRandom.setSeed(seed);
    }

    setModelMatrix(model: mat4) {
        mat4.copy(this.decoration.modelMatrix, model);
    }

};

export default Ghost;
