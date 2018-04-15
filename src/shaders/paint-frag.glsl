#version 300 es
precision highp float;

in vec2 fs_UV;
out vec4 out_Col;

uniform sampler2D u_frame;
uniform sampler2D u_preFrame;
//uniform sampler2D u_gb0;
uniform float u_Time;
uniform vec2 u_Dims;

uniform float u_BrushSize;
uniform float u_BrushNoise;

vec2 random2(vec2 p) {
    return normalize(2.0 * fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))))*123.45) - 1.0);
}

void main() {
    vec2 GRID_DIMS = vec2(70.0) * 0.5 * u_Dims.x / 526.0;
    // making radius noisy gives airbrush effect
    float rand = random2(fs_UV * 314.159).x;
    // radius = (scale from u_BrushSize) * (base_size + random_element) / (estimate of screen size)
    float radius = (0.5 + u_BrushSize) * (0.4 + 0.05 * rand * (2.0 * u_BrushNoise) ) / GRID_DIMS.x;
	vec3 color = vec3(5.0);
    vec2 cellCorner = floor(fs_UV * GRID_DIMS) / GRID_DIMS;
    vec3 minColor = vec3(0.0);
    float minLen = 100.0;
    float accWeight = 0.0;
    vec3 defaultColor;
    for (int i = -3; i <= 3; i++) {
        for (int j = -3; j <= 3; j++) {
            // read curl noise's angle and color from prepass frame
            vec2 sampleCorner = cellCorner + vec2(i, j) / GRID_DIMS;
            vec4 prepass = texture(u_preFrame, sampleCorner);
            vec2 p = fs_UV - sampleCorner; // in corner-space
            p.x *= u_Dims.x / u_Dims.y;
            // find rotation
            float angle = prepass.w;
            float c = cos(angle);
            float s = sin(angle);
            // rotate
            vec2 pRot = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
            // stretch along X
            pRot.x *= 0.15;
            pRot.y *= 0.31;
            float l = length(pRot);
            if (l < radius) {
                float darkness = 1.0;// -0.6 * smoothstep(-radius, radius, pRot.x);
                float weight = 1.0 - 0.4 * pow(smoothstep(0.0, radius, l), 1.0);
                minLen = l;
                accWeight += weight;
                minColor += weight * prepass.xyz * darkness;
            }
            else if (i == 0 && j == 0) {
                defaultColor = prepass.xyz; // use this fragment's default color
            }
        }
    }
    // if we hit nothing, use default color
    if (minLen == 100.0) {
        minColor = defaultColor;
    }
    // else, divide by sum of weights
    else {
        minColor /= accWeight;
    }
	out_Col = vec4(minColor, 1.0);
}
