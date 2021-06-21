// Author: Daniel
// Title: spinsquares

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

#define PI 3.14159265358979323846

vec2 rotate2D(vec2 _st, float _angle){
    _st -= 0.5;
    _st =  mat2(cos(_angle),-sin(_angle),
                sin(_angle),cos(_angle)) * _st;
    _st += 0.5;
    return _st;
}

vec2 tile(vec2 _st, float _zoom){
    _st *= _zoom;
    return fract(_st);
}


float box(vec2 _st, vec2 _size, float _smoothEdges){
    _size = vec2(0.5)-_size*0.5;
    vec2 aa = vec2(_smoothEdges*0.5);
    vec2 uv = smoothstep(_size,_size+aa,_st);
    uv *= smoothstep(_size,_size+aa,vec2(1.0)-_st);
    return uv.x*uv.y;
}

void main(void){
    vec2 st0 = gl_FragCoord.xy/u_resolution.xy;
    vec3 color = vec3(0.0);
    vec2 ms0 = u_mouse / u_resolution.xy;
    float speed = 1.;
    vec2 st1 = rotate2D(st0,PI*u_time*0.1*speed);
    vec2 ms1 = rotate2D(ms0,PI*u_time*0.1*speed);
    // Divide the space in 4
    float zoom1 = 4.;
    vec2 st2 = tile(st1,zoom1);

    // Use a matrix to rotate the space 45 degrees
    vec2 st3 = rotate2D(st2,PI*u_time*0.2*speed);

    // Draw a square
    color = vec3(box(st3,vec2(0.7),0.01));
    
    float i = ceil(st1.x * zoom1);
    float j = ceil(st1.y * zoom1);
    float mi = ceil(ms1.x * zoom1);
    float mj = ceil(ms1.y * zoom1);
    if (mi == i && mj == j) {
        //uncomment these lines to debug i / j coords
        //color.x = i/8.;
        //color.y = j/8.;
        color = vec3(box(st3,vec2(0.5),0.01));
    }
    // color = vec3(st,0.0);

    gl_FragColor = vec4(color,1.0);
}
