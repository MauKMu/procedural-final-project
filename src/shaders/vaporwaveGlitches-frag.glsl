#version 300 es
precision highp float;

in vec2 fs_UV;
out vec4 out_Col;

uniform sampler2D u_frame;
//uniform sampler2D u_preFrame;
uniform sampler2D u_gb0;
uniform float u_Time;
uniform vec2 u_Dims;

// from https://stackoverflow.com/questions/15095909/from-rgb-to-hsv-in-opengl-glsl
vec3 rgb2hsv(vec3 c)
{
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec2 random2(vec2 p) {
    return normalize(2.0 * fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))))*123.45) - 1.0);
}

float randomer2(vec2 p, float seed) {
    return fract(sin(dot(p, vec2(127.1 * seed, 311.7))) * 123.45);
    //return normalize(2.0 * fract(sin(vec2(dot(p, vec2(127.1 * seed, 311.7)), dot(p, vec2(269.5, 183.3 + seed))))*123.45) - 1.0);
}

const float PI = 3.14159265;
const float NOISE_TILE_DIM = 400.0;
//const float NOISE_COS = 0.93969;
//const float NOISE_SIN = -0.3420201;
const float NOISE_STRIPE_DIM = 30.0;

const float GAUSS_KERNEL[5] = float[5](
    0.122581, 0.233062, 0.288713, 0.233062, 0.122581);

void main() {
    vec3 color = texture(u_frame, fs_UV).xyz;
    vec2 pixelDims = 1.0 / u_Dims;
    // chromatic aberration
    float GREEN_OFFSET = 5.0 * (1.0 + abs(fs_UV.x - 0.5) * 5.0) * (1.0 + 0.1 * random2(vec2(fs_UV.y * 9.12)).y);
    float sqrWave = (mod(u_Time * 0.73, 2.2) > 2.0) ? 1.0 : 0.0;
    GREEN_OFFSET += sqrWave * 5.0;
    vec3 neighbor = texture(u_frame, fs_UV + pixelDims * vec2(GREEN_OFFSET, 0.0)).xyz;
    color.y = neighbor.y;

    // distort -- move pixels to the side
    float time = u_Time * 0.47;
    vec2 distortRand = random2(vec2(floor(time)));
    // use mod to compute a random boolean value without random2
    float DISTORT_THRESH = (mod(distortRand.x, 0.0003) > 0.00015) ? 0.8 : 0.5;
    sqrWave = (mod(time, 1.0) > DISTORT_THRESH) ? 1.0 : 0.0;
    float DISTORT_START = 0.5 + 0.5 * distortRand.x;
    float DISTORT_STRIPE_DIM = 50.0 + 20.0 * (distortRand.y);
    float DISTORT_OFFSET = GREEN_OFFSET * 1.6;
    if (DISTORT_START < fs_UV.y && fs_UV.y < DISTORT_START + pixelDims.y * DISTORT_STRIPE_DIM) {
        float distIntoStripe = (fs_UV.y - DISTORT_START) / (pixelDims.y * DISTORT_STRIPE_DIM) * PI;
        // pow is for making offset "spikier". mod randomly switches between offseting to left or right
        float extraOffset = pow(sin(distIntoStripe), 5.0) * ((mod(DISTORT_START, 0.0012) > 0.0006) ? -1.0 : 1.0);
        vec3 neighbor = texture(u_frame, fs_UV - pixelDims * vec2(DISTORT_OFFSET + extraOffset * 47.0, 2.0)).xyz;
        color = mix(color, color * 0.2 + neighbor * 0.8, sqrWave);
    }

    // add constant static
    vec2 noiseCell = floor(fs_UV * NOISE_TILE_DIM) / NOISE_TILE_DIM;
    float noise = randomer2(noiseCell * 0.1 + vec2(u_Time * 0.0002, -u_Time * 0.00003), noiseCell.x * 9.78 + noiseCell.y * 295.1);
    color *= 0.85 + 0.15 * noise;

    // compute "forceStart" -- add some chance to add line noise
    // outside of main noise stripe
    float time2 = u_Time * 4.0;
    vec2 forceRand = random2(vec2(floor(time2), fs_UV.y));
    bool forceStart = mod(forceRand.x, 0.00001) > 0.0000097;
    // also compute a "flipFactor" -- sometimes make noise light instead of dark
    bool flipColor = mod(forceRand.y, 0.0001) > 0.00009;
    float flipFactor = (forceStart && flipColor) ? 0.5 : 0.2;

    float STRIPE_START = mod(-u_Time * 0.4, 1.5);

    // add intermittent static stripe
    if (forceStart || (STRIPE_START < fs_UV.y && fs_UV.y < STRIPE_START + pixelDims.y * NOISE_STRIPE_DIM)) {
        noise = 0.0;
        // 1 pixel tall -- not needed now?
        noiseCell.y = floor(fs_UV.y * u_Dims.y) / (u_Dims.y);
        // randomly scale size of noise column for each row
        float rowScale = random2(noiseCell.yy).y * 0.5 + 1.5;
        for (int i = -2; i <= 2; i++) {
            // each line of noise is made of multiple segments
            // NOISE_TILE_DIM * 0.05 * rowScale controls the length of these segments
            // since rowScale changes for each Y, the lengths differ for each pixel row
            noiseCell.x = floor((fs_UV.x + float(i) * pixelDims.x) * NOISE_TILE_DIM * 0.05 * rowScale) / (NOISE_TILE_DIM * 0.05 * rowScale);
            // "blur" to make noise less harsh
            noise += GAUSS_KERNEL[i + 2] * 1.3 * smoothstep(-0.9, 0.95, random2(noiseCell + vec2(u_Time * 0.0002, u_Time * 0.000)).y);
        }
        // if we decide to "flip color", we make the noise contribution higher 
        // to make it look whiter
        color *= 0.8 + flipFactor * noise;
    }


	out_Col = vec4(color, 1.0);
}
