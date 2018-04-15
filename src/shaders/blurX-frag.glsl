#version 300 es
precision highp float;

in vec2 fs_UV;
out vec4 out_Col;

uniform sampler2D u_frame;
uniform sampler2D u_preFrame;
//uniform float u_Time;
uniform vec2 u_Dims;

const float GAUSS_KERNEL[5] = float[5](

    0.153388, 0.221461, 0.250301, 0.221461, 0.153388);
    //0.06136, 0.24477, 0.38774, 0.24477, 0.06136);
//const float GAUSS_KERNEL[9] = float[9](
    //0.028532, 0.067234, 0.124009, 0.179044, 0.20236, 0.179044, 0.124009, 0.067234, 0.028532);

void main() {
	vec3 color = vec3(0.0);
    float pixelDim = 1.0 / u_Dims.x;
    for (int i = -2; i <= 2; i++) {
    	color += GAUSS_KERNEL[i + 2] * texture(u_preFrame, fs_UV + vec2(float(i) * pixelDim, 0.0)).xyz;
    }
	out_Col = vec4(color, 1.0);
}
