// Singleton class
// https://k94n.com/es6-modules-single-instance-pattern

export const LRANDOM_MATH_RANDOM = 1; // use Math.random()
export const LRANDOM_DETERMINISTIC = 2; // use deterministic noise

// https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83
function fract(x: number): number {
    return x - Math.floor(x); 
}

// this should be enough if x is an integer
// i.e. not varying by small amounts
// (otherwise we would see sine+sawtoot-like patterns, which is "fixed" with the noise() function)
function rand(x: number) {
    return fract(Math.sin(x) * 43758.5453123);
}

class LRandom {
    mode: number;
    state: number;

    // set mode to one of the LRANDOM_* values above
    //constructor(mode: number, seed: number) {
        //this.mode = mode;
        //this.state = seed;
    //}
    constructor() {
        this.mode = LRANDOM_MATH_RANDOM;
        this.state = 0;
    }

    setSeed(seed: number) {
        this.state = seed;
    }

    setMode(mode: number) {
        this.mode = mode;
    }

    getNext() {
        if (this.mode == LRANDOM_MATH_RANDOM) {
            return Math.random();
        }
        else if (this.mode == LRANDOM_DETERMINISTIC) {
            return rand(this.state++);
        }
        else {
            return -1.0;
        }
    }

};

// this makes it a singleton
export let lRandom = new LRandom();
