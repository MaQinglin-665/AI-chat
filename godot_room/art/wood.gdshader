shader_type spatial;
render_mode diffuse_burley;
uniform vec4 tint : source_color = vec4(0.48, 0.29, 0.17, 1.0);
uniform float wood_roughness : hint_range(0.0, 1.0) = 0.62;
uniform float specular_strength : hint_range(0.0, 1.0) = 0.5;
varying vec3 local_position;
void vertex(){ local_position = VERTEX; }
void fragment(){
 float grain = sin(local_position.x * 130.0 + sin(local_position.z * 2.0) * 2.0) * 0.016;
 float fine_grain = sin(local_position.x * 510.0 + local_position.z * 3.0) * 0.006;
 ALBEDO = tint.rgb * (1.0 + grain + fine_grain);
 ROUGHNESS = wood_roughness;
 SPECULAR = specular_strength;
}
