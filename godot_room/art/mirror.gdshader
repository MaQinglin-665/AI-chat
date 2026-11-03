shader_type spatial;
render_mode unshaded, cull_disabled;
uniform sampler2D reflection_tex : source_color, filter_linear;
uniform bool enabled = false;
void fragment(){
 vec3 reflection=texture(reflection_tex,vec2(1.0-UV.x,UV.y)).rgb;
 ALBEDO=enabled?reflection:vec3(.12,.115,.14);
}
