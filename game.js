// Motor do jogo: mundo 3D + sprites 2D estilo Doom, diálogos, inventário, missões e minigames.
import * as W from './world.js';
import { S, G, has, f, setf, fresh } from './state.js';
import { ITEMS, NPCS, NODES, INFO, EXAMINE, DOORS, FINALE, EPILOGUE, CREDITS, TITLE, objective, checklist, PLANTA_TEXT } from './data.js';
import { MG } from './minigames.js';
import { sfx, startAmbient, setSound, soundOn } from './audio.js';

const { THREE, scene, camera, renderer, colliders } = W;
const $ = id => document.getElementById(id);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const BLD = {}; W.BUILDINGS.forEach(b => { BLD[b.name] = b; });
const flr = b => (b.x0 > 100 ? 0 : W.Y_YARD);
const inside = (name, fx, fz) => { const b = BLD[name]; return V3(b.x0 + (b.x1 - b.x0) * fx, flr(b), b.z0 + (b.z1 - b.z0) * fz); };
const resolvePos = p => p.b ? inside(p.b, p.fx, p.fz) : V3(p.x, p.y === 'top' ? W.Y_TOP : p.y, p.z);
const SAVE_KEY = 'forte.principe.save.v1';
let running = false, paused = false, inMG = false, inDialog = false, inCard = false, mode = 'title';

// =============================================================== sprites
const SPRITES = ['ricardo', 'melo', 'soldado', 'pedestre', 'pedreiro', 'lavrador', 'inacio', 'almoxarife', 'boticario', 'padre', 'cozinheira', 'tiago', 'governador', 'alfaiate', 'pescador'];
const texs = {};
const texLoader = new THREE.TextureLoader();
const loadSprites = () => Promise.all(SPRITES.map(n => new Promise(res => texLoader.load(`sprites/${n}.webp`, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; texs[n] = t; res(); }, undefined, () => res()))));
const shadowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 4, 32, 32, 30); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
function iconTex(ch, bg, fg = '#2a1a08') {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 10, 64, 64, 62); gr.addColorStop(0, bg); gr.addColorStop(1, 'rgba(255,211,107,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.fillStyle = bg; g.beginPath(); g.arc(64, 64, 34, 0, 7); g.fill(); g.strokeStyle = '#fff6d8'; g.lineWidth = 4; g.stroke();
  g.fillStyle = fg; g.font = 'bold 48px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 64, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const markInfo = iconTex('i', '#ffd36b'), markExam = iconTex('?', '#8ad7ff'), markTalk = iconTex('!', '#ff9a6a');
let tint = new THREE.Color(1, 1, 1);

function billboard(name, h) {
  const t = texs[name]; if (!t) return null;
  const aspect = t.image.width / t.image.height;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, alphaTest: 0.4 }));
  s.center.set(0.5, 0); s.scale.set(h * aspect, h, 1); return s;
}
function marker(tex, pos, size = 0.55) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.center.set(0.5, 0.5); s.scale.set(size, size, 1); s.position.copy(pos); s.position.y += 1.5; s.userData.base = s.position.y; scene.add(s); return s;
}

// =============================================================== personagens
const npcs = [];       // todos (falantes e ambiente)
const byId = {};
function spawnNPC(spriteName, pos, o = {}) {
  const spr = billboard(spriteName, o.h || 1.72); if (!spr) return null;
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2;
  const n = { id: o.id, spr, sh, pos: pos.clone(), base: pos.y, mode: o.mode || 'idle', path: o.path || null, pi: 0, speed: o.speed || 1, ph: Math.random() * 6, talk: !!o.id, h: o.h || 1.72, baseW: spr.scale.x, baseH: spr.scale.y, pause: o.pause };
  spr.position.copy(pos); sh.position.set(pos.x, pos.y + 0.03, pos.z);
  scene.add(spr, sh); npcs.push(n); if (o.id) byId[o.id] = n;
  if (o.path) { n.pos.copy(o.path[0]); }
  return n;
}
function updateNPC(n, dt, t) {
  let moving = false;
  if (n.path && n.mode === 'walk') {
    const near = n.pause && n.pos.distanceTo(player.pos) < 3.6;
    if (!near) {
      const a = n.path[n.pi], b = n.path[(n.pi + 1) % n.path.length];
      const d = V3(b.x - n.pos.x, 0, b.z - n.pos.z), len = d.length();
      if (len < 0.1) n.pi = (n.pi + 1) % n.path.length; else { d.multiplyScalar(1 / len); n.pos.x += d.x * n.speed * dt; n.pos.z += d.z * n.speed * dt; n.pos.y += (b.y - n.pos.y) * Math.min(1, dt * 3); moving = true; }
    }
  }
  const bob = moving ? Math.abs(Math.sin(t * 6 + n.ph)) * 0.05 : n.mode === 'work' ? Math.abs(Math.sin(t * 3.2 + n.ph)) * 0.04 : 0;
  const sway = moving ? 1 + Math.sin(t * 6 + n.ph) * 0.03 : 1 + Math.sin(t * 1.6 + n.ph) * 0.006;
  n.spr.position.set(n.pos.x, n.pos.y + bob, n.pos.z);
  n.spr.scale.set(n.baseW * sway, n.baseH * (n.mode === 'work' ? 1 - Math.abs(Math.sin(t * 3.2 + n.ph)) * 0.03 : 1), 1);
  n.sh.position.set(n.pos.x, n.pos.y + 0.03, n.pos.z);
  n.spr.material.color.copy(tint);
}

// =============================================================== mundo: porto, portas, pontos
const P = {};  // posições para objetivos
function buildPort() {
  const gb = new W.GB(1), wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 0.95 });
  gb.box(198, 0.05, -109.8, 218, 0.2, -106.2);
  for (let x = 199; x < 218; x += 4) for (const z of [-109.6, -106.4]) gb.box(x - 0.12, -4.6, z - 0.12, x + 0.12, 0.05, z + 0.12);
  gb.mesh(wood);
  const canoeM = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.9 });
  for (const [x, z, r] of [[206, -113, 0.1], [212, -103.8, -0.1], [204, -116, 0.2]]) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), canoeM); c.scale.set(3.2, 0.3, 0.55); c.position.set(x, -1.9, z); c.rotation.y = r; c.castShadow = true; scene.add(c);
  }
}
const doorMeshes = [];
function buildDoors() {
  const mat = new THREE.MeshStandardMaterial({ color: 0x5a3a1e, roughness: 0.9 });
  DOORS.forEach((d, i) => {
    const b = BLD[d.b], dr = b && b.door; if (!dr) return;
    const w = 1.5, hh = 2.8, th = 0.3;
    const geo = dr.ax === 'x' ? new THREE.BoxGeometry(w, hh, th) : new THREE.BoxGeometry(th, hh, w);
    const m = new THREE.Mesh(geo, mat); m.position.set(dr.x, flr(b) + hh / 2, dr.z); m.castShadow = m.receiveShadow = true;
    geo.computeBoundsTree(); scene.add(m); colliders.push(m);
    const door = { d, i, mesh: m, open: false, pos: V3(dr.x, flr(b), dr.z) };
    doorMeshes.push(door);
    if (f('door_' + i)) openDoor(door, true);
  });
}
function openDoor(door, silent) {
  if (door.open) return; door.open = true; scene.remove(door.mesh);
  const k = colliders.indexOf(door.mesh); if (k >= 0) colliders.splice(k, 1);
  S.flags['door_' + door.i] = true; if (!silent) sfx('open');
}

const interactables = [];
function addInteract(o) { interactables.push(o); return o; }
function buildInteractables() {
  // NPCs
  for (const n of npcs) if (n.id) {
    const def = NPCS[n.id];
    addInteract({ kind: 'npc', n, pos: n.pos, r: 2.8, label: () => 'Falar com ' + (def.short || def.name), enabled: () => true, act: () => talkTo(n.id) });
  }
  // pontos de informação (Códice)
  for (const info of INFO) {
    const pos = resolvePos(info.pos), mk = marker(markInfo, pos, 0.5);
    addInteract({ kind: 'info', info, pos, mk, r: 2.4, label: () => 'Ler: ' + info.title, enabled: () => true, act: () => readInfo(info) });
  }
  // exames
  for (const ex of EXAMINE) {
    const pos = ex.b ? inside(ex.b, ex.fx, ex.fz) : V3(ex.x, ex.y, ex.z), mk = marker(markExam, pos, 0.45);
    addInteract({ kind: 'exam', ex, pos, mk, r: 2.0, label: () => ex.label, enabled: () => ex.cond() && !f('ex_' + ex.id), act: () => examine(ex) });
  }
  // portas
  for (const door of doorMeshes) {
    addInteract({ kind: 'door', door, pos: door.pos, r: 2.4, label: () => 'Abrir porta', enabled: () => !door.open, act: () => useDoor(door) });
  }
  // cisterna e planta: nada extra
}
async function useDoor(door) {
  const d = door.d;
  if (d.lock) {
    if (!has('chavePaiol')) { toast(d.msg); sfx('lock'); return; }
    toast('Você usa a chave do paiol. Há ainda um cadeado de combinação.'); sfx('lock');
    inMG = true; const r = await MG.cadeado(); inMG = false;
    if (r && r.ok) { setf(d.flag); openDoor(door); toast('O cadeado cede. A casa de pólvora está aberta.'); }
    return;
  }
  if (has(d.key)) { setf(d.flag === 'residOpen' ? 'residOpen' : d.flag); openDoor(door); toast('Porta aberta.'); G.refresh(); }
  else { toast(d.msg); sfx('lock'); }
}
function examine(ex) {
  setf('ex_' + ex.id);
  note(ex.label.replace(/^Examinar /, ''), ex.text, () => { ex.act && ex.act(); G.refresh(); });
}
function readInfo(info) {
  if (!S.codex.includes(info.id)) { S.codex.push(info.id); sfx('good'); toast(`Códice atualizado (${S.codex.length}/${INFO.length})`); }
  note(info.title, info.text);
}

// =============================================================== jogador e controles
const player = { pos: V3(190, 0, -105), yaw: Math.PI / 2, pitch: 0, vy: 0, ground: true, run: false };
const EYE = 1.62, RAD = 0.35, STEP = 0.55;
camera.rotation.order = 'YXZ'; camera.near = 0.08; camera.updateProjectionMatrix();
const keys = {}; const ray = new THREE.Raycaster(); ray.firstHitOnly = true;
const tmpO = V3(0, 0, 0), tmpD = V3(0, 0, 0), tmpN = V3(0, 0, 0);
const castFirst = (o, d, far) => { ray.set(o, d); ray.far = far; const h = ray.intersectObjects(colliders, false); return h.length ? h[0] : null; };
const groundAt = p => { const h = castFirst(tmpO.set(p.x, p.y + 1.0, p.z), tmpD.set(0, -1, 0), 400); return h ? h.point.y : null; };
function moveHoriz(dx, dz) {
  const p = player.pos;
  for (let it = 0; it < 3; it++) {
    const len = Math.hypot(dx, dz); if (len < 1e-5) return;
    const d = V3(dx / len, 0, dz / len); let hit = null;
    for (const hgt of [STEP + 0.05, 1.0, 1.6]) {
      const h = castFirst(tmpO.set(p.x, p.y + hgt, p.z), d, len + RAD);
      if (h) { tmpN.copy(h.face.normal); if (Math.abs(tmpN.y) < 0.6) { hit = { dist: h.distance, n: tmpN.clone() }; break; } }
    }
    if (!hit) { p.x += dx; p.z += dz; return; }
    const adv = Math.max(0, hit.dist - RAD); p.x += d.x * adv; p.z += d.z * adv;
    const nn = hit.n; nn.y = 0; nn.normalize();
    let rx = d.x * (len - adv), rz = d.z * (len - adv); const dot = rx * nn.x + rz * nn.z; rx -= dot * nn.x; rz -= dot * nn.z; dx = rx; dz = rz;
  }
}
const mv = { x: 0, z: 0, mag: 0 };   // joystick
let lookDX = 0, lookDY = 0;
function updatePlayer(dt) {
  let f1 = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0), r1 = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  if (keys.ArrowLeft) player.yaw += dt * 2.0; if (keys.ArrowRight) player.yaw -= dt * 2.0;
  f1 += -mv.z; r1 += mv.x;
  f1 = Math.max(-1, Math.min(1, f1)); r1 = Math.max(-1, Math.min(1, r1));
  player.yaw -= lookDX * 0.0045; player.pitch -= lookDY * 0.0038; lookDX = lookDY = 0;
  player.pitch = Math.max(-1.2, Math.min(1.2, player.pitch));
  const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
  let mx = -sy * f1 + cy * r1, mz = -cy * f1 - sy * r1; const ml = Math.hypot(mx, mz);
  if (ml > 0.01) {
    const run = keys.ShiftLeft || keys.ShiftRight || player.run || mv.mag > 0.85, sp = (run ? 7.2 : 4.0) * Math.min(1, ml) * dt;
    moveHoriz(mx / ml * sp, mz / ml * sp);
    stepT += dt * (run ? 2.6 : 1.8); if (stepT > 1) { stepT = 0; sfx('step'); }
  }
  // NPC e limites
  for (const n of npcs) { const dx = player.pos.x - n.pos.x, dz = player.pos.z - n.pos.z, d = Math.hypot(dx, dz); if (d < 0.65 && d > 0.001) { player.pos.x += dx / d * (0.65 - d); player.pos.z += dz / d * (0.65 - d); } }
  player.pos.x = Math.max(-400, Math.min(228, player.pos.x)); player.pos.z = Math.max(-240, Math.min(330, player.pos.z));
  player.vy -= 18 * dt; player.pos.y += player.vy * dt;
  const g = groundAt(player.pos);
  if (g !== null && player.vy <= 0 && player.pos.y <= g + 0.45) { player.pos.y = g; player.vy = 0; } else if (g === null && player.pos.y < -30) { player.pos.set(190, 0, -105); }
  camera.position.set(player.pos.x, player.pos.y + EYE, player.pos.z);
  camera.rotation.set(player.pitch, player.yaw, 0);
}
let stepT = 0;
function syncCamera() { camera.position.set(player.pos.x, player.pos.y + EYE, player.pos.z); camera.rotation.set(player.pitch, player.yaw, 0); }

// entrada: teclado, mouse, toque
addEventListener('keydown', e => {
  if (e.repeat && ['KeyE', 'Space', 'Enter'].includes(e.code)) return;
  keys[e.code] = true;
  if (!running || mode !== 'play' || inMG || inCard) return;
  if (inDialog) { if (['Space', 'Enter', 'KeyE'].includes(e.code)) { e.preventDefault(); dlgAdvance(); } return; }
  if (['Space', 'Enter', 'KeyE'].includes(e.code)) { e.preventDefault(); interact(); }
  if (e.code === 'KeyI') openPanel('inv'); if (e.code === 'KeyJ') openPanel('obj'); if (e.code === 'KeyM') openPanel('map');
  if (e.code === 'Escape' || e.code === 'KeyP') openPanel('menu');
});
addEventListener('keyup', e => { keys[e.code] = false; });
let dragLook = null;
$('c').addEventListener('mousedown', e => { if (mode !== 'play' || paused || inDialog || inMG) return; dragLook = { x: e.clientX, y: e.clientY }; if (matchMedia('(pointer: fine)').matches) $('c').requestPointerLock && $('c').requestPointerLock(); });
addEventListener('mouseup', () => { dragLook = null; });
addEventListener('mousemove', e => {
  if (mode !== 'play' || paused || inDialog || inMG) return;
  if (document.pointerLockElement === $('c')) { lookDX += e.movementX; lookDY += e.movementY; }
  else if (dragLook) { lookDX += e.clientX - dragLook.x; lookDY += e.clientY - dragLook.y; dragLook = { x: e.clientX, y: e.clientY }; }
});
// toque: joystick à esquerda, olhar à direita
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
document.body.classList.toggle('touch', isTouch);
let joyId = null, joyO = null, lookId = null, lookLast = null;
$('joyzone').addEventListener('pointerdown', e => { if (joyId !== null) return; joyId = e.pointerId; joyO = { x: e.clientX, y: e.clientY }; $('joy').style.cssText = `display:block;left:${e.clientX - 55}px;top:${e.clientY - 55}px`; $('stick').style.transform = 'translate(0,0)'; e.target.setPointerCapture(e.pointerId); });
$('joyzone').addEventListener('pointermove', e => {
  if (e.pointerId !== joyId) return; let dx = e.clientX - joyO.x, dy = e.clientY - joyO.y; const d = Math.hypot(dx, dy), R = 50;
  if (d > R) { dx *= R / d; dy *= R / d; } mv.x = dx / R; mv.z = dy / R; mv.mag = Math.hypot(mv.x, mv.z); $('stick').style.transform = `translate(${dx}px,${dy}px)`;
});
const joyEnd = e => { if (e.pointerId !== joyId) return; joyId = null; mv.x = mv.z = mv.mag = 0; $('joy').style.display = 'none'; };
$('joyzone').addEventListener('pointerup', joyEnd); $('joyzone').addEventListener('pointercancel', joyEnd);
$('lookzone').addEventListener('pointerdown', e => { if (lookId !== null) return; lookId = e.pointerId; lookLast = { x: e.clientX, y: e.clientY }; e.target.setPointerCapture(e.pointerId); });
$('lookzone').addEventListener('pointermove', e => { if (e.pointerId !== lookId) return; lookDX += (e.clientX - lookLast.x) * 1.4; lookDY += (e.clientY - lookLast.y) * 1.4; lookLast = { x: e.clientX, y: e.clientY }; });
const lookEnd = e => { if (e.pointerId === lookId) lookId = null; };
$('lookzone').addEventListener('pointerup', lookEnd); $('lookzone').addEventListener('pointercancel', lookEnd);

// =============================================================== interação
let current = null;
function updatePrompt() {
  current = null;
  if (mode === 'play' && !paused && !inDialog && !inMG && !inCard) {
    let best = 1e9;
    const fwd = V3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    for (const it of interactables) {
      if (it.enabled && !it.enabled()) continue;
      const dx = it.pos.x - player.pos.x, dz = it.pos.z - player.pos.z, d = Math.hypot(dx, dz);
      if (d > it.r || Math.abs(it.pos.y - player.pos.y) > 4.5) continue;
      const facing = d < 0.9 ? 1 : (dx * fwd.x + dz * fwd.z) / d;
      if (facing < -0.2) continue;
      const score = d - facing * 0.8; if (score < best) { best = score; current = it; }
    }
  }
  const p = $('prompt'); if (current) { p.classList.add('on'); $('promptTxt').textContent = current.label(); } else p.classList.remove('on');
  $('btnAct').classList.toggle('hot', !!current);
}
function interact() { if (current) { sfx('ui'); current.act(); } }
$('btnAct').addEventListener('pointerdown', e => { e.preventDefault(); if (inDialog) dlgAdvance(); else interact(); });
$('prompt').addEventListener('pointerdown', e => { e.preventDefault(); interact(); });

// =============================================================== UI: toast, nota, cartão
let toastT = 0;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 3200); }
function note(title, text, cb) {
  $('noteTitle').textContent = title; $('noteText').textContent = text; $('note').classList.add('on'); inCard = true; sfx('ui');
  $('noteOk').onclick = () => { $('note').classList.remove('on'); inCard = false; sfx('ui'); cb && cb(); };
}
function card(lines, { title = '', btn = 'Continuar' } = {}) {
  return new Promise(res => {
    let i = 0; inCard = true; const c = $('card'), tx = $('cardText'), ok = $('cardOk'); c.classList.add('on'); $('cardTitle').textContent = title;
    const show = () => { tx.textContent = lines[i]; ok.textContent = i < lines.length - 1 ? 'Continuar ▶' : btn; };
    show(); ok.onclick = () => { sfx('ui'); if (++i >= lines.length) { c.classList.remove('on'); inCard = false; res(); } else show(); };
  });
}
function fade(on) { $('fade').classList.toggle('on', on); return new Promise(r => setTimeout(r, 700)); }

// =============================================================== diálogos
let dlg = null, typing = null;
function talkTo(id) {
  const def = NPCS[id]; let node = def.hub;
  if (id === 'tiago' && !f('metTiago')) node = 'tiago.first';
  if (id === 'manuel' && !f('sentinelTold')) node = 'manuel.first';
  if (id === 'ricardo' && !f('briefed')) node = 'ricardo.intro';
  openDialog(id, node);
}
function openDialog(id, nodeId) {
  inDialog = true; $('dlg').classList.add('on'); $('hud').classList.add('hide'); sfx('ui');
  const def = NPCS[id]; $('dlgName').textContent = def.name; $('dlgRole').textContent = def.role;
  $('dlgPortrait').style.backgroundImage = `url(sprites/${def.sprite}.webp)`;
  dlg = { id, def }; showNode(nodeId);
  const n = byId[id]; if (n) dlg.look = Math.atan2(-(n.pos.x - player.pos.x), -(n.pos.z - player.pos.z));
}
function closeDialog() { inDialog = false; dlg = null; $('dlg').classList.remove('on'); $('hud').classList.remove('hide'); G.refresh(); }
function showNode(id) {
  const node = NODES[id]; if (!node) return closeDialog();
  if (node.fn) node.fn();
  if (!dlg) return;    // fn pode ter fechado o diálogo
  const txt = typeof node.text === 'function' ? node.text() : node.text;
  dlg.node = node; dlg.pages = txt.split('||'); dlg.page = 0; renderPage();
}
function renderPage() {
  const text = dlg.pages[dlg.page], last = dlg.page === dlg.pages.length - 1, el = $('dlgText'), opts = $('dlgOpts');
  opts.innerHTML = ''; let i = 0; clearInterval(typing); el.textContent = '';
  dlg.full = text; dlg.done = false;
  typing = setInterval(() => { i += 2; el.textContent = text.slice(0, i); if (i >= text.length) { clearInterval(typing); dlg.done = true; showOpts(last); } }, 16);
}
function showOpts(last) {
  const opts = $('dlgOpts'); opts.innerHTML = '';
  if (!last) { const b = document.createElement('button'); b.className = 'opt'; b.textContent = 'Continuar ▶'; b.onclick = () => { dlg.page++; sfx('tick'); renderPage(); }; opts.appendChild(b); return; }
  for (const o of dlg.node.opts) {
    const [label, go, ex = {}] = o; if (ex.if && !ex.if()) continue;
    const b = document.createElement('button'); b.className = 'opt'; b.textContent = label;
    b.onclick = async () => {
      sfx('tick');
      if (ex.do) ex.do();
      if (ex.mg) { const [name, win, lose] = ex.mg; $('dlg').classList.remove('on'); inMG = true; const r = await MG[name](); inMG = false; $('dlg').classList.add('on'); showNode(r && r.ok ? win : lose); return; }
      if (!dlg) return;
      if (go === null) closeDialog(); else showNode(go);
    };
    opts.appendChild(b);
  }
}
function dlgAdvance() {
  if (!dlg) return;
  if (!dlg.done) { clearInterval(typing); $('dlgText').textContent = dlg.full; dlg.done = true; showOpts(dlg.page === dlg.pages.length - 1); return; }
  if (dlg.page < dlg.pages.length - 1) { dlg.page++; sfx('tick'); renderPage(); }
}
$('dlgText').addEventListener('pointerdown', dlgAdvance);

// =============================================================== inventário, objetivos, mapa, menu
let panelTab = 'obj';
function openPanel(tab) {
  paused = true; panelTab = tab; $('panel').classList.add('on'); renderPanel(); sfx('ui');
}
function closePanel() { paused = false; $('panel').classList.remove('on'); }
function renderPanel() {
  for (const b of document.querySelectorAll('#tabs button')) b.classList.toggle('on', b.dataset.t === panelTab);
  const body = $('panelBody'); body.innerHTML = '';
  if (panelTab === 'obj') {
    const [txt] = currentObjective();
    body.innerHTML = `<h3>Objetivo atual</h3><p class="big">${txt}</p><h3>Etapas</h3>`;
    if (f('act1done')) { const ul = document.createElement('ul'); ul.className = 'check'; for (const [t, ok] of checklist()) { const li = document.createElement('li'); li.className = ok ? 'ok' : ''; li.textContent = (ok ? '☑ ' : '☐ ') + t; ul.appendChild(li); } body.appendChild(ul); }
    else body.innerHTML += `<p>Ato I · A Chegada: descubra por que o almoxarife está de cama e o que ele precisa.</p>`;
    body.innerHTML += `<h3>Códice</h3><p>${S.codex.length}/${INFO.length} pontos lidos. Visite os pontos <span class="gold">(i)</span> espalhados pelo forte.</p>`;
    const cod = document.createElement('div'); cod.className = 'cod';
    for (const info of INFO) if (S.codex.includes(info.id)) { const d = document.createElement('details'); d.innerHTML = `<summary>${info.title}</summary><p>${info.text}</p>`; cod.appendChild(d); }
    body.appendChild(cod);
  } else if (panelTab === 'inv') {
    const grid = document.createElement('div'); grid.className = 'inv'; const desc = document.createElement('div'); desc.className = 'invdesc'; desc.textContent = S.inv.length ? 'Toque num item para examinar.' : 'Você ainda não carrega nada.';
    for (const id of S.inv) {
      const [em, name, d] = ITEMS[id]; const b = document.createElement('button'); b.className = 'slot'; b.innerHTML = `<span>${em}</span><small>${name}</small>`;
      b.onclick = () => { desc.innerHTML = `<b>${em} ${name}</b><br>${d}`; sfx('tick'); if (id === 'carta') { const rb = document.createElement('button'); rb.className = 'btn small'; rb.textContent = 'Ler a carta'; rb.onclick = () => note('Carta de Sambuceti', EXAMINE.find(e => e.id === 'pol_carta').text); desc.appendChild(document.createElement('br')); desc.appendChild(rb); } };
      grid.appendChild(b);
    }
    body.append(grid, desc);
    if (['frag1', 'frag2', 'frag3', 'frag4'].every(has) && !has('planta')) { const b = document.createElement('button'); b.className = 'btn primary'; b.textContent = '🧩 Montar a planta de Sambuceti'; b.onclick = () => { closePanel(); assemblePlanta(); }; body.appendChild(b); }
  } else if (panelTab === 'map') {
    const c = document.createElement('canvas'); c.width = c.height = 520; c.className = 'bigmap'; body.appendChild(c); drawMap(c.getContext('2d'), 520, 1.05, true);
    const cap = document.createElement('p'); cap.className = 'small'; cap.innerHTML = 'Você: seta amarela · Objetivo: ★ · (i) pontos do Códice · ● personagens'; body.appendChild(cap);
  } else if (panelTab === 'menu') {
    body.innerHTML = `<h3>Menu</h3>`;
    const mk = (t, fn, cls = '') => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.textContent = t; b.onclick = fn; body.appendChild(b); return b; };
    mk('▶ Continuar', closePanel, 'primary');
    mk(soundOn() ? '🔊 Som: ligado' : '🔇 Som: desligado', () => { setSound(!soundOn()); renderPanel(); });
    mk(quality === 'high' ? '✨ Gráficos: altos' : '⚡ Gráficos: leves', () => { setQuality(quality === 'high' ? 'low' : 'high'); renderPanel(); });
    mk('💾 Salvar jogo', () => { save(); toast('Jogo salvo.'); });
    mk('🏠 Tela inicial', () => { save(); closePanel(); showTitle(); });
    const help = document.createElement('div'); help.className = 'help'; help.innerHTML = `<h3>Como jogar</h3><p><b>Mover:</b> WASD/setas ou joystick à esquerda. <b>Olhar:</b> mouse ou arrastar à direita. <b>Agir:</b> E / Espaço ou botão ✋. <b>Correr:</b> Shift ou empurrar o joystick até o fim. <b>Inventário:</b> I · <b>Diário:</b> J · <b>Mapa:</b> M · <b>Menu:</b> Esc.</p><p>Converse com todos: as conversas explicam a rotina do forte e revelam pistas. Procure os pontos <span class="gold">(i)</span> e os pontos <span class="blue">(?)</span> de exame.</p><p class="small">${CREDITS}</p>`;
    body.appendChild(help);
  }
}
document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => { panelTab = b.dataset.t; renderPanel(); sfx('tick'); });
$('panelClose').onclick = closePanel;
$('btnInv').onclick = () => openPanel('inv'); $('btnJ').onclick = () => openPanel('obj'); $('btnMap').onclick = () => openPanel('map'); $('btnMenu').onclick = () => openPanel('menu');
$('btnRun').onclick = () => { player.run = !player.run; $('btnRun').classList.toggle('on', player.run); };
$('btnPlanta').onclick = () => assemblePlanta();

async function assemblePlanta() {
  if (!['frag1', 'frag2', 'frag3', 'frag4'].every(has)) return;
  inMG = true; const r = await MG.planta(); inMG = false;
  if (r && r.ok) { ['frag1', 'frag2', 'frag3', 'frag4'].forEach(k => G.take(k)); G.give('planta'); note('A planta de Sambuceti', PLANTA_TEXT); }
}

// objetivo atual + posição
function currentObjective() { const r = objective(P); return [r[0], r[1]]; }
function refresh() {
  const [txt, pos] = currentObjective(); $('objText').textContent = txt; objPos = pos;
  $('btnPlanta').classList.toggle('on', ['frag1', 'frag2', 'frag3', 'frag4'].every(has) && !has('planta'));
  $('invBadge').textContent = S.inv.length || '';
}
let objPos = null;

// minimapa
function drawMap(g, S0, scale, full) {
  g.clearRect(0, 0, S0, S0); g.save();
  const cx = S0 / 2, cy = S0 / 2;
  if (full) { g.fillStyle = '#2b3a20'; g.fillRect(0, 0, S0, S0); g.translate(cx - 0 * scale + 20, cy + 10); }
  else { g.beginPath(); g.arc(cx, cy, cx - 1, 0, 7); g.clip(); g.fillStyle = '#2b3a20'; g.fillRect(0, 0, S0, S0); g.translate(cx, cy); g.rotate(player.yaw); g.translate(-player.pos.x * scale, -player.pos.z * scale); }
  const P2 = p => [p.x * scale, p.z * scale];
  const poly = (pts, fill, stroke) => { g.beginPath(); pts.forEach((p, i) => { const [x, y] = P2(p); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.stroke(); } };
  if (full) { g.fillStyle = '#3a5a78'; g.fillRect((W.RIVER_X0 + 10) * scale, -240 * scale, 400 * scale, 600 * scale); g.fillStyle = '#7a3a28'; g.fillRect(0, -112 * scale, W.RIVER_X0 * scale, 8 * scale); }
  poly(W.GLACIS_OUT, '#3e5a2a'); poly(W.COUNTER, '#35516b'); poly(W.TRACE, '#a8573a'); poly(W.INNER, '#8c7a55');
  g.fillStyle = '#6a3a28'; for (const b of W.BUILDINGS) { const [x, y] = P2({ x: b.x0, z: b.z0 }); g.fillRect(x, y, (b.x1 - b.x0) * scale, (b.z1 - b.z0) * scale); }
  for (const it of interactables) if (it.kind === 'info') { const [x, y] = P2(it.pos); g.fillStyle = S.codex.includes(it.info.id) ? '#7a6a3a' : '#ffd36b'; g.beginPath(); g.arc(x, y, full ? 4 : 3, 0, 7); g.fill(); }
  for (const n of npcs) if (n.id) { const [x, y] = P2(n.pos); g.fillStyle = '#ff9a6a'; g.beginPath(); g.arc(x, y, full ? 4 : 3, 0, 7); g.fill(); }
  if (objPos) { const [x, y] = P2(objPos); g.fillStyle = '#ff4040'; g.font = (full ? 22 : 16) + 'px serif'; g.textAlign = 'center'; g.fillText('★', x, y + 6); }
  if (full) { const [x, y] = P2(player.pos); g.save(); g.translate(x, y); g.rotate(-player.yaw + Math.PI); g.fillStyle = '#ffee66'; g.beginPath(); g.moveTo(0, -10); g.lineTo(7, 8); g.lineTo(-7, 8); g.fill(); g.restore(); }
  g.restore();
  if (!full) { g.fillStyle = '#ffee66'; g.beginPath(); g.moveTo(cx, cy - 9); g.lineTo(cx + 6, cy + 7); g.lineTo(cx - 6, cy + 7); g.fill(); g.strokeStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(cx, cy, cx - 1, 0, 7); g.stroke(); }
}
const mmG = $('mm').getContext('2d'); let mmT = 0;

// =============================================================== fases do dia
const PHASES = {
  manha: { elev: 28, az: 215, dir: 0xffe0b0, di: 3.2, hemi: 1.1, hs: 0xcfe3ff, hg: 0x5a4a30, fog: 0xc9d6dc, exp: 0.6, tint: 0xffffff },
  tarde: { elev: 12, az: 250, dir: 0xffb070, di: 2.8, hemi: 0.95, hs: 0xffd9b0, hg: 0x4a3828, fog: 0xd9b998, exp: 0.62, tint: 0xffe0bc },
  madrugada: { elev: 5, az: 95, dir: 0xff9a7a, di: 1.9, hemi: 0.9, hs: 0xaab8d8, hg: 0x3a3a48, fog: 0xa9b5c9, exp: 0.55, tint: 0xd8dff0 },
};
function setPhase(name) {
  const p = PHASES[name]; S.phase = name;
  const sun = V3(0, 0, 0).setFromSphericalCoords(1, Math.PI / 2 - p.elev * Math.PI / 180, p.az * Math.PI / 180);
  W.sky.material.uniforms.sunPosition.value.copy(sun); W.dir.position.copy(sun).multiplyScalar(400); W.dir.color.set(p.dir); W.dir.intensity = p.di;
  W.hemi.color.set(p.hs); W.hemi.groundColor.set(p.hg); W.hemi.intensity = p.hemi; scene.fog.color.set(p.fog); renderer.toneMappingExposure = p.exp; tint.set(p.tint);
  $('phaseLbl').textContent = { manha: 'Dia 1 · Manhã', tarde: 'Dia 2 · Tarde', madrugada: 'Dia 3 · Madrugada' }[name];
}
async function nextAct(n) {
  const wasMode = mode; mode = 'cut';
  await fade(true);
  if (n === 2) setPhase('tarde'); else if (n === 3) setPhase('madrugada');
  await fade(false);
  mode = wasMode === 'cut' ? 'play' : wasMode;
  if (n === 2) await card(['Fim do primeiro dia. O almoxarife respira de novo, e uma chave pesada de ferro pende na sua mão.', 'Ato II · A Planta Perdida. Abra os armazéns, recupere o livro, restaure a bandeira e reúna os quatro pedaços da planta de Sambuceti.'], { title: 'Dia 2 · Tarde' });
  else if (n === 3) await card(['A pólvora está em suas mãos e a noite caiu sobre o Guaporé. Falta pouco: o capitão-general chega ao amanhecer.', 'Ato III · A Inauguração. Reúna livro, planta, bandeira restaurada e pólvora, e entregue tudo ao capitão Ricardo Franco.'], { title: 'Dia 3 · Madrugada' });
  G.refresh();
}

// =============================================================== itens e estado
function give(id) {
  if (has(id)) return; S.inv.push(id); sfx('pick'); const [em, name] = ITEMS[id]; toast(`${em} Você pegou: ${name}`);
  if (id === 'polvora') { setf('act2done'); setTimeout(() => nextAct(3), 1200); }
  if (['frag1', 'frag2', 'frag3', 'frag4'].every(has) && !has('planta')) setTimeout(() => toast('🧩 Quatro fragmentos! Monte a planta: botão 🧩 ou Inventário.'), 3400);
  G.refresh();
}
function take(id) { const i = S.inv.indexOf(id); if (i >= 0) S.inv.splice(i, 1); G.refresh(); }
Object.assign(G, { toast, give, take, nextAct, refresh, startFinale, say: talkTo });

// =============================================================== final
async function startFinale() {
  closeDialog(); mode = 'cut'; setf('act3');
  await fade(true);
  player.pos.set(0, W.Y_YARD, -12); player.yaw = Math.PI; player.pitch = 0.05; syncCamera();   // de frente para o mastro
  await fade(false);
  await card(FINALE.intro, { title: 'A inauguração' });
  inMG = true; let r = await MG.bandeira(); inMG = false;
  const fl = W.FLAG(); if (fl) { fl.visible = true; setf('flagUp'); }
  await card(FINALE.afterFlag, {});
  inMG = true; r = await MG.salva(); inMG = false;
  await card(FINALE.afterSalva, {});
  player.yaw = 0; player.pitch = 0; syncCamera();
  const lu = spawnNPC('governador', V3(0, W.Y_YARD, -22), { id: 'luis', h: 1.74 });
  if (lu) { interactables.length = interactables.length; }
  NODES['luis.final'] = { id: 'luis.final', text: FINALE.governor.join('||'), opts: [['Sim, Excelência.', null, { do: () => setTimeout(endGame, 300) }]] };
  mode = 'play'; NPCS.luis.hub = 'luis.final'; openDialog('luis', 'luis.final');
}
let ending = false;
async function endGame() {
  if (ending) return; ending = true;
  mode = 'cut'; await fade(true); $('hud').classList.add('hide');
  await fade(false);
  await card(EPILOGUE, { title: 'Epílogo' });
  const secs = Math.round(S.played), mins = Math.floor(secs / 60);
  const j = f('justica') ? ' ✔ Justiça feita pelo furto de 1778.' : '';
  $('endStats').innerHTML = `<h2>Fim</h2><p>Códice: <b>${S.codex.length}/${INFO.length}</b> pontos lidos.${j}</p><p>Tempo de jogo: ${mins} min.</p><p class="small">${CREDITS}</p>`;
  $('endScreen').classList.add('on'); try { localStorage.removeItem(SAVE_KEY); } catch (e) { }
}
$('endAgain').onclick = () => { $('endScreen').classList.remove('on'); showTitle(); };

// =============================================================== salvar / qualidade
let quality = 'high';
try { quality = localStorage.getItem('forte.quality') || (W.MOBILE ? 'low' : 'high'); } catch (e) { }
function setQuality(q) {
  quality = q; try { localStorage.setItem('forte.quality', q); } catch (e) { }
  W.dir.castShadow = q === 'high'; renderer.setPixelRatio(q === 'high' ? (W.MOBILE ? 1.25 : Math.min(devicePixelRatio, 2)) : 1); renderer.setSize(innerWidth, innerHeight);
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ S, p: [player.pos.x, player.pos.y, player.pos.z, player.yaw] })); } catch (e) { } }
function loadSave() { try { const j = localStorage.getItem(SAVE_KEY); return j ? JSON.parse(j) : null; } catch (e) { return null; } }

// =============================================================== população do mundo
function populate() {
  const door = n => BLD[n].door, Y = W.Y_YARD;
  const rd = door('Residência do governador'), qd = door('Quartel de oficiais V (parque de artilharia)'), hd = door('Hospital');
  const place = {
    tiago: [190, 0, -103], maneco: [212, 0.2, -108], manuel: [-1.9, Y, -69], ricardo: [qd.x, Y, qd.z + 2.4], melo: [rd.x, Y, rd.z - 2.4],
    domingos: [131, 0, 40], quirino: [-20, Y, -50.8], sebastiao: [104, 0.05, -160], inacio: [-44.6, Y, hd.z + 2.2], joaquim: [-46.4, Y, 22.5],
    anacleto: [-35, Y, 19.6], anselmo: [-38.5, Y, 0], rosa: [24.5, Y, 13], faustino: [33.5, Y, 20],
  };
  for (const [id, p] of Object.entries(place)) spawnNPC(NPCS[id].sprite, V3(...p), { id, h: id === 'ricardo' || id === 'melo' ? 1.74 : 1.68 });
  P.tiago = byId.tiago.pos; P.maneco = byId.maneco.pos; P.ricardo = byId.ricardo.pos; P.joaquim = byId.joaquim.pos; P.anacleto = byId.anacleto.pos; P.melo = byId.melo.pos; P.faustino = byId.faustino.pos;
  P.armazem = V3(-5, Y, 38); P.res = byId.melo.pos; P.cisterna = V3(20, Y, 8); P.polvora = V3(136, 0, 40);
  // Romão e o soldado da ronda
  const loop = r => [[-r, -r], [r, -r], [r, r], [-r, r]].map(([x, z]) => V3(x, Y, z));
  const rom = spawnNPC('soldado', loop(22)[0], { id: 'romao', path: loop(22), mode: 'walk', speed: 0.9, pause: true, h: 1.7 }); if (rom) rom.pi = 0;
  // ambiente
  const A = (s, p, o = {}) => spawnNPC(s, V3(...p), { h: 1.68 + Math.random() * 0.08, ...o });
  A('soldado', [1.5, Y, -62.4]); A('soldado', [0, Y, -30], { mode: 'walk', speed: 0.9, path: [V3(0, Y, -30), V3(0, Y, 20)] });
  A('pedestre', [-3, Y, -48], { mode: 'walk', speed: 1.2, path: [V3(-3, Y, -48), V3(-3, Y, -22)] });
  for (let s = 0; s < 4; s++) { const [x, , z] = W.rot3([-88, 0, -88], s); A('soldado', [x, W.Y_TOP, z]); }
  for (let s = 0; s < 4; s++) { const a = W.rot3([-30, W.Y_TOP, -56.1], s), b = W.rot3([30, W.Y_TOP, -56.1], s); A('soldado', a, { mode: 'walk', speed: 0.8, path: [V3(...a), V3(...b)] }); }
  A('pedreiro', [-18, Y, -50.8], { mode: 'work' }); A('pedreiro', [-22.5, Y, -50.8], { mode: 'work' });
  for (let i = 0; i < 4; i++) A('lavrador', [98 + i * 5, 0.05, -166 + (i % 2) * 2], { mode: 'work' });
  A('lavrador', [-208, 0.05, -76], { mode: 'work' }); A('pescador', [16, 0, -104.5], { mode: 'work' });
  A('cozinheira', [27, Y, -10]); A('soldado', [40.4, Y, -5], { mode: 'work' });
}
function addFlagAndMisc() { const fl = W.FLAG(); if (fl) fl.visible = f('flagUp'); }

// =============================================================== título
let titleCam = 0;
function showTitle() {
  ending = false; mode = 'title'; running = true; paused = false; $('hud').classList.add('hide'); $('title').classList.add('on'); $('endScreen').classList.remove('on');
  $('btnContinue').style.display = loadSave() ? '' : 'none'; setPhase('manha'); fl0();
}
function fl0() { const fl = W.FLAG(); if (fl) fl.visible = true; }
async function startNew() {
  fresh(); for (const d of doorMeshes) if (d.open) { /* reabre estado inicial */ } resetWorld();
  $('title').classList.remove('on'); startAmbient(); setPhase('manha'); mode = 'cut';
  await card(['Agosto de 1783. Rio Guaporé, fronteira oeste da América portuguesa.', 'Você é Antônio Nunes, jovem escrivão da Provedoria da Real Fazenda de Vila Bela, enviado ao Real Forte Príncipe da Beira com um recado urgente: em três dias o capitão-general Luís de Albuquerque chega para inaugurá-lo, e o forte ainda não está pronto.', 'Há uma planta perdida, um livro sumido, uma bandeira rasgada e um engenheiro morto de febre. Descubra o que falta, converse com quem vive ali e ajude o forte a ficar de pé a tempo.'], { title: TITLE });
  inMG = true; await MG.canoe(); inMG = false;
  player.pos.set(190, 0, -108); player.yaw = Math.PI; player.pitch = 0; syncCamera();
  $('hud').classList.remove('hide'); S.started = true; mode = 'play'; addFlagAndMisc(); G.refresh();
  toast('Chegada ao porto. Fale com Tiago (botão ✋ ou E).');
  setTimeout(() => talkTo('tiago'), 600);
}
function resetWorld() {
  // portas fechadas de novo
  for (const d of doorMeshes) { if (d.open) { d.open = false; scene.add(d.mesh); colliders.push(d.mesh); } }
  for (let i = npcs.length - 1; i >= 0; i--) if (npcs[i].id === 'luis') { scene.remove(npcs[i].spr, npcs[i].sh); npcs.splice(i, 1); delete byId.luis; }
  const fl = W.FLAG(); if (fl) fl.visible = false;
}
function continueGame() {
  const sv = loadSave(); if (!sv) return startNew();
  fresh(); Object.assign(S, sv.S); resetWorld();
  for (const d of doorMeshes) if (f('door_' + d.i)) openDoor(d, true);
  $('title').classList.remove('on'); startAmbient(); setPhase(S.phase);
  player.pos.set(sv.p[0], sv.p[1] + 0.2, sv.p[2]); player.yaw = sv.p[3]; syncCamera(); $('hud').classList.remove('hide'); mode = 'play'; addFlagAndMisc(); G.refresh();
}
$('btnNew').onclick = () => { sfx('ui'); startNew(); };
$('btnContinue').onclick = () => { sfx('ui'); continueGame(); };
$('btnQuality').onclick = () => { setQuality(quality === 'high' ? 'low' : 'high'); $('btnQuality').textContent = quality === 'high' ? 'Gráficos: altos' : 'Gráficos: leves'; };
$('btnHow').onclick = () => note('Como jogar', 'Mover: WASD/setas ou joystick à esquerda.\nOlhar: mouse (clique na tela) ou arrastar à direita.\nAgir: E / Espaço, ou o botão ✋.\nCorrer: Shift, ou empurre o joystick até o fim.\nInventário: I · Diário: J · Mapa: M · Menu: Esc.\n\nConverse com todos: as conversas explicam a rotina do forte e revelam pistas. Procure os pontos (i) dourados, que contam a história do lugar, e os pontos (?) azuis, onde há o que examinar.');

// =============================================================== laço principal
const clock = new THREE.Clock(); let acc = 0, saveT = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  W.updateWorld(t, dt);
  for (const n of npcs) updateNPC(n, dt, t);
  for (const it of interactables) if (it.mk) { it.mk.position.y = it.mk.userData.base + Math.sin(t * 2 + it.pos.x) * 0.06; it.mk.visible = (!it.enabled || it.enabled()) && Math.hypot(it.pos.x - player.pos.x, it.pos.z - player.pos.z) < 40; if (it.kind === 'info' && S.codex.includes(it.info.id)) it.mk.material.opacity = 0.35; }
  if (mode === 'title') {
    titleCam += dt * 0.08; camera.position.set(Math.cos(titleCam) * 230, 95, Math.sin(titleCam) * 230 - 40); camera.lookAt(0, 4, -20);
  } else if (mode === 'play') {
    if (!paused && !inMG && !inCard) {
      if (inDialog) { if (dlg && dlg.look !== undefined) { let d = dlg.look - player.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); player.yaw += d * Math.min(1, dt * 4); camera.rotation.set(player.pitch, player.yaw, 0); } }
      else { updatePlayer(dt); S.played += dt; }
    }
    updatePrompt();
    acc += dt; if (acc > 0.15) {
      acc = 0; mmT++; drawMap(mmG, 150, 1.5, false);
      if (objPos) { const dx = objPos.x - player.pos.x, dz = objPos.z - player.pos.z, d = Math.round(Math.hypot(dx, dz)); $('objDist').textContent = d + ' m'; const ang = Math.atan2(dx, -dz) + player.yaw; $('objArrow').style.transform = `rotate(${ang}rad)`; }
      else { $('objDist').textContent = ''; }
      $('zone').textContent = zoneOf(player.pos);
    }
    saveT += dt; if (saveT > 20 && !inMG && !inCard) { saveT = 0; save(); }
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
function zoneOf(p) {
  if (p.y < W.Y_TOP - 0.5) for (const b of W.BUILDINGS) if (p.x > b.x0 && p.x < b.x1 && p.z > b.z0 && p.z < b.z1) return b.name;
  if (p.x > 188 && p.z < -95 && p.z > -125) return 'Porto do Guaporé';
  const inPoly = (x, z, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) c = !c; } return c; };
  if (!inPoly(p.x, p.z, W.TRACE)) { if (Math.abs(p.x) < 3 && p.z < -65 && p.z > -107) return 'Ponte levadiça'; return inPoly(p.x, p.z, W.COUNTER) ? 'Fosso' : 'Fora das muralhas'; }
  if (Math.abs(p.x) < 2.6 && p.z < -52 && p.z > -66 && p.y < 6) return 'Portão principal';
  if (p.y > W.Y_TOP - 0.5) return 'Adarve das muralhas';
  return Math.max(Math.abs(p.x), Math.abs(p.z)) < 27 ? "Praça d'Armas" : 'Pátio interno';
}
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'play') save(); });

// =============================================================== início
(async function init() {
  await Promise.race([loadSprites(), new Promise(r => setTimeout(r, 15000))]);
  await Promise.race([new Promise(r => { W.manager.onLoad = r; }), new Promise(r => setTimeout(r, 6000))]);
  buildPort(); buildDoors(); populate(); buildInteractables(); addFlagAndMisc();
  setQuality(quality); $('btnQuality').textContent = quality === 'high' ? 'Gráficos: altos' : 'Gráficos: leves';
  G.refresh();
  $('loading').classList.add('off'); showTitle(); frame();
  window.__game = { S, player, W, npcs, interactables, openPanel, give, setf, nextAct, startFinale, talkTo };
})();
