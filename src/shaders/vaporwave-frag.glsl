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

const vec3 PURPLE_RGB = vec3(0.7098, 0.0392156, 1.0);
const float X_TILE_DIM = 100.0;
const float Y_TILE_DIM = 20.0;
const float NOISE_TILE_DIM = 400.0;
const float GREEN_OFFSET = 5.0;

void main() {
    // desaturate
    vec3 color = texture(u_frame, fs_UV).xyz;
    // detour and make BG if applicable
    if (fs_UV.y < 0.5) {
        float depth = texture(u_gb0, fs_UV).w;
        if (depth >= 0.0) {
            vec2 pixelDims = 1.0 / u_Dims;
            float xTile = mod((-0.5 + fs_UV.x) * (0.2 + fs_UV.y), 2.0 * X_TILE_DIM * pixelDims.x);
            float yTile = mod(fs_UV.y, 2.0 * Y_TILE_DIM * pixelDims.y);
            bool isBlack = (xTile > X_TILE_DIM * pixelDims.x) ^^ (yTile > Y_TILE_DIM * pixelDims.y);
            if (isBlack) {
                color = vec3(0.0);
            }
            else {
                color = vec3(1.0, 0.0, 0.0);
            }
        }
    }
    vec3 hsv = rgb2hsv(color);
    hsv.y *= 0.3;
    hsv.z *= 0.8;
    color = hsv2rgb(hsv);
    // blend with purple
    color = 0.7 * color + 0.3 * PURPLE_RGB;

	out_Col = vec4(color, 1.0);
}
