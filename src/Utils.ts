import {vec2} from 'gl-matrix';

export function mod(x: number, y: number) {
    return x - y * Math.floor(x / y);
}

function fract(x: number): number {
    return x - Math.floor(x);
}

function mix(x: number, y: number, a: number) {
    return x * (1.0 - a) + y * a;
}

const RAND_DOT_VEC2 = vec2.fromValues(12.9898, 4.1414);

// https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83
function rand(n: vec2): number { 
    return fract(Math.sin(vec2.dot(n, RAND_DOT_VEC2)) * 43758.5453);
}

function noise(p: vec2): number {
    let ip = vec2.create();
    vec2.floor(ip, p);
    let u = vec2.fromValues(fract(p[0]), fract(p[1]));
    // u = u * u * (3.0 - 2.0 * u);
    let v = vec2.fromValues(3, 3);
    vec2.scaleAndAdd(v, v, u, -2); // v = vec2(3) - 2 * u
    vec2.multiply(u, u, u); // u = u * u
    vec2.multiply(u, u, v); // u = u * v

    let ipPlusX = vec2.fromValues(ip[0] + 1, ip[1]);
    let ipPlusY = vec2.fromValues(ip[0], ip[1] + 1);
    let ipPlusXY = vec2.fromValues(ipPlusX[0], ipPlusY[1]);

    let res = mix(
        mix(rand(ip), rand(ipPlusX), u[0]),
        mix(rand(ipPlusY), rand(ipPlusXY), u[0]), u[1]);
    return res * res;
}

// http://flafla2.github.io/2014/08/09/perlinnoise.html
export function smoothNoise(p: vec2): number {
    let total = 0.0;
    let freq = 1.0;
    let ampl = 1.0;
    let maxVal = 0.0;
    let scaledP = vec2.create();
    for (let i = 0; i < 6; i++) {
        vec2.scale(scaledP, p, freq);
        total += noise(scaledP) * ampl;
        maxVal += ampl;
        ampl *= 0.5;
        freq *= 2.0;
    }
    return total / maxVal;
}
