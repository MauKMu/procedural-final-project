#version 300 es
precision highp float;

in vec2 fs_UV;
out vec4 out_Col;

uniform sampler2D u_frame;
uniform sampler2D u_preFrame;
//uniform float u_Time;

void main() {
	vec3 color = texture(u_frame, fs_UV).xyz;
	color += texture(u_preFrame, fs_UV).xyz;
	out_Col = vec4(color, 1.0);
}
