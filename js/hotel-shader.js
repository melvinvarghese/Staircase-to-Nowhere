// WebGL 1 / GLES 2: one material atlas, one normal atlas, no postprocessing chain.
export const HOTEL_FRAGMENT_SHADER = `
precision mediump float;
uniform vec3 uHaze; uniform vec3 uGrade; uniform vec3 uEye;
uniform vec4 uLights[8]; uniform int uLightCount;
uniform sampler2D uGrain; uniform sampler2D uAtlas; uniform sampler2D uMaterials; uniform sampler2D uNormals;
uniform sampler2D uReflection; uniform float uMaterialsReady; uniform float uEconomy;
uniform mediump float uReflect; uniform float uReflectionReady; uniform vec2 uScreenSize;
varying vec3 vWorld; varying vec3 vNormal; varying vec3 vColor; varying float vEmissive;
varying float vSurface; varying float vAO; varying float vDepth; varying vec2 vUV;
vec2 tileUV(vec2 uv,vec2 tile){return (tile+vec2(.006)+fract(uv)*.988)*.5;}
vec4 materialSample(sampler2D map,vec2 uv,vec2 unwrapped){
#ifdef HOTEL_GRADIENTS
 return texture2DGradEXT(map,uv,dFdx(unwrapped)*.494,dFdy(unwrapped)*.494);
#else
 return texture2D(map,uv);
#endif
}
void main(){
 if(uReflect>.5 && vWorld.y>-.04)discard;
 vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;
 vec3 originalNormal=n;
 vec2 plane=abs(n.y)>.5?vWorld.xz:(abs(n.x)>.5?vWorld.zy:vWorld.xy);
 vec3 base=vColor;
 float roughness=.9;
 float isMaterial=step(2.5,vSurface);
 if(isMaterial>.5 && uMaterialsReady>.5){
  vec2 tile=vec2(1.,1.);float scale=.38;
  if(vSurface<3.5){tile=vec2(0.,0.);scale=1.1;}
  else if(vSurface<4.5){tile=vec2(1.,0.);scale=.72;}
  else if(vSurface<5.5){tile=vec2(0.,1.);scale=.7;roughness=.43;}
  else if(vSurface<6.5){scale=.32;}
  else if(vSurface<7.5){scale=.45;roughness=.28;}
  else if(vSurface<8.5){tile=vec2(0.,1.);scale=1.2;roughness=.24;}
  else {tile=vec2(1.,1.);scale=2.5;roughness=.98;}
  vec2 sourceUV=plane*scale;
  if(vSurface>4.5&&vSurface<5.5&&abs(n.y)<.5)sourceUV=plane.yx*vec2(.45,.9);
  vec2 uv=tileUV(sourceUV,tile);
  vec3 tex=materialSample(uMaterials,uv,sourceUV).rgb;
  vec3 detail=vec3(0.,0.,1.);
  if(uEconomy<.5)detail=materialSample(uNormals,uv,sourceUV).rgb*2.-1.;
  if(vSurface>4.5&&vSurface<5.5)tex=mix(vec3(.18,.12,.075),tex,.72);
  if(vSurface>6.5 && vSurface<7.5){
   vec2 slabs=fract(plane*1.25);
   float edge=min(min(slabs.x,1.-slabs.x),min(slabs.y,1.-slabs.y));
   float joint=smoothstep(.002,.008,edge);
   float mineral=texture2D(uGrain,plane*.9).r;
   base=mix(vColor,vec3(.40,.39,.33),.42)*(.83+.24*tex.r+mineral*.07)*mix(.64,1.,joint);
  }else if(vSurface>8.5){base=vColor*(.83+.25*tex.r);}
  else if(vSurface>7.5){base=vColor*(.72+.45*tex.r);}
  else {base=tex*mix(vec3(1.),vColor/vec3(.64,.58,.47),.25);}
  if(uEconomy<.5)base*=.91+.09*texture2D(uGrain,plane*.07).r;
  vec3 tangent=abs(n.y)>.5?vec3(1.,0.,0.):(abs(n.x)>.5?vec3(0.,0.,1.):vec3(1.,0.,0.));
  vec3 bitangent=normalize(cross(n,tangent));
  n=normalize(n+detail.x*tangent*.23+detail.y*bitangent*.23);
 }else{
  float noise=texture2D(uGrain,plane*.14).r;
  base*=.96+noise*.08;
 }
 if(vSurface>1.5 && vSurface<2.5){vec4 ink=texture2D(uAtlas,vUV);base=mix(base,ink.rgb,ink.a);}
 vec3 lit=base*(vAO+vEmissive*.85)*uGrade;
 // Restrained material highlights distinguish varnish and stone from fabric.
 if(roughness<.7&&uEconomy<.5){
  vec3 view=normalize(uEye-vWorld);
  for(int i=0;i<8;i++){if(i<uLightCount){
   vec3 delta=uLights[i].xyz-vWorld;
   float distance2=dot(delta,delta);
   vec3 halfway=normalize(normalize(delta)+view);
   float spec=pow(max(dot(n,halfway),0.),mix(70.,14.,roughness));
   lit+=vec3(1.,.91,.72)*spec*(1.-roughness)*.55/(1.+distance2*.12)*min(vAO*2.,1.);
  }}
 }
 if(vSurface>.5&&vSurface<1.5){
  float ripple=texture2D(uGrain,vWorld.xz*.024).b;
  if(uReflect<.5&&uReflectionReady>.5){
   vec2 drift=vec2(ripple-.5,texture2D(uGrain,vWorld.zx*.024).g-.5)*.006;
   vec3 reflected=texture2D(uReflection,gl_FragCoord.xy/uScreenSize+drift).rgb;
   float fresnel=.30+.42*pow(1.-abs(dot(normalize(uEye-vWorld),originalNormal)),3.);
   lit=mix(lit,reflected,fresnel);
  }
 }
 // Distance extinction keeps the far end of long corridors in atmospheric shadow.
 float haze=1.-exp(-max(vDepth-7.,0.)*.014);
 lit=mix(lit,uHaze,haze*.65);
 lit=lit/(vec3(.86)+lit*.30);
 vec2 screen=gl_FragCoord.xy/uScreenSize;
 float lens=1.-.16*dot((screen-.5)*1.35,(screen-.5)*1.35);
 gl_FragColor=vec4(lit*lens,1.);
}`;
