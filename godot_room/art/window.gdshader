shader_type spatial;
render_mode unshaded, cull_disabled;
uniform vec4 zenith : source_color = vec4(0.025,0.045,0.15,1.0);
uniform vec4 horizon : source_color = vec4(0.12,0.18,0.34,1.0);
uniform float night = 1.0;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
// Original stationary distant lights. Elliptical UV correction gives round light
// cores on the 3.22 x 1.72 m window; adjacent cells keep halos from being clipped.
vec3 city_lights(vec2 p){
 vec3 result=vec3(0.0);
 for(int row=0;row<3;row++){
  float r=float(row);
  float columns=30.0+r*9.0;
  float cell=floor(p.x*columns);
  for(int offset=-1;offset<=1;offset++){
   vec2 seed=vec2(cell+float(offset),r+11.0);
   float random=hash(seed);
   float x=(seed.x+0.15+0.7*hash(seed+3.1))/columns;
   float y=0.915+r*0.026+(hash(seed+5.2)-0.5)*0.020;
   float radius=mix(0.0020,0.0042,hash(seed+7.7))*(1.0-r*0.12);
   float distance_to_light=length((p-vec2(x,y))*vec2(1.872,1.0));
   // UV derivatives stay continuous across hashed cells: no vertical seam streaks.
   float aa=max(length(vec2(dFdx(p.x)*1.872,dFdy(p.y))),0.0003);
   float core=1.0-smoothstep(radius-aa,radius+aa,distance_to_light);
   float halo=exp(-pow(distance_to_light/(radius*3.8),2.0))*0.23;
   float strength=step(0.38,random)*mix(0.18,0.55,hash(seed+12.3));
   vec3 color=mix(vec3(0.95,0.57,0.26),vec3(0.74,0.81,0.94),step(0.85,hash(seed+17.0)));
   result+=(core+halo)*strength*color;
  }
 }
 return result;
}
void fragment(){
 vec2 p=UV;
 vec3 sky=mix(horizon.rgb,zenith.rgb,smoothstep(0.0,1.0,1.0-p.y));
 float ridge=0.80+sin(p.x*12.0)*0.025+sin(p.x*27.0)*0.02;
 sky=mix(sky,zenith.rgb*0.65,smoothstep(ridge-0.008,ridge+0.008,p.y));
 vec2 grid=p*vec2(45.0,28.0);
 float stars=step(0.991,hash(floor(grid)))*(1.0-smoothstep(0.015,0.06,length(fract(grid)-0.5)));
 float moon=1.0-smoothstep(0.041,0.045,length((p-vec2(0.72,0.26))*vec2(1.8,1.0)));
 ALBEDO=sky+night*(stars*0.22+moon*vec3(0.34,0.38,0.48)+city_lights(p));
}
