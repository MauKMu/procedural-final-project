import {vec2, vec3} from 'gl-matrix';

// http://geomalgorithms.com/a01-_area.html
// https://gamedev.stackexchange.com/questions/23743/whats-the-most-efficient-way-to-find-barycentric-coordinates
export function baryInterp(a: vec2, b: vec2, c: vec2, p: vec2): vec3 {
    let ba = vec2.fromValues(b[0] - a[0], b[1] - a[1]);
    let ca = vec2.fromValues(c[0] - a[0], c[1] - a[1]);
    let pa = vec2.fromValues(p[0] - a[0], p[1] - a[1]);

    let invArea = 1.0 / (ba[0] * ca[1] - ca[0] * ba[1]);
    let valB = (pa[0] * ca[1] - ca[0] * pa[1]) * invArea;
    let valC = (ba[0] * pa[1] - pa[0] * ba[1]) * invArea;

    return vec3.fromValues(1.0 - valB - valC, valB, valC);
}

export function modfVec2(x: vec2, y: number, intPart: vec2): vec2 {
    vec2.set(intPart, Math.floor(x[0] / y), Math.floor(x[1] / y));
    return vec2.fromValues(x[0] - y * intPart[0], x[1] - y * intPart[1]);
}

export function mod(x: number, y: number): number {
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
