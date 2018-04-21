import {vec3, vec4, mat4, quat} from 'gl-matrix';
import Turtle from '../l-system/Turtle';
import {LSymbol, ExpansionRule} from '../l-system/LSymbol';
import LSystem from '../l-system/LSystem';
import Decoration from '../geometry/Decoration';
import {PRISM_HEIGHT} from '../geometry/Decoration';
import LString from '../l-system/LString';
import {lRandom, LRANDOM_DETERMINISTIC} from '../l-system/LRandom';

class BasicTree extends LSystem {

    constructor(decoration: Decoration) {
        super();
        this.decoration = decoration;
        this.prismSides = 5;
    }

    resetTurtleStack(pos: vec3) {
        let t = new Turtle();
        vec3.copy(t.position, pos);
        t.scaleBottom = 0.75;
        t.scaleTop = 0.75;
        this.turtleStack = [t];
    }

    initAlphabet() {
        this.alphabet = [];
        // forward
        let F = new LSymbol("F", function (lsys: LSystem) {
            let turtle = lsys.getTopTurtle();
            lsys.addScaledPrismAtTurtleNoShrink(turtle, 0.8);
            turtle.moveForward(PRISM_HEIGHT * 0.6);
        });
        this.alphabet.push(F);
        // turn
        // make turtle face in a mostly vertical direction that's not up
        let T = new LSymbol("T", function (lsys: LSystem) {
            let turtle = lsys.getTopTurtle();
            let angle = lRandom.getNext() * 2.0 * Math.PI;
            let y = lRandom.getNext() * 0.5 + 0.25;
            vec3.set(turtle.orientation, Math.cos(angle), y, Math.sin(angle));
            vec3.normalize(turtle.orientation, turtle.orientation);
            // temporarily shrink top
            let top = turtle.scaleTop;
            let bot = turtle.scaleBottom;
            turtle.scaleTop *= 0.75;
            turtle.scaleBottom *= 0.9;
            lsys.addScaledPrismAtTurtleNoShrink(turtle, 0.4);
            turtle.scaleTop = top;
            turtle.scaleBottom = bot;
            turtle.moveForward(PRISM_HEIGHT * 0.35);
            // make next prisms thinner so they "connect" better
            turtle.scaleBottom *= 0.5;
        });
        this.alphabet.push(T);
        // straighten
        // make turtle face up again
        let S = new LSymbol("S", function (lsys: LSystem) {
            let turtle = lsys.getTopTurtle();
            let angle = lRandom.getNext() * 2.0 * Math.PI;
            let y = lRandom.getNext() * 0.3 + 0.45;
            vec3.set(turtle.orientation, 0, 1, 0);
            lsys.addScaledPrismAtTurtleNoShrink(turtle, 0.8);
            turtle.moveForward(PRISM_HEIGHT * 0.8);
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

        // set expansion rules
        F.setExpansionRules([
            new ExpansionRule(4, [F]),
            new ExpansionRule(1, [F, push, T, S, pop, F, F]),
            new ExpansionRule(1, [F, F])
        ]);
        T.setExpansionRules([
            new ExpansionRule(1, [T]),
            new ExpansionRule(1, [push, T, S, pop, T])
        ]);
        S.setExpansionRules([
            new ExpansionRule(2, [S]),
            new ExpansionRule(1, [S, S])
        ]);

        this.setAxiom([
            F, push, T, S, pop, push, T, S, pop
        ]);
    }

    executeString() {
        lRandom.setMode(LRANDOM_DETERMINISTIC);
        let seed = lRandom.state;
        lRandom.setSeed(0);
        super.executeString();
        lRandom.setSeed(seed);
    }

};

export default BasicTree;
