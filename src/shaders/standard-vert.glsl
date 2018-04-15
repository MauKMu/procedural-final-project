#version 300 es
precision highp float;

uniform mat4 u_Model;
uniform mat4 u_ModelInvTr;  

uniform mat4 u_View;   
uniform mat4 u_Proj; 

in vec4 vs_Pos;
in vec4 vs_Nor;
in vec4 vs_Col;
in vec2 vs_UV;

out vec4 fs_Pos;
out vec4 fs_Nor;            
out vec4 fs_Col;           
out vec2 fs_UV;

//out vec4 fs_WorldPos;

void main()
{
    fs_Col = vs_Col;
    fs_UV = vs_UV;
    fs_UV.y = 1.0 - fs_UV.y;

    // fragment info is in view space
    mat3 invTranspose = mat3(u_ModelInvTr);
    mat3 view = mat3(u_View);
    //fs_Nor = vec4(view * invTranspose * vec3(vs_Nor), 0);
    fs_Nor = vec4(invTranspose * vec3(vs_Nor), 0);
    //fs_Pos = u_Model * vs_Pos;
    fs_Pos = u_View * u_Model * vs_Pos;
    //fs_WorldPos = u_Model * vs_Pos;
    
    gl_Position = u_Proj * u_View * u_Model * vs_Pos;
}
