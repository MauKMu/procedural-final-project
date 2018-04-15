#version 300 es
precision highp float;

in vec2 fs_UV;
out vec4 out_Col;

uniform sampler2D u_frame;
//uniform sampler2D u_preFrame;
//uniform sampler2D u_gb0;
//uniform float u_Time;
uniform vec2 u_Dims;


void main() {
    vec2 screenRatio = u_Dims / vec2(1295.0, 759.0);
    vec2 GRID_DIMS = vec2(150.0) * screenRatio;
    vec2 cellCorner = floor(fs_UV * GRID_DIMS) / GRID_DIMS;
    float minF = 5.0;
    for (int i = -1; i <= 1; i++) {
        for (int j = -1; j <= 1; j++) {
            vec2 sampleCorner = cellCorner + vec2(i, j) / GRID_DIMS;
            vec4 sampleColor = texture(u_frame, sampleCorner);
            vec2 p = sampleCorner - fs_UV;
            p.x *= u_Dims.x / u_Dims.y; // adjust for aspect ratio
            float lum = dot(sampleColor.xyz, vec3(0.2126, 0.7152, 0.072));
            float dist = (0.00001 + 0.0016 * (1.0 - clamp(0.0, 1.5, lum) / 1.5)) / sqrt(screenRatio.x);
            float f = smoothstep(dist, 3.0 * dist, distance(sampleCorner, fs_UV));
            minF = min(minF, 5.0 * f);
        }
    }
	vec3 color = vec3(minF);
	out_Col = vec4(color, 1.0);
}
