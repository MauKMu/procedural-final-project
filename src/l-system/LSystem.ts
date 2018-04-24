import {vec3, vec4, mat4, quat} from 'gl-matrix';
import Turtle from './Turtle';
import {LSymbol, ExpansionRule} from './LSymbol';
import Decoration from '../geometry/Decoration';
import {BRANCH_COLOR} from '../geometry/Decoration';
import LString from './LString';
import {lRandom} from './LRandom';

class LSystem {
    alphabet: Array<LSymbol>;
    turtleStack: Array<Turtle>;
    decoration: Decoration;
    axiom: Array<LSymbol>;
    lstring: LString;
    prismSides: number;

    constructor() {
        //this.alphabet = [];
        this.turtleStack = [new Turtle()];
        this.decoration = new Decoration();
        this.axiom = [];
        this.lstring = new LString([]);
        this.initAlphabet();
        this.prismSides = 8;
    }

    setAxiom(axiomArray: Array<LSymbol>) {
        this.axiom = axiomArray.slice();
        this.lstring.fromArray(axiomArray);
    }

    getTopTurtle(): Turtle {
        return this.turtleStack[this.turtleStack.length - 1];
    }

    useColor(color: vec4) {
        this.decoration.useColor(color);
    }

    addPrismAtTurtle(turtle: Turtle) {
        if (!this.decoration.isSafeToGrow()) {
            return;
        }
        let trans = turtle.getTransformationToTurtle();
        this.decoration.addPrism(trans, this.prismSides, turtle.scaleBottom, turtle.scaleTop, 1);
        turtle.scaleBottom = turtle.scaleTop;
        turtle.scaleTop *= 0.99;
    }

    addScaledPrismAtTurtle(turtle: Turtle, scaleHeight: number) {
        if (!this.decoration.isSafeToGrow()) {
            return;
        }
        let trans = turtle.getTransformationToTurtle();
        this.decoration.addNormalCorrectPrism(trans, this.prismSides, turtle.scaleBottom, turtle.scaleTop, scaleHeight);
        turtle.scaleBottom = turtle.scaleTop;
        turtle.scaleTop *= 0.8;
    }

    // does not shrink thickness
    addScaledPrismAtTurtleNoShrink(turtle: Turtle, scaleHeight: number) {
        if (!this.decoration.isSafeToGrow()) {
            return;
        }
        let trans = turtle.getTransformationToTurtle();
        this.decoration.addNormalCorrectPrism(trans, this.prismSides, turtle.scaleBottom, turtle.scaleTop, scaleHeight);
    }

    addMeshAtTurtle(turtle: Turtle, scale: vec3, mesh: any) {
        if (!this.decoration.isSafeToGrow()) {
            return;
        }
        let trans = turtle.getTransformationToTurtle();
        mat4.scale(trans, trans, scale);
        this.decoration.addMesh(mesh, trans);
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

    resetTurtleStack(pos: vec3) {
        let t = new Turtle();
        vec3.copy(t.position, pos);
        this.turtleStack = [t];
    }

    // resets expansions and decoration VBOs
    resetSystem() {
        this.lstring.fromArray(this.axiom);
        this.resetDecoration();
    }

    resetDecoration() {
        //this.decoration.destroy();
        this.decoration.clearBuffers();
        this.decoration.wasSafe = true;
        this.decoration.useColor(BRANCH_COLOR);
        this.turtleStack = [new Turtle()];
    }

    createDecoration() {
        this.executeString();
        this.decoration.create();
    }
};

export default LSystem;
