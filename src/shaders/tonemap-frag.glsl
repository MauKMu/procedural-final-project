#version 300 es
precision highp float;

in vec2 fs_UV;
out vec4 out_Col;

uniform sampler2D u_frame;
uniform float u_Time;

// based on: http://filmicworlds.com/blog/filmic-tonemapping-operators/

vec3 defaultHDR(vec3 color) {
	color = min(vec3(1.0), color);
	color = pow(color, vec3(1.0 / 2.2));
    return color;
}

vec3 HejlBurgessDawson(vec3 color) {
    color = max(vec3(0.0), color - vec3(0.004));
    color = (color * (6.2 * color + vec3(0.5))) / (color * (6.2 * color + vec3(1.7)) + vec3(0.06));
    return color;
}

void main() {
	// TODO: proper tonemapping
	// This shader just clamps the input color to the range [0, 1]
	// and performs basic gamma correction.
	// It does not properly handle HDR values; you must implement that.

	vec3 color = texture(u_frame, fs_UV).xyz;
	//color = min(vec3(1.0), color);
    // Reinhard
    //color *= 2.0;
    //color = color / (color + vec3(1.0));

    // Hejl and Burgess-Dawson
    //color = max(vec3(0.0), color - vec3(0.004));
    //color = (color * (6.2 * color + vec3(0.5))) / (color * (6.2 * color + vec3(1.7)) + vec3(0.06));

	// gamma correction
	//color = pow(color, vec3(1.0 / 2.2));
    //color = defaultHDR(color);
    color = HejlBurgessDawson(color);
	out_Col = vec4(color, 1.0);
}
