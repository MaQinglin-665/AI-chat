shader_type spatial;
render_mode diffuse_burley;
// Original procedural prints: moonlit mountain lake / cherry branch / meadow.
// No downloaded pixels, per-frame animation, texture or third-party artwork.
uniform int design : hint_range(0,2) = 0;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float disc(vec2 p,vec2 center,float radius){return 1.0-smoothstep(radius-0.005,radius+0.005,length(p-center));}
float stroke(vec2 p,vec2 a,vec2 b,float width){
 vec2 segment=b-a;
 float t=clamp(dot(p-a,segment)/dot(segment,segment),0.0,1.0);
 return 1.0-smoothstep(width,width+0.006,length(p-a-segment*t));
}
void fragment(){
 vec2 p=UV;
 vec3 ink;
 if(design==1){
  ink=mix(vec3(0.64,0.39,0.44),vec3(0.94,0.78,0.69),p.y);
  float branch=stroke(p,vec2(-0.1,0.90),vec2(0.72,0.32),0.021);
  branch=max(branch,stroke(p,vec2(0.30,0.62),vec2(0.15,0.27),0.011));
  branch=max(branch,stroke(p,vec2(0.51,0.47),vec2(0.94,0.45),0.012));
  ink=mix(ink,vec3(0.22,0.12,0.21),branch);
  for(int i=0;i<11;i++){
   float n=float(i);
   vec2 center=vec2(0.10+hash(vec2(n,2.0))*0.80,0.21+hash(vec2(n,3.0))*0.43);
   float blossom=0.0;
   for(int petal=0;petal<5;petal++){
    float angle=float(petal)*1.256637;
    blossom=max(blossom,disc(p,center+vec2(cos(angle),sin(angle))*0.025,0.026));
   }
   ink=mix(ink,vec3(0.98,0.69,0.77),blossom);
   ink=mix(ink,vec3(0.86,0.48,0.56),disc(p,center,0.010));
  }
 }else{
  ink=mix(vec3(0.12,0.17,0.31),vec3(0.66,0.46,0.53),p.y);
  if(design==2){ink=mix(vec3(0.54,0.66,0.66),vec3(0.95,0.76,0.62),p.y);}
  float moon=disc(p,vec2(0.69,0.23),0.084);
  ink=mix(ink,vec3(1.0,0.86,0.66),moon);
  vec2 cell=p*vec2(12.0,16.0);
  float stars=step(0.86,hash(floor(cell)))*(1.0-smoothstep(0.01,0.08,length(fract(cell)-0.5)));
  ink+=stars*0.50*(1.0-smoothstep(0.45,0.65,p.y));
  float far=0.56+sin(p.x*8.0)*0.075+sin(p.x*19.0)*0.025;
  ink=mix(ink,design==2?vec3(0.37,0.48,0.43):vec3(0.30,0.31,0.45),smoothstep(far-0.004,far+0.004,p.y));
  float near=0.70+sin(p.x*6.0+1.6)*0.07+sin(p.x*14.0)*0.045;
  ink=mix(ink,design==2?vec3(0.23,0.37,0.32):vec3(0.18,0.23,0.34),smoothstep(near-0.003,near+0.003,p.y));
  float water=step(0.79,p.y);
  vec3 lake=mix(vec3(0.29,0.35,0.43),vec3(0.13,0.22,0.32),(p.y-0.79)*4.0);
  float reflection=exp(-pow((p.x-0.69)/(0.05+(p.y-0.79)*0.34),2.0))*step(0.5,sin(p.y*210.0));
  ink=mix(ink,lake+reflection*vec3(0.28,0.20,0.12),water);
 }
 ALBEDO=ink;
 // Printed pigments remain legible in warm evening light without becoming lamps.
 ROUGHNESS=0.95;
 SPECULAR=0.0;
}
