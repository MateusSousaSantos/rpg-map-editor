/**
 * engine.ts — the standalone WebGL2 lighting pass.
 *
 * Deferred-style single-pass compositor: given an `albedo` buffer (the unlit
 * map) and a `normal` buffer, plus a set of lights and a global ambient term, it
 * relights every pixel and returns a canvas holding the lit result.
 *
 * Design constraints (see LIGHTING_HANDOFF.md):
 *   • ONE persistent GL context, reused across every bake and by the export
 *     path — browsers cap the number of live WebGL contexts, and creating one
 *     per bake would thrash. The returned canvas is the engine's own; callers
 *     that need a stable copy (export) must draw it into their own 2D canvas
 *     immediately.
 *   • Baked on change, never per frame. This module holds no animation loop.
 *
 * Phase 3 scope: point/spot/area lights + ambient + directional sun,
 * normal-mapped diffuse (`N·L`), and soft shadows raymarched against an occluder
 * mask (walls + prop silhouettes).
 */

export interface EngineLight {
  /** World-space center (map pixels). */
  x: number;
  y: number;
  /** Reach in world pixels. */
  radius: number;
  /** Elevation above the map plane (world pixels); feeds the L vector's z. */
  z: number;
  /** Linear color, each channel 0..1. */
  color: [number, number, number];
  /** Brightness multiplier (~1 = normal). */
  intensity: number;
  /** Shape. Default 'point'. */
  type?: 'point' | 'spot' | 'area';
  /** Spot facing direction in degrees (0 = +x, clockwise). */
  angle?: number;
  /** Spot full cone spread in degrees. */
  coneAngle?: number;
  /** Area emitter as four corner offsets from the center, world pixels (TL,TR,BR,BL). */
  corners?: { x: number; y: number }[];
  /** Whether this light casts shadows (default true). */
  castsShadows?: boolean;
}

export interface RenderLightingParams {
  albedo: HTMLCanvasElement;
  normal: HTMLCanvasElement;
  /** Shadow-caster mask; the shader raymarches its alpha channel. */
  occluder: HTMLCanvasElement;
  /** Buffer size in device pixels (= map pixels × scale). */
  width: number;
  height: number;
  /** Pixel multiplier that world coords must be scaled by to reach buffer space. */
  scale: number;
  /**
   * Whether to (re)upload the albedo/normal buffers as GL textures. Default true.
   * Pass false when the buffers are unchanged since the last call (e.g. a light
   * moved but the map content did not) to skip the two full-map texture uploads
   * and only re-run the shader — the persistent context keeps the textures bound.
   */
  uploadBuffers?: boolean;
  /** Ambient tint, each channel 0..1. */
  ambientColor: [number, number, number];
  /** 0 = pitch black, 1 = fully lit even with no lights. */
  ambientIntensity: number;
  lights: EngineLight[];
  /**
   * Optional global directional light (sun / moon). `dir` points toward the
   * light and should carry a positive z so flat ground still catches it;
   * `color` is already premultiplied by intensity.
   */
  sun?: { dir: [number, number, number]; color: [number, number, number] };
}

const MAX_LIGHTS = 64;

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  // Full-screen triangle. Map clip-space to a top-left-origin uv so that
  // uv (0,0) = top-left of the map (matches albedo pixel (0,0) and light coords).
  vec2 a = aPos * 0.5 + 0.5;
  vUv = vec2(a.x, 1.0 - a.y);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

/** Shadow raymarch: steps toward the light and soft-shadow taps. */
const SHADOW_STEPS = 48;
const SHADOW_TAPS = 4;

const FRAG = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uAlbedo;
uniform sampler2D uNormal;
uniform sampler2D uOccluder;
uniform vec2  uResolution;
uniform vec3  uAmbient;                 // color * intensity, premultiplied
uniform int   uNumLights;
uniform vec2  uLightPos[${MAX_LIGHTS}];   // buffer-pixel space (top-left origin)
uniform vec3  uLightColor[${MAX_LIGHTS}];
uniform float uLightRadius[${MAX_LIGHTS}];
uniform float uLightZ[${MAX_LIGHTS}];
uniform float uLightIntensity[${MAX_LIGHTS}];
uniform int   uLightType[${MAX_LIGHTS}];   // 0 = point, 1 = spot, 2 = area
uniform vec2  uLightDir[${MAX_LIGHTS}];    // spot facing (normalized)
uniform vec2  uLightConeCos[${MAX_LIGHTS}];// [innerCos, outerCos]
uniform vec4  uLightQuadA[${MAX_LIGHTS}];  // area corners 0,1 (buffer px): xy=c0, zw=c1
uniform vec4  uLightQuadB[${MAX_LIGHTS}];  // area corners 2,3 (buffer px): xy=c2, zw=c3
uniform float uLightShadow[${MAX_LIGHTS}]; // 1 = casts shadows, 0 = not
uniform vec3  uSunColor;                 // color * intensity (0 = no sun)
uniform vec3  uSunDir;                    // direction toward the sun (normalized)

const int SHADOW_STEPS = ${SHADOW_STEPS};
const int SHADOW_TAPS = ${SHADOW_TAPS};
// Fixed jitter offsets (unit disk) for the soft-shadow penumbra taps.
const vec2 TAP_OFFSETS[4] = vec2[4](
  vec2( 0.0,  0.0), vec2( 0.7,  0.4), vec2(-0.6,  0.5), vec2( 0.2, -0.8)
);
const float PENUMBRA = 5.0;   // penumbra radius in buffer px

// One ray from the fragment to the light; returns 1.0 if it reaches the light,
// 0.0 if a solid occluder blocks it. Starts a few px in to avoid the
// fragment/wall self-shadowing its own texel.
float traceRay(vec2 from, vec2 to) {
  vec2 delta = to - from;
  vec2 stepv = delta / float(SHADOW_STEPS);
  for (int s = 3; s < SHADOW_STEPS; s++) {
    vec2 p = from + stepv * float(s);
    if (texture(uOccluder, p / uResolution).a > 0.5) return 0.0;
  }
  return 1.0;
}

// Fraction of jittered rays that reach the light → soft shadow visibility.
float visibility(vec2 fragPx, vec2 lightPx) {
  float vis = 0.0;
  for (int t = 0; t < SHADOW_TAPS; t++) {
    vis += traceRay(fragPx, lightPx + TAP_OFFSETS[t] * PENUMBRA);
  }
  return vis / float(SHADOW_TAPS);
}

float cross2(vec2 a, vec2 b) { return a.x * b.y - a.y * b.x; }

// Closest point on segment a→b to p.
vec2 closestOnSeg(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
  return a + ab * t;
}

// Is p inside the (convex) quad c0→c1→c2→c3? Winding-agnostic.
bool inQuad(vec2 p, vec2 c0, vec2 c1, vec2 c2, vec2 c3) {
  float s0 = cross2(c1 - c0, p - c0);
  float s1 = cross2(c2 - c1, p - c1);
  float s2 = cross2(c3 - c2, p - c2);
  float s3 = cross2(c0 - c3, p - c3);
  bool pos = s0 >= 0.0 && s1 >= 0.0 && s2 >= 0.0 && s3 >= 0.0;
  bool neg = s0 <= 0.0 && s1 <= 0.0 && s2 <= 0.0 && s3 <= 0.0;
  return pos || neg;
}

// Closest point on the quad to p — p itself when inside (emitter interior is
// fully lit), else the nearest point on the four edges.
vec2 closestOnQuad(vec2 p, vec2 c0, vec2 c1, vec2 c2, vec2 c3) {
  if (inQuad(p, c0, c1, c2, c3)) return p;
  vec2 best = closestOnSeg(p, c0, c1);
  float bd = distance(p, best);
  vec2 e1 = closestOnSeg(p, c1, c2); float d1 = distance(p, e1); if (d1 < bd) { bd = d1; best = e1; }
  vec2 e2 = closestOnSeg(p, c2, c3); float d2 = distance(p, e2); if (d2 < bd) { bd = d2; best = e2; }
  vec2 e3 = closestOnSeg(p, c3, c0); float d3 = distance(p, e3); if (d3 < bd) { bd = d3; best = e3; }
  return best;
}

void main() {
  vec4 albedo = texture(uAlbedo, vUv);
  vec3 N = normalize(texture(uNormal, vUv).xyz * 2.0 - 1.0);
  vec2 fragPx = vUv * uResolution;

  vec3 lightSum = uAmbient;

  // Global directional term (sun / moon).
  lightSum += uSunColor * max(dot(N, uSunDir), 0.0);

  for (int i = 0; i < uNumLights; i++) {
    vec2 lpos = uLightPos[i];
    float radius = max(uLightRadius[i], 1.0);
    int type = uLightType[i];

    // The point we measure distance/direction from. Area lights use the closest
    // point on their emitter rect so the pool is rectangular; others use center.
    vec2 refPt = lpos;
    if (type == 2) {
      vec4 qa = uLightQuadA[i];
      vec4 qb = uLightQuadB[i];
      refPt = closestOnQuad(fragPx, qa.xy, qa.zw, qb.xy, qb.zw);
    }

    vec2 d = refPt - fragPx;
    float dist = length(d);
    // Smooth quadratic falloff to the light's reach.
    float att = clamp(1.0 - dist / radius, 0.0, 1.0);
    att *= att;
    if (att <= 0.0) continue;

    // Spot: attenuate by the cone with a soft inner→outer edge.
    if (type == 1) {
      vec2 toFrag = normalize(fragPx - lpos);
      float c = dot(toFrag, uLightDir[i]);
      float cone = smoothstep(uLightConeCos[i].y, uLightConeCos[i].x, c);
      if (cone <= 0.0) continue;
      att *= cone;
    }

    // Diffuse term with the light lifted uLightZ above the plane.
    vec3 L = normalize(vec3(d, uLightZ[i]));
    float ndl = max(dot(N, L), 0.0);
    if (ndl <= 0.0) continue;

    float vis = uLightShadow[i] > 0.5 ? visibility(fragPx, lpos) : 1.0;

    lightSum += uLightColor[i] * uLightIntensity[i] * att * ndl * vis;
  }

  fragColor = vec4(albedo.rgb * lightSum, albedo.a);
}`;

/**
 * Texture row flip on upload. Must be FALSE here: the vertex shader already maps
 * clip-top → uv.y=0, and a WebGL canvas presents framebuffer row 0 at the bottom,
 * so the displayed top-left pixel samples uv=(0,0). With no flip that samples the
 * albedo's top-left (map top-left), which is what Konva expects at image (0,0).
 * Flipping here would render the whole overlay upside-down.
 */
const FLIP_Y = false;

interface EngineState {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
  albedoTex: WebGLTexture;
  normalTex: WebGLTexture;
  occluderTex: WebGLTexture;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

let state: EngineState | null = null;
let unavailable = false;

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error('Lighting shader compile error:', gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

function makeTexture(gl: WebGL2RenderingContext): WebGLTexture | null {
  const tex = gl.createTexture();
  if (!tex) return null;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

function init(): EngineState | null {
  if (unavailable) return null;

  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', {
    premultipliedAlpha: false,
    alpha: true,
    antialias: false,
    preserveDrawingBuffer: true, // so the canvas can be read as an image after draw
  });
  if (!gl) {
    unavailable = true;
    console.warn('WebGL2 unavailable — dynamic lighting disabled.');
    return null;
  }

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) {
    unavailable = true;
    return null;
  }

  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.bindAttribLocation(program, 0, 'aPos');
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Lighting program link error:', gl.getProgramInfoLog(program));
    unavailable = true;
    return null;
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  // Full-screen triangle.
  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  const albedoTex = makeTexture(gl);
  const normalTex = makeTexture(gl);
  const occluderTex = makeTexture(gl);
  if (!albedoTex || !normalTex || !occluderTex) {
    unavailable = true;
    return null;
  }

  const u = (name: string) => gl.getUniformLocation(program, name);
  const uniforms: EngineState['uniforms'] = {
    uAlbedo: u('uAlbedo'),
    uNormal: u('uNormal'),
    uOccluder: u('uOccluder'),
    uResolution: u('uResolution'),
    uAmbient: u('uAmbient'),
    uNumLights: u('uNumLights'),
    uLightPos: u('uLightPos'),
    uLightColor: u('uLightColor'),
    uLightRadius: u('uLightRadius'),
    uLightZ: u('uLightZ'),
    uLightIntensity: u('uLightIntensity'),
    uLightType: u('uLightType'),
    uLightDir: u('uLightDir'),
    uLightConeCos: u('uLightConeCos'),
    uLightQuadA: u('uLightQuadA'),
    uLightQuadB: u('uLightQuadB'),
    uLightShadow: u('uLightShadow'),
    uSunColor: u('uSunColor'),
    uSunDir: u('uSunDir'),
  };

  state = { canvas, gl, program, vao, albedoTex, normalTex, occluderTex, uniforms };
  return state;
}

/**
 * Relight the map and return the engine's canvas holding the composited result.
 * The canvas is reused across calls — draw it out immediately if you need a
 * stable copy. Returns `null` if WebGL2 is unavailable.
 */
export function renderLighting(params: RenderLightingParams): HTMLCanvasElement | null {
  const s = state ?? init();
  if (!s) return null;

  const { gl, program, uniforms } = s;
  const { width, height, scale } = params;

  if (s.canvas.width !== width || s.canvas.height !== height) {
    s.canvas.width = width;
    s.canvas.height = height;
  }

  gl.viewport(0, 0, width, height);
  gl.useProgram(program);
  gl.bindVertexArray(s.vao);

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, FLIP_Y);

  // Bind albedo (unit 0) + normal (unit 1). Re-upload the pixel data only when
  // the buffers changed; otherwise reuse the textures already bound from the
  // last draw (the cheap relight path — see LightLayer.relight).
  const upload = params.uploadBuffers ?? true;

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, s.albedoTex);
  if (upload) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, params.albedo);
  gl.uniform1i(uniforms.uAlbedo, 0);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, s.normalTex);
  if (upload) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, params.normal);
  gl.uniform1i(uniforms.uNormal, 1);

  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, s.occluderTex);
  if (upload) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, params.occluder);
  gl.uniform1i(uniforms.uOccluder, 2);

  gl.uniform2f(uniforms.uResolution, width, height);

  const [ar, ag, ab] = params.ambientColor;
  const ai = params.ambientIntensity;
  gl.uniform3f(uniforms.uAmbient, ar * ai, ag * ai, ab * ai);

  // Pack lights (world coords → buffer-pixel space via scale). Cap + cull.
  const lights = params.lights.slice(0, MAX_LIGHTS);
  const n = lights.length;
  const pos = new Float32Array(MAX_LIGHTS * 2);
  const col = new Float32Array(MAX_LIGHTS * 3);
  const rad = new Float32Array(MAX_LIGHTS);
  const zs = new Float32Array(MAX_LIGHTS);
  const inten = new Float32Array(MAX_LIGHTS);
  const types = new Int32Array(MAX_LIGHTS);
  const dir = new Float32Array(MAX_LIGHTS * 2);
  const coneCos = new Float32Array(MAX_LIGHTS * 2);
  const quadA = new Float32Array(MAX_LIGHTS * 4);
  const quadB = new Float32Array(MAX_LIGHTS * 4);
  const shadow = new Float32Array(MAX_LIGHTS);
  for (let i = 0; i < n; i++) {
    const l = lights[i];
    pos[i * 2] = l.x * scale;
    pos[i * 2 + 1] = l.y * scale;
    col[i * 3] = l.color[0];
    col[i * 3 + 1] = l.color[1];
    col[i * 3 + 2] = l.color[2];
    rad[i] = l.radius * scale;
    zs[i] = l.z * scale;
    inten[i] = l.intensity;
    shadow[i] = l.castsShadows === false ? 0 : 1;

    if (l.type === 'spot') {
      types[i] = 1;
      const aRad = ((l.angle ?? 0) * Math.PI) / 180;
      dir[i * 2] = Math.cos(aRad);
      dir[i * 2 + 1] = Math.sin(aRad);
      const halfRad = (((l.coneAngle ?? 60) / 2) * Math.PI) / 180;
      coneCos[i * 2] = Math.cos(halfRad * 0.75); // inner (soft edge start)
      coneCos[i * 2 + 1] = Math.cos(halfRad); // outer
    } else if (l.type === 'area') {
      types[i] = 2;
      // Absolute buffer-space corner positions (center + offset) × scale.
      const half = l.radius / 2;
      const c = l.corners && l.corners.length === 4
        ? l.corners
        : [{ x: -half, y: -half }, { x: half, y: -half }, { x: half, y: half }, { x: -half, y: half }];
      quadA[i * 4] = (l.x + c[0].x) * scale;
      quadA[i * 4 + 1] = (l.y + c[0].y) * scale;
      quadA[i * 4 + 2] = (l.x + c[1].x) * scale;
      quadA[i * 4 + 3] = (l.y + c[1].y) * scale;
      quadB[i * 4] = (l.x + c[2].x) * scale;
      quadB[i * 4 + 1] = (l.y + c[2].y) * scale;
      quadB[i * 4 + 2] = (l.x + c[3].x) * scale;
      quadB[i * 4 + 3] = (l.y + c[3].y) * scale;
    } else {
      types[i] = 0;
    }
  }
  gl.uniform1i(uniforms.uNumLights, n);
  gl.uniform2fv(uniforms.uLightPos, pos);
  gl.uniform3fv(uniforms.uLightColor, col);
  gl.uniform1fv(uniforms.uLightRadius, rad);
  gl.uniform1fv(uniforms.uLightZ, zs);
  gl.uniform1fv(uniforms.uLightIntensity, inten);
  gl.uniform1iv(uniforms.uLightType, types);
  gl.uniform2fv(uniforms.uLightDir, dir);
  gl.uniform2fv(uniforms.uLightConeCos, coneCos);
  gl.uniform4fv(uniforms.uLightQuadA, quadA);
  gl.uniform4fv(uniforms.uLightQuadB, quadB);
  gl.uniform1fv(uniforms.uLightShadow, shadow);

  // Global directional light (sun / moon). Off = black color, so the term
  // contributes nothing. `dir` is normalized here for the shader.
  if (params.sun) {
    const [dx, dy, dz] = params.sun.dir;
    const len = Math.hypot(dx, dy, dz) || 1;
    gl.uniform3f(uniforms.uSunDir, dx / len, dy / len, dz / len);
    gl.uniform3f(uniforms.uSunColor, params.sun.color[0], params.sun.color[1], params.sun.color[2]);
  } else {
    gl.uniform3f(uniforms.uSunDir, 0, 0, 1);
    gl.uniform3f(uniforms.uSunColor, 0, 0, 0);
  }

  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindVertexArray(null);

  return s.canvas;
}

/** Parse "#rrggbb" → linear-ish [r,g,b] in 0..1 (no gamma; good enough here). */
export function hexToRgb01(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [1, 0.85, 0.63];
  const num = parseInt(m[1], 16);
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
}
