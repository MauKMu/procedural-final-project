import {vec3, mat4} from 'gl-matrix';
import {LSymbol, ExpansionRule} from './LSymbol';
import LSystem from './LSystem';
import {lRandom, LRANDOM_MATH_RANDOM, LRANDOM_DETERMINISTIC} from './LRandom';

// Node of the linked list (LString)
class LStringNode {
    sym: LSymbol; // symbol is reserved...
    next: LStringNode;

    constructor(sym: LSymbol, next: LStringNode) {
        this.sym = sym;
        this.next = next;
    }
}

// Linked list of LSymbols
class LString {
    head: LStringNode;

    // constructs list from array
    constructor(arr: Array<LSymbol>) {
        this.fromArray(arr);
    }

    fromArray(arr: Array<LSymbol>) {
        if (arr.length == 0) {
            this.head = null;
            return;
        }
        // initialize head
        this.head = new LStringNode(arr[0], null);

        // add following elements
        let node = this.head;
        for (let i = 1; i < arr.length; i++) {
            let nextNode = new LStringNode(arr[i], null);
            node.next = nextNode;
            node = nextNode;
        }
    }

    toString(): string {
        let arr = Array<string>();
        let node = this.head;
        while (node != null) {
            arr.push(node.sym.stringRepr);
            node = node.next;
        }
        return arr.join("");
    }

    expand() {
        let node = this.head;
        while (node != null) {
            let nextNode = node.next;

            if (node.sym.canExpand()) {
                // expand!
                //let p = Math.random();
                let p = lRandom.getNext();
                let arr = node.sym.expand(p);
                // arr should never be empty
                node.sym = arr[0];
                if (arr.length > 1) {
                    for (let i = 1; i < arr.length; i++) {
                        let newNode = new LStringNode(arr[i], null);
                        node.next = newNode;
                        node = newNode;
                    }
                    node.next = nextNode;
                }
            }
            node = nextNode;
        }
    }

    execute(lsys: LSystem) {
        let node = this.head;
        while (node != null) {
            node.sym.action(lsys);
            node = node.next;
        }
    }

    length() {
        let len = 0;
        let node = this.head;
        while (node != null) {
            len++;
            node = node.next;
        }
        return len;
    }

};

export default LString;