shader_type spatial;
render_mode unshaded, cull_disabled;
uniform vec4 zenith : source_color = vec4(0.025,0.045,0.15,1.0);
uniform vec4 horizon : source_color = vec4(0.12,0.18,0.34,1.0);
uniform float night = 1.0;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void fragment(){
 vec2 p=UV;
 vec3 sky=mix(horizon.rgb,zenith.rgb,smoothstep(0.0,1.0,1.0-p.y));
 float ridge=0.80+sin(p.x*12.0)*0.025+sin(p.x*27.0)*0.02;
 sky=mix(sky,zenith.rgb*0.65,smoothstep(ridge-0.008,ridge+0.008,p.y));
 vec2 grid=p*vec2(45.0,28.0);
 float stars=step(0.991,hash(floor(grid)))*(1.0-smoothstep(0.015,0.06,length(fract(grid)-0.5)));
 float moon=1.0-smoothstep(0.041,0.045,length((p-vec2(0.72,0.26))*vec2(1.8,1.0)));
 float city=step(0.94,p.y)*step(0.68,hash(floor(p*vec2(110.0,60.0))));
 ALBEDO=sky + night*(stars*0.22+moon*vec3(0.34,0.38,0.48)+city*vec3(0.23,0.15,0.075));
}
