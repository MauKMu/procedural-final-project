import {vec3, vec4, mat4, quat} from 'gl-matrix';
import Turtle from './Turtle';
import {LSymbol, ExpansionRule} from './LSymbol';
import Plant from '../geometry/Plant';
import {BRANCH_COLOR} from '../geometry/Plant';
import LString from './LString';
import {lRandom} from './LRandom';

class LSystem {
    alphabet: Array<LSymbol>;
    turtleStack: Array<Turtle>;
    plant: Plant;
    axiom: Array<LSymbol>;
    lstring: LString;

    constructor() {
        //this.alphabet = [];
        this.initAlphabet();
        this.turtleStack = [new Turtle()];
        this.plant = new Plant(vec3.fromValues(0, 0, 0));
        this.axiom = [];
        this.lstring = new LString([]);
    }

    setAxiom(axiomArray: Array<LSymbol>) {
        this.axiom = axiomArray.slice();
        this.lstring.fromArray(axiomArray);
    }

    getTopTurtle(): Turtle {
        return this.turtleStack[this.turtleStack.length - 1];
    }

    useColor(color: vec4) {
        this.plant.useColor(color);
    }

    addPrismAtTurtle(turtle: Turtle) {
        if (!this.plant.isSafeToGrow()) {
            return;
        }
        let trans = turtle.getTransformationToTurtle();
        this.plant.addPrism(trans, 8, turtle.scaleBottom, turtle.scaleTop, 1);
        turtle.scaleBottom = turtle.scaleTop;
        turtle.scaleTop *= 0.99;
    }

    addTipPrismAtTurtle(turtle: Turtle) {
        if (!this.plant.isSafeToGrow()) {
            return;
        }
        let trans = turtle.getTransformationToTurtle();
        this.plant.addPrism(trans, 8, turtle.scaleBottom, turtle.scaleTop * 0.333, 1);
        turtle.scaleBottom = turtle.scaleTop;
        turtle.scaleTop *= 0.8;
    }

    addScaledPrismAtTurtle(turtle: Turtle, scaleHeight: number) {
        if (!this.plant.isSafeToGrow()) {
            return;
        }
        let trans = turtle.getTransformationToTurtle();
        this.plant.addPrism(trans, 8, turtle.scaleBottom, turtle.scaleTop, scaleHeight);
        turtle.scaleBottom = turtle.scaleTop;
        turtle.scaleTop *= 0.8;
    }

    // does not shrink thickness
    addScaledPrismAtTurtleNoShrink(turtle: Turtle, scaleHeight: number) {
        if (!this.plant.isSafeToGrow()) {
            return;
        }
        let trans = turtle.getTransformationToTurtle();
        this.plant.addPrism(trans, 8, turtle.scaleBottom, turtle.scaleTop, scaleHeight);
    }

    addPearAtTurtle(turtle: Turtle, pearMesh: any) {
        if (!this.plant.isSafeToGrow()) {
            return;
        }
        // refuse to draw overly tiny pears
        if (turtle.depth > 5) {
            return;
        }
        // extract only translation from turtle
        let turtlePos = turtle.position;
        let trans = mat4.create();
        mat4.fromTranslation(trans, turtlePos);
        let toOrigin = mat4.create();
        let m = mat4.create();
        let q = quat.create();
        quat.fromEuler(q, 0, lRandom.getNext() * 360, 0);
        //quat.fromEuler(q, 90, 0, 0); // angles in degrees, for some reason...
        //let PEAR_SCALE = 0.25 * turtle.scaleBottom;
        let PEAR_SCALE = 0.25 * turtle.scaleBottom;
        let BANANA_SCALE = 6.0 * turtle.scaleBottom;
        // move pear down so stalk is more visible
        //mat4.fromRotationTranslationScale(toOrigin, q, vec3.fromValues(0, 0, 0), vec3.fromValues(PEAR_SCALE, PEAR_SCALE, PEAR_SCALE));
        mat4.fromRotationTranslationScale(toOrigin, q, vec3.fromValues(0, -1, -1), vec3.fromValues(BANANA_SCALE, BANANA_SCALE, BANANA_SCALE));
        //mat4.fromTranslation(m, vec3.fromValues(0, 0, 15));
        mat4.fromTranslation(m, vec3.fromValues(0, -1, 0));
        mat4.multiply(toOrigin, toOrigin, m);
        mat4.multiply(trans, trans, toOrigin);
        this.plant.addDecoration(pearMesh, trans);
    }

    initAlphabet() {
        let A = new LSymbol("A", function (lsys: LSystem) { });
        let B = new LSymbol("B", function (lsys: LSystem) { });
        let C = new LSymbol("C", function (lsys: LSystem) { });
        this.alphabet = [];
        this.alphabet.push(A);
        this.alphabet.push(B);
        this.alphabet.push(C);
        A.setExpansionRules([new ExpansionRule(1, [B, B, A]), new ExpansionRule(1, [A])]);
        B.setExpansionRules([new ExpansionRule(1, [C, B])]);
    }

    // expand once
    expandString() {
        this.lstring.expand();
    }

    executeString() {
        this.lstring.execute(this);
    }

    // resets expansions and plant VBOs
    resetSystem() {
        this.lstring.fromArray(this.axiom);
        this.resetPlant();
    }

    resetPlant() {
        //this.plant.destroy();
        this.plant.clearBuffers();
        this.plant.wasSafe = true;
        this.plant.useColor(BRANCH_COLOR);
        this.turtleStack = [new Turtle()];
    }

    createPlant() {
        this.executeString();
        this.plant.create();
    }
};

export default LSystem;
