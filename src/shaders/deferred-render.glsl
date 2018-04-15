#version 300 es
precision highp float;

#define EPS 0.0001
#define PI 3.1415962

in vec2 fs_UV;
out vec4 out_Col;

uniform sampler2D u_gb0;
uniform sampler2D u_gb1;
uniform sampler2D u_gb2;

uniform float u_Time;
uniform float u_AspectRatio;

uniform mat4 u_View;
uniform vec4 u_CamPos;   

const float CAMERA_TAN = tan(0.5 * 45.0 * 3.1415962 / 180.0);
const float DEPTH_OFFSET = 0.0;

const vec3 LIGHT_POS = vec3(0, 200, 100);

float getLambert(vec3 worldPos, vec3 normal) {
    vec3 toLight = normalize(LIGHT_POS - worldPos);
    return clamp(0.0, 1.0, dot(toLight, normal));
}

// noise helper functions

// from Adam's demo
vec2 random2(vec2 p) {
    //vec2 sinVec = sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))));
    //return sinVec * 0.5 + vec2(0.5);
    //return fract(sinVec * 123.45);
    //return fract(sinVec * 43758.5453);
    return normalize(2.0 * fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))))*123.45) - 1.0);
}

float surflet(vec2 P, vec2 gridPoint)
{
    //return (P.x * P.x) * 0.07;
    // Compute falloff function by converting linear distance to a polynomial
    float distX = abs(P.x - gridPoint.x);
    float distY = abs(P.y - gridPoint.y);
    float tX = 1.0 - 6.0 * pow(distX, 5.0) + 15.0 * pow(distX, 4.0) - 10.0 * pow(distX, 3.0);
    float tY = 1.0 - 6.0 * pow(distY, 5.0) + 15.0 * pow(distY, 4.0) - 10.0 * pow(distY, 3.0);

    // Get the random vector for the grid point
    vec2 gradient = random2(gridPoint);
    // Get the vector from the grid point to P
    vec2 diff = P - gridPoint;
    // Get the value of our height field by dotting grid->P with our gradient
    float height = dot(diff, gradient);
    // Scale our height field (i.e. reduce it) by our polynomial falloff function
    return height * tX * tY;
}

float PerlinNoise(vec2 uv)
{
    // Tile the space
    vec2 uvXLYL = floor(uv);
    vec2 uvXHYL = uvXLYL + vec2(1, 0);
    vec2 uvXHYH = uvXLYL + vec2(1, 1);
    vec2 uvXLYH = uvXLYL + vec2(0, 1);

    return surflet(uv, uvXLYL) + surflet(uv, uvXHYL) + surflet(uv, uvXHYH) + surflet(uv, uvXLYH);
}


float normalizedPerlinNoise(vec2 v) {
    return clamp(0.0, 1.0, PerlinNoise(v) + 0.5);
}

/* FBM (uses Perlin) */
float getFBM(vec2 pt, float startFreq) {
    float noiseSum = 0.0;
    float amplitudeSum = 0.0;
    float amplitude = 1.0;
    float frequency = startFreq;
    for (int i = 0; i < 6; i++) {
        float perlin = normalizedPerlinNoise(pt * frequency);
        noiseSum += perlin * amplitude;
        amplitudeSum += amplitude;
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    return noiseSum / amplitudeSum;
}

// "normalizes" coordinate before calling FBM
float getFBMFromRawPosition(vec2 pos, float startFreq) {
    vec2 coord = pos;
    coord += vec2(3.14, 5.01);// +vec2(u_PerlinSeed);
                              //return pow(sin(coord.x + coord.y), 2.0);
    float fbm = getFBM(coord, startFreq);
    // [0.1, 0.8]
    //return pow((fbm - 0.05) / 0.7, 3.2);
    fbm = pow((fbm - 0.05) / 0.7, 3.2);
    fbm = smoothstep(0.0, 1.3, fbm);
    return fbm;
    //return pow(1.0 - fbm, 2.2);
    //return pow(clamp(0.0, 1.0, (fbm - 0.25) / 0.6), 3.2) * 0.5;
}

vec3 getBGColor(float fbm) {
    float f = smoothstep(-0.8, 3.0, fbm);
    float H = mod(u_Time * 15.0, 360.0);
    const float V = 0.8;
    float S = 0.7 * (1.0 - f);
    /*
    float f = smoothstep(0.0, 1.0, fbm);
    const float H = 288.0;
    float V = 1.0;
    float S = 0.5 * (1.0 - f);
    */

    float C = V * S;
    // h = H / 60
    float h = H / 60.0;
    float X = C * (1.0 - abs(mod(h, 2.0) - 1.0));
    //float X = C * 0.8;
    vec3 col;
    if (h <= 1.0) {
        col = vec3(C, X, 0.0);
    }
    else if (h <= 2.0) {
        col = vec3(X, C, 0.0);
    }
    else if (h <= 3.0) {
        col = vec3(0.0, C, X);
    }
    else if (h <= 4.0) {
        col = vec3(0.0, X, C);
    }
    else if (h <= 5.0) {
        col = vec3(X, 0.0, C);
    }
    else {
        col = vec3(C, 0.0, X);
    }
    float m = V - C;
    return pow(col + vec3(m), vec3(4.2));
}

void main() { 
	// read from GBuffers
	vec4 gb0 = texture(u_gb0, fs_UV);
	vec4 gb1 = texture(u_gb1, fs_UV);
	vec4 gb2 = texture(u_gb2, fs_UV);

    // put GBuffer data in more readable variables
    vec3 nor = gb0.xyz;
    float depth = gb0.w;
    vec3 albedo = gb2.xyz;

    // final color of this fragment
    vec3 col;

    float time = u_Time * 0.03;
    // background
    if (depth >= -DEPTH_OFFSET) {
        float fbm = getFBMFromRawPosition(fs_UV + vec2(-8.88 + cos(time * 5.0), 7.22 + time * 1.5), 1.0 + 0.5 * sin(time * 2.0));
        col = getBGColor(fbm);
    }
    // shade
    else {
        depth += DEPTH_OFFSET;
        // get cam-space position
        vec3 ndcPos = vec3(fs_UV.xy * 2.0 - 1.0, depth);
        float vert = CAMERA_TAN * abs(depth);
        float hori = vert * u_AspectRatio;
        vec3 camPos = ndcPos * vec3(hori, vert, 1.0);
        // convert to world-space pos
        vec3 worldPos = vec3(inverse(u_View) * vec4(camPos, 1.0));
        col = max(0.05, (0.2 + 0.8 * getLambert(worldPos, nor))) * albedo;
    }
    col *= 5.0;
	out_Col = vec4(col, 1.0);
}