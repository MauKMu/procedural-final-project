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
let polySphere60: any = null;
let scarf: any = null;

const TWIG_SCALE = 0.1;
const FINGER_SCALE = 0.05;
const NOSE_SCALE = 0.075;

const SNOW_COLOR = normalizeRGB(200, 200, 255);
const WOOD_COLOR = normalizeRGB(60, 17, 0);
const NOSE_COLOR = normalizeRGB(455, 83, 30);
const SCARF_COLOR = normalizeRGB(20, 300, 300);
const HAUNTED_COLOR = normalizeRGB(17, 17, 17);

export enum SnowmanType {
    NORMAL = 1,
    BIG,
    HAUNTED,
}

class Snowman extends LSystem {

    seed: number;
    rotation: mat3;
    type: SnowmanType;

    constructor(decoration: Decoration, seed: number, type: SnowmanType) {
        super();
        if (polySphere60 == null) {
            let objString = readTextFileSync("res/models/polySphere60.obj");
            polySphere60 = new Loader.Mesh(objString);
        }
        if (scarf == null) {
            let objString = readTextFileSync("res/models/scarf.obj");
            scarf = new Loader.Mesh(objString);
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
        lRandom.setSeed(oldSeed);
        // compute matrix
        let rotMat4 = mat4.create();
        mat4.fromYRotation(rotMat4, xzAngle);
        this.rotation = mat3.create();
        mat3.fromMat4(this.rotation, rotMat4);

        this.type = type;
    }

    resetTurtleStack(pos: vec3) {
        let t = new Turtle();
        vec3.copy(t.position, pos);
        if (this.type == SnowmanType.BIG) {
            t.scaleBottom = 15;
            t.scaleTop = 15;
         }
        else {
            t.scaleBottom = 1.5;
            t.scaleTop = 1.5;
        }
        this.turtleStack = [t];
    }

    // TODO
    initAlphabet() {
        this.alphabet = [];
        // do this to avoid "this" issues
        let snowmanRotation = this.rotation;
        let woodColor = (this.type == SnowmanType.HAUNTED) ? HAUNTED_COLOR : WOOD_COLOR;
        let scarfColor = (this.type == SnowmanType.HAUNTED) ? HAUNTED_COLOR : SCARF_COLOR;
        let noseColor = (this.type == SnowmanType.HAUNTED) ? HAUNTED_COLOR : NOSE_COLOR;
        let upFunction = function (lsys: LSystem) {
            lsys.useColor(SNOW_COLOR);
            let turtle = lsys.getTopTurtle();
            // rotate mesh
            // just want a random direction, so this is enough
            // OK to overwrite orientation -- we generate a new one later
            vec3.set(turtle.orientation, 
                lRandom.getNext() * 2.0 - 1.0,
                lRandom.getNext() * 2.0 - 1.0,
                lRandom.getNext() * 2.0 - 1.0
            );
            vec3.normalize(turtle.orientation, turtle.orientation);
            // add mesh
            lsys.addMeshAtTurtle(turtle, vec3.fromValues(turtle.scaleBottom, turtle.scaleBottom, turtle.scaleBottom), polySphere60);
            // move turtle up, but not exactly up
            vec3.set(turtle.orientation, 
                lRandom.getNext() * 2.0 - 1.0,
                5.0, // big Y component to make direction close to up
                lRandom.getNext() * 2.0 - 1.0
            );
            vec3.normalize(turtle.orientation, turtle.orientation);
            turtle.moveForward(turtle.scaleBottom * 1.2);
            // shrink next mesh
            turtle.scaleBottom *= 0.7 + lRandom.getNext() * 0.15;
        };
        // up
        let U = new LSymbol("U", upFunction);
        this.alphabet.push(U);
        // terminal up
        let terminalU = new LSymbol("u", upFunction);
        this.alphabet.push(terminalU);
        // arm setup -- set turtle orientation to something useful for arms
        let beginLeftArm = new LSymbol("(LA)", function (lsys: LSystem) {
            let turtle = lsys.getTopTurtle();
            vec3.set(turtle.orientation, 
                lRandom.getNext() * 0.4 + 0.6, // big positive X
                lRandom.getNext() * 0.8 - 0.2, // medium Y
                lRandom.getNext() * 0.2 - 0.1  // small Z
            );
            // account for snowman's rotation
            vec3.transformMat3(turtle.orientation, turtle.orientation, snowmanRotation);
            vec3.normalize(turtle.orientation, turtle.orientation);
            // move turtle so we're closer to the outside of the snowball
            turtle.moveForward(turtle.scaleBottom * 0.8);
        });
        this.alphabet.push(beginLeftArm);

        let beginRightArm = new LSymbol("(RA)", function (lsys: LSystem) {
            let turtle = lsys.getTopTurtle();
            vec3.set(turtle.orientation, 
                -(lRandom.getNext() * 0.4 + 0.6), // big negative X
                lRandom.getNext() * 0.8 - 0.2, // medium Y
                lRandom.getNext() * 0.2 - 0.1  // small Z
            );
            // account for snowman's rotation
            vec3.transformMat3(turtle.orientation, turtle.orientation, snowmanRotation);
            vec3.normalize(turtle.orientation, turtle.orientation);
            // move turtle so we're closer to the outside of the snowball
            turtle.moveForward(turtle.scaleBottom * 0.8);
        });
        this.alphabet.push(beginRightArm);
        // actual arm -- "twig"
        let T = new LSymbol("T", function (lsys: LSystem) {
            lsys.useColor(woodColor);
            let turtle = lsys.getTopTurtle();
            // add twig
            let bot = turtle.scaleBottom;
            // overwrite scaleBottom and scaleTop to make twig thin
            turtle.scaleBottom = TWIG_SCALE * bot;
            turtle.scaleTop = TWIG_SCALE * bot;
            lsys.addScaledPrismAtTurtleNoShrink(turtle, bot * 0.1);
            // move forward
            turtle.moveForward(bot * 1.05);
            // add mesh to connect with next part
            turtle.scaleBottom *= 1.1;
            lsys.addMeshAtTurtle(turtle, vec3.fromValues(turtle.scaleBottom, turtle.scaleBottom, turtle.scaleBottom), polySphere60);
            // restore scaleBottom
            turtle.scaleBottom = bot * 0.85;
            // tweak direction upwards, with a bit of Z randomness
            let tweak = vec3.fromValues(
                0,
                lRandom.getNext() * 0.3 + 0.4,
                lRandom.getNext() * 0.8 - 0.4
            );
            // account for snowman's rotation
            vec3.transformMat3(tweak, tweak, snowmanRotation);
            vec3.add(turtle.orientation, turtle.orientation, tweak);
            vec3.normalize(turtle.orientation, turtle.orientation);
        });
        this.alphabet.push(T);
        // hand
        let H = new LSymbol("H", function (lsys: LSystem) {
            lsys.useColor(woodColor);
            let turtle = lsys.getTopTurtle();
            // add twig
            let bot = turtle.scaleBottom;
            // add 3 fingers. for each finger, pick a direction and draw prism
            // overwrite scaleBottom and scaleTop to make twig thin
            turtle.scaleBottom = TWIG_SCALE * bot * 0.5;
            turtle.scaleTop = turtle.scaleBottom * 0.3;
            // middle finger -- pick direction
            let originalDir = vec3.clone(turtle.orientation);
            let tweak = vec3.fromValues(
                0,
                lRandom.getNext() * 0.9 - 0.45,
                0
            );
            let tweakRotated = vec3.create();
            vec3.transformMat3(tweakRotated, tweak, snowmanRotation);
            vec3.add(turtle.orientation, originalDir, tweakRotated);
            vec3.normalize(turtle.orientation, turtle.orientation);
            lsys.addScaledPrismAtTurtleNoShrink(turtle, bot * 0.05);
            // left finger -- pick direction
            tweak[2] = lRandom.getNext() * 1.5; // add strong Z component
            if (tweak[2] < 0.75) {
                tweak[2] *= 2.0;
            }
            vec3.transformMat3(tweakRotated, tweak, snowmanRotation);
            vec3.add(turtle.orientation, originalDir, tweakRotated);
            vec3.normalize(turtle.orientation, turtle.orientation);
            lsys.addScaledPrismAtTurtleNoShrink(turtle, bot * 0.05);
            // right finger -- pick direction
            tweak[2] *= -1.0; // go opposite direction of left finger
            vec3.transformMat3(tweakRotated, tweak, snowmanRotation);
            vec3.add(turtle.orientation, originalDir, tweakRotated);
            vec3.normalize(turtle.orientation, turtle.orientation);
            lsys.addScaledPrismAtTurtleNoShrink(turtle, bot * 0.05);
        });
        this.alphabet.push(H);
        // nose
        let N = new LSymbol("N", function (lsys: LSystem) {
            lsys.useColor(noseColor);
            let turtle = lsys.getTopTurtle();
            // find face's direction
            let faceDirection = vec3.fromValues(0, 0, 1);
            vec3.transformMat3(faceDirection, faceDirection, snowmanRotation);
            vec3.normalize(faceDirection, faceDirection);
            // add nose ("cone")
            vec3.copy(turtle.orientation, faceDirection);
            let bot = turtle.scaleBottom;
            turtle.scaleBottom = NOSE_SCALE * bot * 2.0;
            turtle.scaleTop = turtle.scaleBottom * 0.2;
            lsys.addScaledPrismAtTurtleNoShrink(turtle, bot * 0.2);
            turtle.scaleBottom = bot;
        });
        this.alphabet.push(H);
        // scarf
        let S = new LSymbol("S", function (lsys: LSystem) {
            lsys.useColor(scarfColor);
            let turtle = lsys.getTopTurtle();
            // temporarily move down a little
            let oldY = turtle.position[1];
            turtle.position[1] -= turtle.scaleBottom * 0.5;
            lsys.addMeshAtTurtleRotation(turtle, vec3.fromValues(turtle.scaleBottom, turtle.scaleBottom, turtle.scaleBottom), mat3ToMat4(snowmanRotation), scarf);
            turtle.position[1] = oldY;
        });
        this.alphabet.push(S);
        // push
        let push = new LSymbol("[", function (lsys: LSystem) {
            let turtle = lsys.getTopTurtle();
            let copy = turtle.makeDeepCopy();
            copy.depth++;
            lsys.turtleStack.push(copy);
        });
        this.alphabet.push(push);
        // pop
        let pop = new LSymbol("]", function (lsys: LSystem) {
            lsys.turtleStack.pop();
        });
        this.alphabet.push(pop);

        // nop
        let nop = new LSymbol("0", function (lsys: LSystem) {
        });
        this.alphabet.push(nop);

        // set expansion rules
        U.setExpansionRules([
            new ExpansionRule(4, [U]),
            new ExpansionRule(1, [U, terminalU]),
            new ExpansionRule(2, [terminalU]),
            new ExpansionRule(2, [terminalU, terminalU])
        ]);

        // make scarf rare on non-special snowmen
        if (this.type == SnowmanType.NORMAL) {
            S.setExpansionRules([
                new ExpansionRule(1, [S]),
                new ExpansionRule(2, [nop]),
            ]);
        }
        else if (this.type == SnowmanType.HAUNTED) {
            S.setExpansionRules([
                new ExpansionRule(2, [S]),
                new ExpansionRule(1, [nop]),
            ]);
        }

        this.setAxiom([
            U,
            push, beginLeftArm, T, T, H, pop, push, beginRightArm, T, T, H, pop,
            terminalU,
            S, N,
            terminalU,
        ]);
    }

    executeString() {
        lRandom.setMode(LRANDOM_DETERMINISTIC);
        let seed = lRandom.state;
        lRandom.setSeed(this.seed);
        super.executeString();
        lRandom.setSeed(seed);
    }

};

export default Snowman;
