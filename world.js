
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { computeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

export const MOBILE = matchMedia('(pointer: coarse)').matches || innerWidth < 800;
// ================= Dimensões reais (metros) =================
const L = 196;                 // distância entre as pontas de dois baluartes
const H = L / 2;
const PERP = L / 8;            // perpendicular de Vauban para o quadrado
const FACE = L * 2 / 7;        // comprimento da face do baluarte
const Y_DITCH = -2;            // fundo do fosso
const Y_TOP = 8;               // topo do terrapleno (10 m acima do fosso)
const Y_SILL = 8.8;            // soleira das canhoneiras
const Y_PARA = 9.6;            // topo do parapeito
const Y_YARD = 0.3;            // pátio interno
const RAMPART = 10, PARA_W = 3, BATTER = 1, DITCH = 22, GLACIS = 8;
const GATE_EDGE = 2, GH = 2.2, G_SPRING = 4, G_TOP = G_SPRING + GH;
const UP = [0, 1, 0];

let seed = 1776;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ================= Traçado =================
const rot = (p, k) => { let x = p.x, z = p.z; for (let i = 0; i < k; i++) [x, z] = [-z, x]; return { x, z }; };
const rot3 = (v, k) => { const r = rot({ x: v[0], z: v[2] }, k); return [r.x, v[1], r.z]; };
const dl = Math.hypot(H, PERP), ux = H / dl, uz = PERP / dl;
const F1 = { x: -H + FACE * ux, z: -H + FACE * uz };
const C1 = { x: F1.x, z: -H + ((H - F1.x) / ux) * uz };
const SIDE = [{ x: -H, z: -H }, F1, C1, { x: -C1.x, z: C1.z }, { x: -F1.x, z: F1.z }];
const TRACE = [], STAR = [];
for (let s = 0; s < 4; s++) {
  for (const p of SIDE) TRACE.push(rot(p, s));
  STAR.push(rot({ x: -H, z: -H }, s), rot({ x: 0, z: -H + PERP }, s));
}
function offsetPoly(pts, d) { // d > 0 = para dentro (polígono anti-horário)
  const n = pts.length;
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    let e0x = p.x - a.x, e0z = p.z - a.z, l0 = Math.hypot(e0x, e0z);
    let e1x = b.x - p.x, e1z = b.z - p.z, l1 = Math.hypot(e1x, e1z);
    const n0 = { x: -e0z / l0, z: e0x / l0 }, n1 = { x: -e1z / l1, z: e1x / l1 };
    const k = d / (1 + n0.x * n1.x + n0.z * n1.z);
    return { x: p.x + (n0.x + n1.x) * k, z: p.z + (n0.z + n1.z) * k };
  });
}
const FOOT = offsetPoly(TRACE, -BATTER);
const PARA = offsetPoly(TRACE, PARA_W);
const INNER = offsetPoly(TRACE, RAMPART);
const COUNTER = offsetPoly(STAR, -DITCH);
const GLACIS_OUT = offsetPoly(COUNTER, -GLACIS);
const N = TRACE.length;
let perimeter = 0;
for (let i = 0; i < N; i++) perimeter += Math.hypot(TRACE[(i + 1) % N].x - TRACE[i].x, TRACE[(i + 1) % N].z - TRACE[i].z);

// ================= Renderer / cena =================
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !MOBILE, powerPreference: 'high-performance' });
renderer.setPixelRatio(MOBILE ? Math.min(devicePixelRatio, 1.25) : Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.6;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xc9d6dc, 700, 2600);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 20000);

const sun = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 26), THREE.MathUtils.degToRad(215));
const sky = new Sky(); sky.scale.setScalar(15000); scene.add(sky);
Object.assign(sky.material.uniforms, {});
sky.material.uniforms.turbidity.value = 5;
sky.material.uniforms.rayleigh.value = 1.4;
sky.material.uniforms.mieCoefficient.value = 0.005;
sky.material.uniforms.mieDirectionalG.value = 0.8;
sky.material.uniforms.sunPosition.value.copy(sun);

const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x5a4a30, 1.1);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffe0b0, 3.2);
dir.position.copy(sun).multiplyScalar(400);
dir.castShadow = true;
dir.shadow.mapSize.set(MOBILE ? 2048 : 4096, MOBILE ? 2048 : 4096);
Object.assign(dir.shadow.camera, { left: -175, right: 175, top: 175, bottom: -175, near: 10, far: 1000 });
dir.shadow.bias = -0.0004; dir.shadow.normalBias = 0.4;
scene.add(dir, dir.target);

// ================= Texturas (Higgsfield) =================
const manager = new THREE.LoadingManager();
manager.onProgress = (_, a, b) => (document.getElementById('lbar').style.width = (100 * a / b) + '%');
const loader = new THREE.TextureLoader(manager);
const maxAniso = renderer.capabilities.getMaxAnisotropy();
function tex(name) {
  const t = loader.load('textures/' + name + '.jpg');
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
  return t;
}
const T = { muralha: tex('muralha'), grama: tex('grama'), estrada: tex('estrada'), patio: tex('patio'), ruina: tex('ruina'), cantaria: tex('cantaria'), rio: tex('rio') };
const mat = (map, extra = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.95, metalness: 0, ...extra });

// ================= Construtor de geometria =================
class GB {
  constructor(tile) { this.tile = tile; this.p = []; this.n = []; this.uv = []; }
  tri(a, b, c, hint) {
    let ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let n = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    const l = Math.hypot(...n); if (l < 1e-9) return;
    n = n.map(v => v / l);
    if (hint && n[0] * hint[0] + n[1] * hint[1] + n[2] * hint[2] < 0) { [b, c] = [c, b]; n = n.map(v => -v); }
    for (const v of [a, b, c]) { this.p.push(...v); this.n.push(...n); this.uv.push(...this.uvFor(v, n)); }
  }
  uvFor(p, n) {
    const t = this.tile;
    if (Math.abs(n[1]) > 0.5) return [p[0] / t, p[2] / t];
    const hx = n[2], hz = -n[0], hl = Math.hypot(hx, hz) || 1;
    return [(p[0] * hx + p[2] * hz) / hl / t, p[1] / t];
  }
  quad(a, b, c, d, hint) { this.tri(a, b, c, hint); this.tri(a, c, d, hint); }
  box(x0, y0, z0, x1, y1, z1) {
    this.quad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], UP);
    this.quad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [0, 0, -1]);
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1]);
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0]);
    this.quad([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [1, 0, 0]);
  }
  fill(contour, holes, y) {
    const v2 = a => a.map(p => new THREE.Vector2(p.x, p.z));
    const c = v2(contour), hs = holes.map(v2);
    const all = [...c, ...hs.flat()];
    for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(c, hs))
      this.tri([all[i].x, y, all[i].y], [all[j].x, y, all[j].y], [all[k].x, y, all[k].y], UP);
  }
  mesh(material, { collide = true, cast = true } = {}) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    const m = new THREE.Mesh(g, material);
    m.castShadow = cast; m.receiveShadow = true;
    if (collide) { g.computeBoundsTree(); colliders.push(m); }
    scene.add(m); return m;
  }
}
const colliders = [];
const B = {
  wall: new GB(3.6), top: new GB(6), grass: new GB(8), yard: new GB(7),
  ruin: new GB(3), sand: new GB(2.2), road: new GB(7), wood: new GB(1),
};
const at = (p, y) => [p.x, y, p.z];
const lerp2 = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
const outN = (a, b) => { const ex = b.x - a.x, ez = b.z - a.z, l = Math.hypot(ex, ez); return [ez / l, 0, -ex / l]; };
const neg = v => v.map(x => -x);
function vface(b, p0, p1, y0, q0, q1, y1, hint) { b.quad(at(p0, y0), at(p1, y0), at(q1, y1), at(q0, y1), hint); }
const cutX = (a, b, x) => ({ x, z: a.z + (b.z - a.z) * (x - a.x) / (b.x - a.x) });

// ================= Muralhas, terrapleno, parapeito =================
const cannons = [];
for (let i = 0; i < N; i++) {
  const j = (i + 1) % N;
  const O0 = TRACE[i], O1 = TRACE[j], Fo0 = FOOT[i], Fo1 = FOOT[j], P0 = PARA[i], P1 = PARA[j], I0 = INNER[i], I1 = INNER[j];
  const on = outN(O0, O1), inn = neg(on);

  if (i === GATE_EDGE) {
    // face externa com abertura do portão
    vface(B.wall, Fo0, cutX(Fo0, Fo1, -GH), Y_DITCH, O0, cutX(O0, O1, -GH), Y_TOP, on);
    vface(B.wall, cutX(Fo0, Fo1, GH), Fo1, Y_DITCH, cutX(O0, O1, GH), O1, Y_TOP, on);
    const f = (Y_YARD - Y_DITCH) / (Y_TOP - Y_DITCH);
    const m0 = lerp2(cutX(Fo0, Fo1, -GH), cutX(O0, O1, -GH), f), m1 = lerp2(cutX(Fo0, Fo1, GH), cutX(O0, O1, GH), f);
    vface(B.wall, cutX(Fo0, Fo1, -GH), cutX(Fo0, Fo1, GH), Y_DITCH, m0, m1, Y_YARD, on);
    // face interna com abertura
    vface(B.wall, I0, cutX(I0, I1, -GH), Y_YARD, I0, cutX(I0, I1, -GH), Y_TOP, inn);
    vface(B.wall, cutX(I0, I1, GH), I1, Y_YARD, cutX(I0, I1, GH), I1, Y_TOP, inn);
    vface(B.wall, cutX(I0, I1, -GH), cutX(I0, I1, GH), G_TOP, cutX(I0, I1, -GH), cutX(I0, I1, GH), Y_TOP, inn);
  } else {
    vface(B.wall, Fo0, Fo1, Y_DITCH, O0, O1, Y_TOP, on);
    vface(B.wall, I0, I1, Y_YARD, I0, I1, Y_TOP, inn);
  }
  // terrapleno (adarve)
  B.top.quad(at(P0, Y_TOP), at(P1, Y_TOP), at(I1, Y_TOP), at(I0, Y_TOP), UP);

  // parapeito: faixa inferior contínua
  vface(B.wall, O0, O1, Y_TOP, O0, O1, Y_SILL, on);
  vface(B.wall, P0, P1, Y_TOP, P0, P1, Y_SILL, inn);
  B.wall.quad(at(O0, Y_SILL), at(O1, Y_SILL), at(P1, Y_SILL), at(P0, Y_SILL), UP);
  // merlões e canhoneiras (só nos baluartes: faces 4 + flancos 3 = 14 por baluarte)
  const k = i % 5, nEmb = k === 2 ? 0 : (k === 0 || k === 4 ? 4 : 3);
  const len = Math.hypot(O1.x - O0.x, O1.z - O0.z), gw = 1.1 / len;
  const dirv = [(O1.x - O0.x) / len, 0, (O1.z - O0.z) / len];
  const segs = []; let st = 0;
  for (let e = 1; e <= nEmb; e++) {
    const c = e / (nEmb + 1); segs.push([st, c - gw / 2]); st = c + gw / 2;
    const mid = lerp2(lerp2(O0, O1, c), lerp2(P0, P1, c), 0.5);
    cannons.push({ x: mid.x + inn[0] * 3.2, z: mid.z + inn[2] * 3.2, yaw: Math.atan2(on[0], on[2]) });
  }
  segs.push([st, 1]);
  for (const [t0, t1] of segs) {
    const o0 = lerp2(O0, O1, t0), o1 = lerp2(O0, O1, t1), p0 = lerp2(P0, P1, t0), p1 = lerp2(P0, P1, t1);
    vface(B.wall, o0, o1, Y_SILL, o0, o1, Y_PARA, on);
    vface(B.wall, p0, p1, Y_SILL, p0, p1, Y_PARA, inn);
    B.top.quad(at(o0, Y_PARA), at(o1, Y_PARA), at(p1, Y_PARA), at(p0, Y_PARA), UP);
    if (t0 > 0) B.wall.quad(at(o0, Y_SILL), at(p0, Y_SILL), at(p0, Y_PARA), at(o0, Y_PARA), neg(dirv));
    if (t1 < 1) B.wall.quad(at(o1, Y_SILL), at(p1, Y_SILL), at(p1, Y_PARA), at(o1, Y_PARA), dirv);
  }
}

// ================= Portão principal (túnel abobadado + frontispício) =================
const zF = FOOT[GATE_EDGE].z, zI = INNER[GATE_EDGE].z, zFront = zF - 1.6;
B.sand.quad([-GH, Y_YARD, zF], [-GH, Y_YARD, zI], [-GH, G_SPRING, zI], [-GH, G_SPRING, zF], [1, 0, 0]);
B.sand.quad([GH, Y_YARD, zF], [GH, Y_YARD, zI], [GH, G_SPRING, zI], [GH, G_SPRING, zF], [-1, 0, 0]);
for (let s = 0, S = 14; s < S; s++) {
  const a0 = Math.PI - s * Math.PI / S, a1 = Math.PI - (s + 1) * Math.PI / S, am = (a0 + a1) / 2;
  const x0 = GH * Math.cos(a0), y0 = G_SPRING + GH * Math.sin(a0), x1 = GH * Math.cos(a1), y1 = G_SPRING + GH * Math.sin(a1);
  B.sand.quad([x0, y0, zF], [x1, y1, zF], [x1, y1, zI], [x0, y0, zI], [-Math.cos(am), -Math.sin(am), 0]);
  B.wall.quad([x0, y0, zI], [x1, y1, zI], [x1, G_TOP, zI], [x0, G_TOP, zI], [0, 0, 1]);
}
B.sand.quad([-GH, Y_YARD, zFront], [GH, Y_YARD, zFront], [GH, Y_YARD, zI], [-GH, Y_YARD, zI], UP);
{
  const PW = 4.8, PT = 10.2;
  const shape = new THREE.Shape();
  shape.moveTo(-PW, Y_YARD); shape.lineTo(-GH, Y_YARD); shape.lineTo(-GH, G_SPRING);
  shape.absarc(0, G_SPRING, GH, Math.PI, 0, true);
  shape.lineTo(GH, Y_YARD); shape.lineTo(PW, Y_YARD); shape.lineTo(PW, PT); shape.lineTo(-PW, PT); shape.closePath();
  const tri = new THREE.Shape(); tri.moveTo(-PW - 0.4, PT + 0.45); tri.lineTo(PW + 0.4, PT + 0.45); tri.lineTo(0, PT + 2.6); tri.closePath();
  const sandT = tex('cantaria'); sandT.repeat.set(1 / 2.2, 1 / 2.2);
  const sandMat = mat(sandT);
  for (const [shp, depth] of [[shape, 1.6], [tri, 1.9]]) {
    const g = new THREE.ExtrudeGeometry(shp, { depth, bevelEnabled: false, curveSegments: 18 });
    g.translate(0, 0, zFront - (depth - 1.6) / 2);
    g.computeBoundsTree();
    const m = new THREE.Mesh(g, sandMat); m.castShadow = m.receiveShadow = true; scene.add(m); colliders.push(m);
  }
  const zf = zFront;
  // pilastras, cornija, moldura do arco e placa
  B.sand.box(-4.3, Y_YARD, zf - 0.3, -3.3, 9.4, zf);
  B.sand.box(3.3, Y_YARD, zf - 0.3, 4.3, 9.4, zf);
  B.sand.box(-PW - 0.4, 9.4, zf - 0.45, PW + 0.4, 9.85, zf + 1.6);
  B.sand.box(-PW - 0.4, PT, zf - 0.45, PW + 0.4, PT + 0.45, zf + 1.6);
  B.sand.box(-GH - 0.5, G_SPRING - 0.25, zf - 0.15, -GH, G_SPRING + 0.1, zf);
  B.sand.box(GH, G_SPRING - 0.25, zf - 0.15, GH + 0.5, G_SPRING + 0.1, zf);
  B.sand.box(-1.5, 7.0, zf - 0.12, 1.5, 8.6, zf);
  B.sand.box(-0.35, G_TOP - 0.1, zf - 0.2, 0.35, G_TOP + 0.6, zf); // fecho do arco
  B.sand.box(-PW, Y_YARD, zf - 0.4, PW, Y_YARD + 0.5, zf);         // embasamento
}
// folhas do portão abertas
B.wood.box(-GH + 0.05, Y_YARD, zF + 0.6, -GH + 0.2, G_SPRING + 0.8, zF + 2.8);
B.wood.box(GH - 0.2, Y_YARD, zF + 0.6, GH - 0.05, G_SPRING + 0.8, zF + 2.8);

// ponte: trecho fixo de madeira até um pilar de cantaria no meio do fosso + tabuleiro levadiço
const bridgeEnd = GLACIS_OUT[1].z - 2;
const DECK_L = 12, zHinge = zFront - 0.4, zPier = zHinge - DECK_L;
{
  const z0 = zPier + 0.3, z1 = bridgeEnd, w = 2.6;
  B.wood.box(-w, Y_YARD - 0.25, z1, w, Y_YARD, z0);
  for (let z = z0 - 1; z > z1; z -= 4) for (const x of [-w + 0.2, w - 0.2]) {
    B.wood.box(x - 0.15, Y_DITCH - 0.5, z - 0.15, x + 0.15, Y_YARD - 0.25, z + 0.15);
    B.wood.box(x - 0.08, Y_YARD, z - 0.08, x + 0.08, Y_YARD + 1.1, z + 0.08);
  }
  for (const x of [-w + 0.2, w - 0.2]) B.wood.box(x - 0.07, Y_YARD + 1.0, z1, x + 0.07, Y_YARD + 1.15, z0);
  B.sand.box(-3.4, Y_DITCH, zPier - 1.6, 3.4, Y_YARD, zPier + 0.5); // pilar de apoio do tabuleiro
}

// ================= Pátio, rampas, fosso, glacis, terreno =================
{ // pátio: quadrado central + leque a partir da ponta de cada baluarte
  const c = INNER[GATE_EDGE].z;
  B.yard.quad([c, Y_YARD, c], [-c, Y_YARD, c], [-c, Y_YARD, -c], [c, Y_YARD, -c], UP);
  for (let s = 0; s < 4; s++) {
    const I = k => INNER[(5 * s + k + N) % N], corner = rot({ x: c, z: c }, s);
    const ring = [I(1), I(2), corner, I(-2), I(-1)], tip = at(I(0), Y_YARD);
    for (let k = 0; k < ring.length - 1; k++) B.yard.tri(tip, at(ring[k], Y_YARD), at(ring[k + 1], Y_YARD), UP);
  }
}
B.grass.fill(COUNTER, [FOOT], Y_DITCH);
for (let i = 0; i < COUNTER.length; i++) {
  const j = (i + 1) % COUNTER.length;
  B.grass.quad(at(COUNTER[i], Y_DITCH), at(COUNTER[j], Y_DITCH), at(GLACIS_OUT[j], 0), at(GLACIS_OUT[i], 0), UP);
}
const RIVER_X0 = 200, RIVER_X1 = 560, EXT = 2600;
const rect = (x0, z0, x1, z1) => [{ x: x0, z: z0 }, { x: x1, z: z0 }, { x: x1, z: z1 }, { x: x0, z: z1 }];
B.grass.fill(rect(-EXT, -EXT, RIVER_X0, EXT), [GLACIS_OUT], 0);
B.grass.quad([RIVER_X0, 0, -EXT], [RIVER_X0 + 30, -4.5, -EXT], [RIVER_X0 + 30, -4.5, EXT], [RIVER_X0, 0, EXT], UP);
B.road.fill(rect(RIVER_X0 + 30, -EXT, RIVER_X1 - 30, EXT), [], -4.5);
B.grass.quad([RIVER_X1 - 30, -4.5, -EXT], [RIVER_X1, 0, -EXT], [RIVER_X1, 0, EXT], [RIVER_X1 - 30, -4.5, EXT], UP);
B.grass.fill(rect(RIVER_X1, -EXT, EXT, EXT), [], 0);

// rampas de acesso ao terrapleno (uma por cortina)
for (let s = 0; s < 4; s++) {
  const zi = INNER[GATE_EDGE].z, zo = zi + 4.5, xa = 12, xb = 12 + (Y_TOP - Y_YARD) * 3.6;
  const P = (x, y, z) => rot3([x, y, z], s), hint = v => rot3(v, s);
  B.wall.quad(P(xa, Y_TOP, zi), P(xb, Y_YARD, zi), P(xb, Y_YARD, zo), P(xa, Y_TOP, zo), hint(UP));
  B.wall.tri(P(xa, Y_YARD, zo), P(xb, Y_YARD, zo), P(xa, Y_TOP, zo), hint([0, 0, 1]));
  B.wall.quad(P(xa, Y_YARD, zi), P(xa, Y_YARD, zo), P(xa, Y_TOP, zo), P(xa, Y_TOP, zi), hint([-1, 0, 0]));
}

// estradas de terra
B.road.fill(rect(-EXT, -200, RIVER_X0, -186), [], 0.04);
B.road.fill(rect(0, -112, RIVER_X0, -104), [], 0.04); // estrada do porto
B.road.fill(rect(-3.2, -186, 3.2, bridgeEnd + 1), [], 0.04);
B.road.fill(rect(-380, -186, -368, 600), [], 0.04);

// ================= Edifícios internos em ruínas =================
function rbox(x0, y0, z0, x1, y1, z1, s) {
  const a = rot({ x: x0, z: z0 }, s), b = rot({ x: x1, z: z1 }, s);
  B.ruin.box(Math.min(a.x, b.x), y0, Math.min(a.z, b.z), Math.max(a.x, b.x), y1, Math.max(a.z, b.z));
}
function ruinWall(axis, a0, a1, c, th, openings, hBase, s) {
  const put = (u0, u1, y0, y1) => {
    if (y1 - y0 < 0.05 || u1 - u0 < 0.05) return;
    if (axis === 'x') rbox(u0, Y_YARD + y0, c - th / 2, u1, Y_YARD + y1, c + th / 2, s);
    else rbox(c - th / 2, Y_YARD + y0, u0, c + th / 2, Y_YARD + y1, u1, s);
  };
  const solids = []; let u = a0;
  for (const o of openings) { solids.push([u, o.c - o.w / 2]); u = o.c + o.w / 2; }
  solids.push([u, a1]);
  for (const [s0, s1] of solids) {
    let x = s0;
    while (x < s1 - 0.01) {
      const w = Math.min(s1 - x, 1.2 + rnd() * 1.4);
      const nearOpening = (x === s0 && s0 !== a0) || (x + w >= s1 - 0.01 && s1 !== a1);
      const h = !nearOpening && rnd() < 0.22 ? hBase * (0.3 + rnd() * 0.45) : hBase - rnd() * 0.5;
      put(x, x + w, 0, h); x += w;
    }
  }
  for (const o of openings) {
    put(o.c - o.w / 2, o.c + o.w / 2, 0, o.y0);
    if (rnd() > 0.15) put(o.c - o.w / 2, o.c + o.w / 2, o.y1, Math.max(o.y1 + 0.5, hBase - rnd() * 0.6));
  }
}
function gable(x, z0, z1, th, y, s) {
  const zm = (z0 + z1) / 2, yt = y + 2.4, P = (a, b, c) => rot3([a, b, c], s);
  for (const [xx, hx] of [[x - th / 2, -1], [x + th / 2, 1]])
    B.ruin.tri(P(xx, y, z0), P(xx, y, z1), P(xx, yt, zm), rot3([hx, 0, 0], s));
  B.ruin.quad(P(x - th / 2, y, z0), P(x + th / 2, y, z0), P(x + th / 2, yt, zm), P(x - th / 2, yt, zm), rot3([0, 0.7, -0.7], s));
  B.ruin.quad(P(x - th / 2, y, z1), P(x + th / 2, y, z1), P(x + th / 2, yt, zm), P(x - th / 2, yt, zm), rot3([0, 0.7, 0.7], s));
}
// ---- Planta de 1780 + levantamento do IPHAN: edifícios ao redor da Praça d'Armas e na "linha de trás"
const BUILDINGS = [];
function building(name, x0, z0, x1, z1, o = {}) {
  const th = 0.7, rooms = o.rooms || 1, hB = o.h || 4.4 + rnd() * 0.8, door = o.door || '-z', long = (x1 - x0) >= (z1 - z0);
  const rec = { name, x0, z0, x1, z1, doorSide: door }; BUILDINGS.push(rec);
  let dc = 0;
  const along = (a0, a1, isDoor) => {
    const n = Math.max(1, Math.round((a1 - a0) / 4)), out = [];
    for (let i = 0; i < n; i++) {
      const c = a0 + (a1 - a0) * (i + 0.5) / n;
      if (isDoor && i === Math.floor(n / 2)) dc = c;
      out.push(isDoor && i === Math.floor(n / 2) ? { c, w: 1.3, y0: 0, y1: 2.7 } : { c, w: 0.9, y0: 1.1, y1: 2.4 });
    }
    return out;
  };
  ruinWall('x', x0, x1, z0 + th / 2, th, along(x0 + th, x1 - th, door === '-z'), hB, 0);
  ruinWall('x', x0, x1, z1 - th / 2, th, along(x0 + th, x1 - th, door === '+z'), hB, 0);
  ruinWall('z', z0 + th, z1 - th, x0 + th / 2, th, along(z0 + th, z1 - th, door === '-x'), hB, 0);
  ruinWall('z', z0 + th, z1 - th, x1 - th / 2, th, along(z0 + th, z1 - th, door === '+x'), hB, 0);
  rec.door = door === '-z' ? { x: dc, z: z0 + th / 2, ax: 'x' } : door === '+z' ? { x: dc, z: z1 - th / 2, ax: 'x' } : door === '-x' ? { x: x0 + th / 2, z: dc, ax: 'z' } : { x: x1 - th / 2, z: dc, ax: 'z' };
  for (let i = 1; i < rooms; i++) {
    if (long) ruinWall('z', z0 + th, z1 - th, x0 + (x1 - x0) * i / rooms, th * 0.85, [{ c: (z0 + z1) / 2, w: 1.1, y0: 0, y1: 2.5 }], hB * 0.92, 0);
    else ruinWall('x', x0 + th, x1 - th, z0 + (z1 - z0) * i / rooms, th * 0.85, [{ c: (x0 + x1) / 2, w: 1.1, y0: 0, y1: 2.5 }], hB * 0.92, 0);
  }
  if (long && o.gable !== false) for (const xx of [x0 + th / 2, x1 - th / 2]) if (rnd() > 0.3) gable(xx, z0, z1, th, Y_YARD + hB - 0.3, 0);
}
// em torno da Praça d'Armas
building('Capela', -44, -6, -29, 6, { door: '+x', h: 5.8 });
B.ruin.box(-30.4, Y_YARD + 5.5, -1.2, -29.6, Y_YARD + 9.2, 1.2); // espadana do sino
building('Botica e casa do boticário', -40, 10, -30, 28, { door: '+x', rooms: 3 });
building('Residência do governador', -10, 28, 10, 40, { door: '-z', rooms: 4, h: 5.6 });
building('Casa do cirurgião e do capelão', 14, 28, 26, 38, { door: '-z', rooms: 2 });
building('Quartel de oficiais I', 29, -28, 39, -17, { door: '-x', rooms: 3 });
building('Quartel de oficiais II', 29, -15, 39, -4, { door: '-x', rooms: 3 });
building('Quartel de oficiais III', 29, -2, 39, 9, { door: '-x', rooms: 3 });
building('Quartel de oficiais IV', -32, -40, -14, -31, { door: '+z', rooms: 4 });
building('Quartel de oficiais V (parque de artilharia)', 12, -40, 32, -31, { door: '+z', rooms: 7, h: 5.2 });
// linha de trás, junto às cortinas
building('Hospital', -50, 10, -42, 44, { door: '+x', rooms: 4, h: 5 });
building('Armazém de mantimentos', -10, 42, 0, 50, { door: '-z', rooms: 2 });
building('Armazém de petrechos e armamentos', 0, 42, 10, 50, { door: '-z', rooms: 1 });
building('Alojamento de soldados I', 42, -44, 50, -30, { door: '-x', rooms: 3, h: 4 });
building('Alojamento de soldados II', 42, -28, 50, -14, { door: '-x', rooms: 3, h: 4 });
building('Alojamento de soldados III', 42, -12, 50, 2, { door: '-x', rooms: 3, h: 4 });
building('Alojamento de soldados IV', 14, 42, 36, 50, { door: '-z', rooms: 4, h: 4 });
// junto ao portão
building('Calabouço', -11, -47, -5, -40, { door: '+x', h: 3.6 });
building('Corpo de guarda', 5, -47, 11, -40, { door: '-x', h: 3.6 });
building('Latrina', -50, 46, -45, 50, { door: '+x', h: 2.2, gable: false });
// cisterna na praça
for (const [x0, z0, x1, z1] of [[17.5, 6, 22.5, 6.6], [17.5, 11.4, 22.5, 12], [17.5, 6.6, 18.1, 11.4], [21.9, 6.6, 22.5, 11.4]])
  B.sand.box(x0, Y_YARD, z0, x1, Y_YARD + 0.8, z1);
BUILDINGS.push({ name: 'Cisterna', x0: 17, z0: 5.5, x1: 23, z1: 12.5 });
// casa de pólvora, fora das muralhas
building('Casa de pólvora (extramuros)', 134, 36, 142, 44, { door: '-x', h: 3.6, gable: false });

// mastro e bandeira na praça d'armas
B.wood.box(-0.12, Y_YARD, -0.12, 0.12, Y_YARD + 14, 0.12);
B.sand.box(-1.2, Y_YARD, -1.2, 1.2, Y_YARD + 0.6, 1.2);
{
  const c = document.createElement('canvas'); c.width = 300; c.height = 210;
  const g = c.getContext('2d');
  g.fillStyle = '#f2ede0'; g.fillRect(0, 0, 300, 210);
  g.strokeStyle = '#1b3a8a'; g.lineWidth = 8; g.strokeRect(8, 8, 284, 194);
  g.fillStyle = '#b3202a'; g.beginPath(); g.moveTo(105, 55); g.lineTo(195, 55); g.lineTo(195, 120); g.quadraticCurveTo(195, 160, 150, 175); g.quadraticCurveTo(105, 160, 105, 120); g.fill();
  g.fillStyle = '#f2ede0'; g.beginPath(); g.moveTo(120, 70); g.lineTo(180, 70); g.lineTo(180, 118); g.quadraticCurveTo(180, 148, 150, 160); g.quadraticCurveTo(120, 148, 120, 118); g.fill();
  g.fillStyle = '#1b3a8a'; for (const [x, y] of [[150, 85], [150, 135], [133, 110], [167, 110]]) g.fillRect(x - 9, y - 9, 18, 18);
  g.fillStyle = '#d9a82b'; g.fillRect(122, 36, 56, 14);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.1, 12, 1), new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.8 }));
  flag.position.set(1.6, Y_YARD + 12.8, 0); flag.castShadow = true; scene.add(flag);
  window.__flag = flag;
}

// ================= Materiais e malhas =================
B.wall.mesh(mat(T.muralha));
B.top.mesh(mat(T.grama), { cast: false });
B.grass.mesh(mat(T.grama), { cast: false });
B.yard.mesh(mat(T.patio), { cast: false });
B.ruin.mesh(mat(T.ruina));
B.sand.mesh(mat(T.cantaria));
B.road.mesh(mat(T.estrada), { cast: false });
const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 0.9 });
B.wood.mesh(woodMat);

// ponte levadiça: tabuleiro articulado no portão, com flechas e correntes
const bridge = { group: new THREE.Group(), angle: 0, target: 0, deck: null, chains: [], tips: [] };
bridge.group.position.set(0, Y_YARD, zHinge);
{
  const d = new GB(1), w = 2.6;
  d.box(-w, -0.3, -DECK_L, w, 0, 0);
  for (const x of [-w + 0.1, w - 0.1]) {
    d.box(x - 0.07, 1.0, -DECK_L, x + 0.07, 1.15, 0);
    for (let z = -0.2; z > -DECK_L; z -= 3) d.box(x - 0.08, 0, z - 0.08, x + 0.08, 1.1, z + 0.08);
  }
  for (let z = -1; z > -DECK_L; z -= 1.5) d.box(-w, 0, z - 0.04, w, 0.06, z + 0.04); // tábuas
  bridge.deck = d.mesh(woodMat);
  bridge.group.add(bridge.deck);
  scene.add(bridge.group);
  const chainM = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, metalness: 0.7, roughness: 0.5 });
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 2.6), woodMat);
    arm.position.set(sx * 3.4, 9.2, zFront - 1.8); arm.castShadow = true; scene.add(arm);
    const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 5), chainM); ch.castShadow = true; scene.add(ch);
    bridge.chains.push(ch); bridge.tips.push([sx, new THREE.Vector3(sx * 3.4, 9.2, zFront - 3.1)]);
  }
}
const _up = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3(), _e = new THREE.Vector3();
function placeChains() {
  bridge.group.updateMatrixWorld(true);
  bridge.chains.forEach((ch, i) => {
    const [sx, tip] = bridge.tips[i];
    _e.set(sx * 2.4, 0.3, -DECK_L); bridge.group.localToWorld(_e);
    _d.copy(_e).sub(tip);
    ch.position.copy(tip).addScaledVector(_d, 0.5); ch.scale.set(1, _d.length(), 1);
    ch.quaternion.setFromUnitVectors(_up, _d.normalize());
  });
}
placeChains();
function toggleBridge() { bridge.target = bridge.target ? 0 : 1.35; }
function updateBridge(dt) {
  const diff = bridge.target - bridge.angle;
  if (Math.abs(diff) < 1e-4) return;
  bridge.angle += Math.sign(diff) * Math.min(Math.abs(diff), dt * 0.5);
  bridge.group.rotation.x = bridge.angle;
  placeChains();
  const solid = bridge.angle < 0.25, i = colliders.indexOf(bridge.deck);
  if (solid && i < 0) colliders.push(bridge.deck); else if (!solid && i >= 0) colliders.splice(i, 1);
}

// senzalas, engenho e roças fora das muralhas
{
  const mudM = new THREE.MeshStandardMaterial({ color: 0xa88458, roughness: 1 });
  const thatchM = new THREE.MeshStandardMaterial({ color: 0x8c7a3c, roughness: 1, flatShading: true });
  const tileM = new THREE.MeshStandardMaterial({ color: 0x9c4a2c, roughness: 0.9, flatShading: true });
  const house = (x, z, w, d, h, roofM, roofH) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mudM); b.position.set(x, h / 2, z);
    const r = new THREE.Mesh(new THREE.ConeGeometry(1, roofH, 4), roofM);
    r.rotation.y = Math.PI / 4; r.scale.set((w + 1) / Math.SQRT2, 1, (d + 1) / Math.SQRT2); r.position.set(x, h + roofH / 2, z);
    b.castShadow = r.castShadow = b.receiveShadow = true; scene.add(b, r);
  };
  for (let i = 0; i < 10; i++) house(134 + (i % 5) * 9 + rnd() * 2, -22 + Math.floor(i / 5) * 12 + rnd() * 2, 4, 3, 2.2, thatchM, 1.8);
  house(-165, 70, 16, 10, 4.5, tileM, 3);
  const soil = tex('patio'); soil.repeat.set(10, 7);
  for (const [x, z] of [[110, -165], [-210, -70], [-175, 130]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshStandardMaterial({ map: soil, color: 0xb98a6a, roughness: 1 }));
    p.rotation.x = -Math.PI / 2; p.position.set(x, 0.05, z); p.receiveShadow = true; scene.add(p);
  }
}

// rio Guaporé
const water = new THREE.Mesh(new THREE.PlaneGeometry(RIVER_X1 - RIVER_X0, EXT * 2), mat(T.rio, { roughness: 0.25, transparent: true, opacity: 0.93 }));
water.rotation.x = -Math.PI / 2; water.position.set((RIVER_X0 + RIVER_X1) / 2, -2.2, 0); water.receiveShadow = true;
T.rio.repeat.set((RIVER_X1 - RIVER_X0) / 25, EXT * 2 / 25);
scene.add(water);

// fosso alimentado pelas águas do rio
{
  const mt = tex('rio');
  const wb = new GB(12);
  wb.fill(offsetPoly(COUNTER, -3), [FOOT], -1.15);
  wb.mesh(new THREE.MeshStandardMaterial({ map: mt, color: 0xffffff, emissive: 0x2a3a24, roughness: 0.3, transparent: true, opacity: 0.92 }), { collide: false, cast: false });
  window.__moatTex = mt;
}

// canhões (instanciados) nas canhoneiras
{
  const barrelG = new THREE.CylinderGeometry(0.15, 0.21, 2.5, 14); barrelG.rotateX(Math.PI / 2);
  const carG = new THREE.BoxGeometry(0.85, 0.55, 1.6);
  const barrels = new THREE.InstancedMesh(barrelG, new THREE.MeshStandardMaterial({ color: 0x2a2826, metalness: 0.6, roughness: 0.5 }), cannons.length);
  const cars = new THREE.InstancedMesh(carG, new THREE.MeshStandardMaterial({ color: 0x5a3c22, roughness: 0.9 }), cannons.length);
  const d = new THREE.Object3D();
  cannons.forEach((c, i) => {
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    d.rotation.set(0, c.yaw, 0);
    d.position.set(c.x, Y_TOP + 0.3, c.z); d.updateMatrix(); cars.setMatrixAt(i, d.matrix);
    d.rotation.set(-0.05, c.yaw, 0);
    d.position.set(c.x + fx * 0.6, Y_TOP + 0.8, c.z + fz * 0.6); d.updateMatrix(); barrels.setMatrixAt(i, d.matrix);
  });
  for (const m of [barrels, cars]) { m.castShadow = m.receiveShadow = true; scene.add(m); }
}

// ================= Vegetação =================
const roadZ = -193;
function blocked(x, z, r) {
  if (Math.hypot(x, z) < r) return true;
  if (x > RIVER_X0 - 25 && x < RIVER_X1 + 15) return true;
  if (Math.abs(z - roadZ) < 14 && x < RIVER_X0) return true;
  if (Math.abs(x + 374) < 12 && z > -200 && z < 600) return true;
  if (Math.abs(z + 108) < 16 && x > -10 && x < RIVER_X0 + 30) return true;
  return false;
}
{
  const COUNT = MOBILE ? 2600 : 6500;
  const canopyG = new THREE.IcosahedronGeometry(1, 1);
  const trunkG = new THREE.CylinderGeometry(0.25, 0.4, 1, 6); trunkG.translate(0, 0.5, 0);
  const canopy = new THREE.InstancedMesh(canopyG, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), COUNT * 2);
  const trunks = new THREE.InstancedMesh(trunkG, new THREE.MeshStandardMaterial({ color: 0x8a7a66, roughness: 1 }), COUNT);
  const d = new THREE.Object3D(), col = new THREE.Color();
  let n = 0, nt = 0;
  for (let tries = 0; nt < COUNT && tries < COUNT * 6; tries++) {
    const a = rnd() * Math.PI * 2, r = 250 + Math.pow(rnd(), 0.7) * 1250;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (blocked(x, z, 245)) continue;
    const th = 8 + rnd() * 12, cr = 5.5 + rnd() * 5;
    d.position.set(x, 0, z); d.rotation.set(0, 0, 0); d.scale.set(1 + cr / 8, th, 1 + cr / 8); d.updateMatrix(); trunks.setMatrixAt(nt++, d.matrix);
    for (let k = 0; k < 2; k++) {
      d.position.set(x + (rnd() - 0.5) * cr, th + (k ? cr * 0.4 : 0), z + (rnd() - 0.5) * cr);
      d.rotation.set(rnd(), rnd(), rnd());
      d.scale.set(cr * (1 - k * 0.3), cr * (0.7 - k * 0.15), cr * (1 - k * 0.3)); d.updateMatrix();
      canopy.setMatrixAt(n, d.matrix);
      const ipe = rnd() < 0.05;
      col.setHSL(ipe ? 0.14 : 0.22 + rnd() * 0.1, ipe ? 0.85 : 0.45 + rnd() * 0.25, ipe ? 0.5 : 0.18 + rnd() * 0.14);
      canopy.setColorAt(n++, col);
    }
  }
  canopy.count = n; trunks.count = nt;
  scene.add(canopy, trunks);
  // algumas palmeiras isoladas perto do forte
  const palmLeaf = new THREE.ConeGeometry(3.2, 1.6, 7, 1, true); palmLeaf.translate(0, -0.6, 0);
  const pm = new THREE.MeshStandardMaterial({ color: 0x3f6a2a, roughness: 1, side: THREE.DoubleSide, flatShading: true });
  const tm = new THREE.MeshStandardMaterial({ color: 0x7d6d5a, roughness: 1 });
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2, r = 150 + rnd() * 90, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (blocked(x, z, 145)) continue;
    const h = 8 + rnd() * 6;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, h, 6), tm); t.position.set(x, h / 2, z);
    const l = new THREE.Mesh(palmLeaf, pm); l.position.set(x, h, z);
    t.castShadow = l.castShadow = true; scene.add(t, l);
  }
}
// linha de floresta no horizonte (textura Higgsfield com recorte do fundo)
{
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height), px = d.data;
    for (let i = 0; i < px.length; i += 4) {
      const mn = Math.min(px[i], px[i + 1], px[i + 2]), mx = Math.max(px[i], px[i + 1], px[i + 2]);
      if (mn > 200 && mx - mn < 40) px[i + 3] = Math.max(0, Math.min(255, (235 - mn) * 8));
    }
    g.putImageData(d, 0, 0);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
    for (const [r, h, rep, off] of [[1500, 110, 18, 0], [1150, 80, 14, 0.37]]) {
      const tt = t.clone(); tt.repeat.set(rep, 1); tt.offset.x = off; tt.needsUpdate = true;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 96, 1, true),
        new THREE.MeshStandardMaterial({ map: tt, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1 }));
      m.position.y = h / 2 - 3; scene.add(m);
    }
  };
  img.src = 'textures/floresta.jpg';
}
// vila (casas simples ao longo da estrada)
{
  const wallM = new THREE.MeshStandardMaterial({ color: 0xe9e2d4, roughness: 0.9 });
  const roofM = new THREE.MeshStandardMaterial({ color: 0x9c4a2c, roughness: 0.85 });
  for (let i = 0; i < 22; i++) {
    const side = i % 2 ? 1 : -1, x = -460 - Math.floor(i / 2) * 26 - rnd() * 8, z = roadZ + side * (16 + rnd() * 6);
    const w = 7 + rnd() * 4, dpt = 6 + rnd() * 3, h = 3;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, dpt), wallM); b.position.set(x, h / 2, z);
    const r = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(w, dpt) / 2 + 0.4, 2, 4), roofM);
    r.rotation.y = Math.PI / 4; r.scale.set(w / Math.hypot(w, dpt) * 1.42, 1, dpt / Math.hypot(w, dpt) * 1.42);
    r.position.set(x, h + 1, z);
    b.castShadow = r.castShadow = true; b.receiveShadow = true; scene.add(b, r);
  }
}


// ---- atualização por quadro e exportações para o jogo
export function updateWorld(t, dt) {
  T.rio.offset.y += dt * 0.004;
  if (window.__moatTex) window.__moatTex.offset.x += dt * 0.002;
  if (window.__flag) window.__flag.rotation.y = Math.sin(t * 1.3) * 0.25;
  updateBridge(dt);
}
export const FLAG = () => window.__flag;
export {
  THREE, scene, camera, renderer, canvas, colliders, manager, T, sky, dir, hemi, sun, mat, GB, B,
  BUILDINGS, TRACE, INNER, COUNTER, GLACIS_OUT, FOOT, STAR, rot, rot3, offsetPoly,
  Y_YARD, Y_TOP, Y_DITCH, Y_SILL, zFront, zHinge, zPier, bridgeEnd, DECK_L, bridge, toggleBridge,
  RIVER_X0, RIVER_X1, GATE_EDGE, GH, L, H, cannons, rnd,
};
