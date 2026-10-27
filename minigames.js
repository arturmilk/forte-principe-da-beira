// Minigames e enigmas: canoa, botica, pesca, planta, cadeado, salva de canhões, içar a bandeira.
import { sfx } from './audio.js';
import { RECEITA, CODE } from './data.js';
import * as W from './world.js';

const $ = (s, r = document) => r.querySelector(s);
function open(title, hint) {
  const r = $('#mg');
  r.innerHTML = `<div class="mgbox"><div class="mgtitle"></div><div class="mghint"></div><div class="mgbody"></div><div class="mgfoot"></div></div>`;
  $('.mgtitle', r).textContent = title; $('.mghint', r).innerHTML = hint;
  r.classList.add('on');
  return { box: r.firstChild, body: $('.mgbody', r), foot: $('.mgfoot', r), hint: $('.mghint', r), close() { r.classList.remove('on'); r.innerHTML = ''; } };
}
function btn(label, cls = '') { const b = document.createElement('button'); b.className = 'btn ' + cls; b.textContent = label; return b; }
function canvasIn(m, ratio = 0.75) {
  const maxByHeight = Math.max(220, (window.innerHeight - 230) / ratio);
  const c = document.createElement('canvas'), w = Math.min(520, maxByHeight, Math.max(240, m.body.clientWidth || 320));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = Math.round(w * dpr); c.height = Math.round(w * ratio * dpr);
  c.style.width = '100%'; c.style.aspectRatio = `${1} / ${ratio}`; c.style.touchAction = 'none'; c.style.borderRadius = '10px';
  const g = c.getContext('2d'); g.scale(dpr, dpr);
  m.body.appendChild(c);
  return { c, g, w, h: w * ratio };
}
function skipBtn(m, done, label = 'Pular desafio') {
  const b = btn(label, 'ghost small'); b.onclick = () => { sfx('ui'); m.close(); done({ ok: true, skipped: true }); }; m.foot.appendChild(b);
}
const pos = (c, e) => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };

// ------------------------------------------------------------ 1. Canoa pelo Guaporé
export function canoe() {
  return new Promise(done => {
    const m = open('A viagem pelo Guaporé', 'Agosto de 1783. Tiago rema e você guia a canoa entre troncos e pedras. <b>Arraste</b> ou use as <b>setas</b>. Aguente até o forte.');
    const { c, g, w, h } = canvasIn(m, 1.25);
    let x = 0.5, tx = 0.5, lives = 3, t = 0, T = 26, speed = 150, off = 0, fails = 0, hit = 0, raf, last = performance.now(), ob = [], acc = 0;
    const keys = {};
    const kd = e => { keys[e.key] = true; }, ku = e => { keys[e.key] = false; };
    addEventListener('keydown', kd); addEventListener('keyup', ku);
    c.onpointermove = c.onpointerdown = e => { tx = Math.min(0.92, Math.max(0.08, pos(c, e)[0])); };
    const trees = Array.from({ length: 22 }, (_, i) => ({ y: (i * 60) % (h + 60), s: 14 + (i * 7) % 12, left: i % 2 === 0, o: (i * 13) % 16 }));
    function finish(res) { cancelAnimationFrame(raf); removeEventListener('keydown', kd); removeEventListener('keyup', ku); m.close(); done(res); }
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt; off += speed * dt;
      if (keys.ArrowLeft || keys.a) tx -= dt * 1.1; if (keys.ArrowRight || keys.d) tx += dt * 1.1;
      tx = Math.min(0.92, Math.max(0.08, tx)); x += (tx - x) * Math.min(1, dt * 9);
      acc += dt; if (acc > 0.85 - Math.min(0.3, t / 80)) { acc = 0; const log = Math.random() < 0.6; ob.push({ x: 0.14 + Math.random() * 0.72, y: -30, r: log ? 0 : 1, w: log ? 70 + Math.random() * 40 : 22, rot: Math.random() * 0.8 - 0.4 }); }
      for (const o of ob) o.y += speed * dt;
      ob = ob.filter(o => o.y < h + 40);
      const px = x * w, py = h - 70;
      for (const o of ob) {
        if (o.hit) continue;
        const ox = o.x * w, near = o.r ? Math.hypot(ox - px, o.y - py) < o.w + 8 : Math.abs(ox - px) < o.w / 2 + 12 && Math.abs(o.y - py) < 26;
        if (near) { o.hit = true; lives--; hit = 0.4; sfx('bad'); }
      }
      hit = Math.max(0, hit - dt);
      // desenho
      const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#2e4a2a'); gr.addColorStop(0.12, '#4e5b34'); gr.addColorStop(0.88, '#4e5b34'); gr.addColorStop(1, '#2e4a2a');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,0.07)';
      for (let i = 0; i < 18; i++) g.fillRect(((i * 53) % (w - 80)) + 40, ((i * 91 + off * 0.9) % (h + 20)) - 10, 28, 2);
      for (const tr of trees) { const yy = (tr.y + off * 0.8) % (h + 60) - 30; g.fillStyle = '#1f3d1e'; g.beginPath(); g.arc(tr.left ? tr.o : w - tr.o, yy, tr.s, 0, 7); g.fill(); }
      for (const o of ob) { const ox = o.x * w; if (o.r) { g.fillStyle = '#6b6b66'; g.beginPath(); g.arc(ox, o.y, o.w, 0, 7); g.fill(); } else { g.save(); g.translate(ox, o.y); g.rotate(o.rot); g.fillStyle = '#5a3e22'; g.fillRect(-o.w / 2, -8, o.w, 16); g.restore(); } }
      g.save(); g.translate(px, py); g.rotate((tx - x) * 0.5);
      g.fillStyle = hit > 0 && Math.floor(hit * 20) % 2 ? '#c44' : '#7a5230'; g.beginPath(); g.ellipse(0, 0, 16, 42, 0, 0, 7); g.fill();
      g.fillStyle = '#d9a77a'; g.beginPath(); g.arc(0, -10, 7, 0, 7); g.fill(); g.fillStyle = '#c9b27a'; g.beginPath(); g.arc(0, 12, 8, 0, 7); g.fill();
      g.restore();
      g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(10, 10, w - 20, 10); g.fillStyle = '#d98a4a'; g.fillRect(10, 10, (w - 20) * Math.min(1, t / T), 10);
      g.font = '20px serif'; g.fillStyle = '#fff'; g.fillText('♥'.repeat(Math.max(0, lives)), 12, 42);
      if (lives <= 0) {
        fails++; lives = 3; t = 0; ob = []; if (fails >= 2) { speed = 110; }
        g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '18px serif'; g.fillText('Encalhou! Tiago desencalha. De novo.', 20, h / 2);
      }
      if (t >= T) { sfx('good'); return finish({ ok: true }); }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    skipBtn(m, r => { cancelAnimationFrame(raf); removeEventListener('keydown', kd); removeEventListener('keyup', ku); done(r); });
  });
}

// ------------------------------------------------------------ 2. Botica: preparar o febrífugo
export function botica() {
  return new Promise(done => {
    const m = open('Botica: preparar o febrífugo', RECEITA.texto);
    const sel = new Set(), msg = document.createElement('div'); msg.className = 'mgmsg';
    const grid = document.createElement('div'); grid.className = 'chips';
    for (const [id, em, nome] of RECEITA.itens) {
      const b = btn(`${em} ${nome}`, 'chip'); b.onclick = () => { sfx('tick'); sel.has(id) ? sel.delete(id) : sel.add(id); b.classList.toggle('on', sel.has(id)); };
      grid.appendChild(b);
    }
    const go = btn('Preparar', 'primary'); const quit = btn('Desistir', 'ghost small');
    go.onclick = () => {
      const ok = sel.size === RECEITA.certo.length && RECEITA.certo.every(k => sel.has(k));
      if (ok) { sfx('good'); m.close(); return done({ ok: true }); }
      sfx('bad');
      msg.textContent = sel.has('jalapa') ? 'Jalapa é purgante forte demais: o doente já está fraco.' : sel.size < 2 ? 'Falta algo: a receita pede dois ingredientes.' : sel.has('quina') ? 'A quina está certa; o outro ingrediente não acalma o ventre.' : 'Sem quina, a febre não cede.';
    };
    quit.onclick = () => { m.close(); done({ ok: false }); };
    m.body.append(grid, msg); m.foot.append(go, quit);
  });
}

// ------------------------------------------------------------ 3. Pesca
export function pesca() {
  return new Promise(done => {
    const m = open('Pescaria no Guaporé', 'Toque em <b>Fisgar</b> quando a linha estiver na zona verde. Pegue <b>3 peixes</b> antes de errar 3 vezes.');
    const { c, g, w, h } = canvasIn(m, 0.55);
    let t = 0, hits = 0, miss = 0, zone = 0.35 + Math.random() * 0.3, raf, last = performance.now(), flash = 0, flashCol = '#fff';
    let kd;
    const finish = r => { cancelAnimationFrame(raf); removeEventListener('keydown', kd); m.close(); done(r); };
    const pull = () => {
      const p = (Math.sin(t * 2.6) + 1) / 2;
      if (Math.abs(p - zone) < 0.09) { hits++; flash = 0.4; flashCol = '#7f7'; sfx('splash'); zone = 0.2 + Math.random() * 0.6; if (hits >= 3) { sfx('good'); return finish({ ok: true }); } }
      else { miss++; flash = 0.4; flashCol = '#f77'; sfx('bad'); if (miss >= 3) return finish({ ok: false }); }
    };
    const b = btn('Fisgar!', 'primary big'); b.onclick = pull; m.foot.appendChild(b);
    c.onpointerdown = pull;
    kd = e => { if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); pull(); } };
    addEventListener('keydown', kd);
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt; flash = Math.max(0, flash - dt);
      g.fillStyle = '#3d5a3a'; g.fillRect(0, 0, w, h * 0.3); g.fillStyle = '#4f6a3e'; g.fillRect(0, h * 0.3, w, h * 0.7);
      for (let i = 0; i < 12; i++) { g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect((i * 83 + t * 20) % w, h * 0.35 + (i * 37) % (h * 0.6), 30, 2); }
      const p = (Math.sin(t * 2.6) + 1) / 2;
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(20, h - 44, w - 40, 22);
      g.fillStyle = 'rgba(100,220,100,.7)'; g.fillRect(20 + (w - 40) * (zone - 0.09), h - 44, (w - 40) * 0.18, 22);
      g.fillStyle = flash > 0 ? flashCol : '#fff'; g.fillRect(20 + (w - 40) * p - 3, h - 48, 6, 30);
      g.fillStyle = '#e8d9b8'; g.font = '16px serif'; g.fillText('🐟'.repeat(hits) + '  ✗'.repeat(miss), 20, 26);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(w / 2, h * 0.45 + Math.sin(t * 5) * 3, 6, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h * 0.45); g.stroke();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    skipBtn(m, r => { removeEventListener('keydown', kd); cancelAnimationFrame(raf); done(r); });
  });
}

// ------------------------------------------------------------ 4. Montar a planta de Sambuceti
function drawPlan(g, S = 400) {
  g.fillStyle = '#e9d7aa'; g.fillRect(0, 0, S, S);
  const grd = g.createRadialGradient(S / 2, S / 2, S * 0.2, S / 2, S / 2, S * 0.75); grd.addColorStop(0, 'rgba(255,255,255,.15)'); grd.addColorStop(1, 'rgba(120,80,30,.35)');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(110,80,40,${Math.random() * 0.07})`; g.fillRect(Math.random() * S, Math.random() * S, 2, 2); }
  g.strokeStyle = '#4a3418'; g.lineWidth = 3; g.strokeRect(8, 8, S - 16, S - 16); g.lineWidth = 1; g.strokeRect(14, 14, S - 28, S - 28);
  const sc = 1.55, cx = S / 2, cy = S / 2 + 6, P = p => [cx + p.x * sc, cy + p.z * sc];
  const poly = (pts, fill, stroke, dash) => {
    g.beginPath(); pts.forEach((p, i) => { const [x, y] = P(p); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.setLineDash(dash || []); g.strokeStyle = stroke; g.stroke(); g.setLineDash([]); }
  };
  poly(W.COUNTER, 'rgba(70,110,140,.28)', '#2e5a78', [5, 3]);
  poly(W.TRACE, '#c9a77a', '#4a2a14'); g.lineWidth = 2; poly(W.INNER, '#e1cba0', '#4a2a14'); g.lineWidth = 1;
  g.fillStyle = '#8c4a30'; g.strokeStyle = '#4a2a14';
  for (const b of W.BUILDINGS) { if (b.x0 > 100) continue; const [x, y] = P({ x: b.x0, z: b.z0 }); g.fillRect(x, y, (b.x1 - b.x0) * sc, (b.z1 - b.z0) * sc); g.strokeRect(x, y, (b.x1 - b.x0) * sc, (b.z1 - b.z0) * sc); }
  g.fillStyle = '#3a2410'; g.font = 'italic 15px serif';
  [['I', -98, -98], ['II', 98, -98], ['III', 98, 98], ['IV', -98, 98]].forEach(([t, x, z]) => { const [px, py] = P({ x: x * 0.8, z: z * 0.8 }); g.fillText(t, px - 5, py + 5); });
  g.font = 'italic 12px serif'; g.fillText("Praça d'Armas", cx - 38, cy - 4); g.fillText('Portão', cx - 17, P({ x: 0, z: -78 })[1]);
  // cisterna marcada
  const [xx, xy] = P({ x: 20, z: 8 }); g.strokeStyle = '#a01818'; g.lineWidth = 3; g.beginPath(); g.moveTo(xx - 7, xy - 7); g.lineTo(xx + 7, xy + 7); g.moveTo(xx + 7, xy - 7); g.lineTo(xx - 7, xy + 7); g.stroke(); g.lineWidth = 1;
  // rosa dos ventos e escala
  g.save(); g.translate(S - 52, 54); g.strokeStyle = '#3a2410'; g.beginPath(); g.moveTo(0, -30); g.lineTo(6, 0); g.lineTo(0, 30); g.lineTo(-6, 0); g.closePath(); g.moveTo(-30, 0); g.lineTo(0, 6); g.lineTo(30, 0); g.lineTo(0, -6); g.closePath(); g.stroke(); g.fillStyle = '#3a2410'; g.font = 'bold 13px serif'; g.fillText('N', -4, -34); g.restore();
  g.fillStyle = '#3a2410'; g.fillRect(24, S - 38, 90, 3); g.font = '11px serif'; g.fillText('50 varas', 36, S - 44);
  g.font = 'italic 13px serif'; g.fillText('Planta do Real Forte do Príncipe da Beira', 70, 34);
}
export function planta() {
  return new Promise(done => {
    const m = open('Montar a planta de Sambuceti', 'Toque numa peça para escolher; toque em outra para <b>trocar</b>; toque de novo na escolhida (ou em <b>Girar</b>) para <b>rodar</b>. O fundo mostra o forte inteiro.');
    const { c, g, w, h } = canvasIn(m, 1);
    const off = document.createElement('canvas'); off.width = off.height = 400; drawPlan(off.getContext('2d'));
    let slot = [0, 1, 2, 3], rot = [0, 0, 0, 0], sel = -1, solved = false;
    for (let k = 0; k < 20; k++) { const i = Math.floor(Math.random() * 4), j = Math.floor(Math.random() * 4); [slot[i], slot[j]] = [slot[j], slot[i]]; [rot[i], rot[j]] = [rot[j], rot[i]]; }
    rot = rot.map((r, i) => (r + 1 + Math.floor(Math.random() * 3) * (i % 2)) % 4);
    const check = () => slot.every((p, i) => p === i) && rot.every(r => r === 0);
    function draw() {
      const cell = w / 2; g.fillStyle = '#2a1c0e'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 4; i++) {
        const cx = (i % 2) * cell + cell / 2, cy = Math.floor(i / 2) * cell + cell / 2, p = slot[i];
        g.save(); g.translate(cx, cy); g.rotate(rot[i] * Math.PI / 2);
        g.drawImage(off, (p % 2) * 200, Math.floor(p / 2) * 200, 200, 200, -cell / 2 + 3, -cell / 2 + 3, cell - 6, cell - 6); g.restore();
        if (sel === i) { g.strokeStyle = '#ffd36b'; g.lineWidth = 4; g.strokeRect((i % 2) * cell + 3, Math.floor(i / 2) * cell + 3, cell - 6, cell - 6); }
      }
    }
    const rotate = i => { rot[i] = (rot[i] + 1) % 4; sfx('tick'); };
    const finishCheck = () => { draw(); if (!solved && check()) { solved = true; sfx('good'); setTimeout(() => { m.close(); done({ ok: true }); }, 900); } };
    c.onpointerdown = e => {
      if (solved) return; const [px, py] = pos(c, e), i = (px > 0.5 ? 1 : 0) + (py > 0.5 ? 2 : 0);
      if (sel === i) rotate(i); else if (sel >= 0) { [slot[i], slot[sel]] = [slot[sel], slot[i]]; [rot[i], rot[sel]] = [rot[sel], rot[i]]; sel = -1; sfx('ui'); } else { sel = i; sfx('tick'); }
      finishCheck();
    };
    const gb = btn('↻ Girar', 'primary'); gb.onclick = () => { if (sel >= 0 && !solved) { rotate(sel); finishCheck(); } };
    m.foot.appendChild(gb); skipBtn(m, done); draw();
  });
}

// ------------------------------------------------------------ 5. Cadeado de combinação
export function cadeado() {
  return new Promise(done => {
    const m = open('Cadeado do paiol', 'Sambuceti deixou o segredo na planta: <i>quantos baluartes tem o forte; quantas bocas de fogo guarda cada um; quantos metros mede a muralha.</i> Consulte o Diário (Códice).');
    const val = [0, 0, 0].map(() => Math.floor(Math.random() * 21));
    const row = document.createElement('div'); row.className = 'dials'; const out = [];
    val.forEach((v, i) => {
      const col = document.createElement('div'); col.className = 'dial';
      const up = btn('▲', 'chip'), dn = btn('▼', 'chip'), num = document.createElement('div'); num.className = 'num'; num.textContent = v;
      up.onclick = () => { val[i] = (val[i] + 1) % 21; num.textContent = val[i]; sfx('lock'); };
      dn.onclick = () => { val[i] = (val[i] + 20) % 21; num.textContent = val[i]; sfx('lock'); };
      col.append(up, num, dn); row.appendChild(col); out.push(num);
    });
    const msg = document.createElement('div'); msg.className = 'mgmsg';
    const go = btn('Abrir', 'primary'), quit = btn('Sair', 'ghost small');
    go.onclick = () => { if (val.every((v, i) => v === CODE[i])) { sfx('open'); m.close(); done({ ok: true }); } else { sfx('bad'); msg.textContent = 'O cadeado não cede. Conte de novo.'; row.classList.add('shake'); setTimeout(() => row.classList.remove('shake'), 400); } };
    quit.onclick = () => { m.close(); done({ ok: false }); };
    m.body.append(row, msg); m.foot.append(go, quit);
  });
}

// ------------------------------------------------------------ 6. Salva de onze tiros
export function salva() {
  return new Promise(done => {
    const m = open('Salva de onze tiros', 'Toque (ou pressione <b>Espaço</b>) quando o anel dourado encontrar o círculo. Acerte pelo menos <b>7</b> dos 11 tiros.');
    const { c, g, w, h } = canvasIn(m, 0.9);
    let shot = 0, hits = 0, t = 0, state = 'wait', wait = 0.8, last = performance.now(), raf, msg = '', msgT = 0;
    const DUR = 1.5, R0 = Math.min(w, h) * 0.45, R1 = R0 * 0.28;
    const fire = () => {
      if (state !== 'ring') return;
      const r = R0 + (R1 - R0) * (t / DUR), good = Math.abs(r - R1) < R1 * 0.38;
      if (good) { hits++; msg = 'Fogo!'; sfx('cannon'); } else { msg = r > R1 ? 'Cedo!' : 'Tarde!'; sfx('bad'); }
      msgT = 0.5; state = 'wait'; wait = 0.5; shot++;
    };
    c.onpointerdown = fire; const kd = e => { if (e.code === 'Space') { e.preventDefault(); fire(); } }; addEventListener('keydown', kd);
    const finish = r => { cancelAnimationFrame(raf); removeEventListener('keydown', kd); m.close(); done(r); };
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; msgT = Math.max(0, msgT - dt);
      if (state === 'wait') { wait -= dt; if (shot >= 11) { if (hits >= 7) { sfx('good'); return finish({ ok: true, hits }); } shot = 0; hits = 0; msg = 'Poucos tiros. Repetindo...'; msgT = 1.2; wait = 1.4; } if (wait <= 0) { state = 'ring'; t = 0; } }
      else { t += dt; if (t >= DUR) { msg = 'Tarde!'; msgT = 0.5; sfx('bad'); state = 'wait'; wait = 0.5; shot++; } }
      g.fillStyle = '#26333f'; g.fillRect(0, 0, w, h);
      const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#3c5a73'); grd.addColorStop(1, '#6a7a4a'); g.fillStyle = grd; g.fillRect(0, 0, w, h);
      g.fillStyle = '#5b3a1e'; g.fillRect(w * 0.1, h - 40, w * 0.8, 40); g.fillStyle = '#222'; g.beginPath(); g.ellipse(w / 2, h - 52, 34, 12, 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 3; g.beginPath(); g.arc(w / 2, h * 0.42, R1, 0, 7); g.stroke();
      if (state === 'ring') { const r = R0 + (R1 - R0) * (t / DUR); g.strokeStyle = '#ffd36b'; g.lineWidth = 5; g.beginPath(); g.arc(w / 2, h * 0.42, Math.max(4, r), 0, 7); g.stroke(); }
      g.fillStyle = '#fff'; g.font = '18px serif'; g.fillText(`Tiro ${Math.min(11, shot + 1)}/11 · acertos ${hits}`, 14, 26);
      if (msgT > 0) { g.font = 'bold 28px serif'; g.fillStyle = '#ffd36b'; g.fillText(msg, w / 2 - 50, h * 0.42 + 10); }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    skipBtn(m, r => { cancelAnimationFrame(raf); removeEventListener('keydown', kd); done(r); });
  });
}

// ------------------------------------------------------------ 7. Içar a bandeira
export function bandeira() {
  return new Promise(done => {
    const m = open('Içar a bandeira real', '<b>Segure</b> o botão para puxar a corda. Mantenha a tensão na faixa dourada: se passar do limite, a corda range.');
    const { c, g, w, h } = canvasIn(m, 1.1);
    let tension = 0.2, prog = 0, hold = false, last = performance.now(), raf;
    const down = () => { hold = true; }, up = () => { hold = false; };
    c.onpointerdown = down; c.onpointerup = up; c.onpointerleave = up;
    const b = btn('Puxar (segure)', 'primary big'); b.onpointerdown = down; b.onpointerup = up; b.onpointerleave = up; m.foot.appendChild(b);
    const kd = e => { if (e.code === 'Space') { e.preventDefault(); hold = true; } }, ku = e => { if (e.code === 'Space') hold = false; };
    addEventListener('keydown', kd); addEventListener('keyup', ku);
    const finish = r => { cancelAnimationFrame(raf); removeEventListener('keydown', kd); removeEventListener('keyup', ku); m.close(); done(r); };
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      tension += (hold ? 0.55 : -0.5) * dt; tension = Math.max(0, Math.min(1, tension));
      if (tension > 0.4 && tension < 0.72) prog += dt * 0.18; else if (tension >= 0.9) { prog = Math.max(0, prog - dt * 0.1); }
      if (prog >= 1) { sfx('bell'); return finish({ ok: true }); }
      g.fillStyle = '#6fa0c8'; g.fillRect(0, 0, w, h * 0.7); g.fillStyle = '#6a7a4a'; g.fillRect(0, h * 0.7, w, h * 0.3);
      g.fillStyle = '#3a2a1a'; g.fillRect(w * 0.3 - 4, 20, 8, h * 0.72);
      const fy = h * 0.72 - prog * (h * 0.64);
      g.fillStyle = '#f2ede0'; g.fillRect(w * 0.3 + 6, fy, 90, 58); g.strokeStyle = '#1b3a8a'; g.lineWidth = 3; g.strokeRect(w * 0.3 + 6, fy, 90, 58);
      g.fillStyle = '#b3202a'; g.fillRect(w * 0.3 + 38, fy + 14, 26, 32);
      g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(w - 50, 20, 24, h * 0.6); g.fillStyle = 'rgba(255,211,107,.55)'; g.fillRect(w - 50, 20 + h * 0.6 * (1 - 0.72), 24, h * 0.6 * 0.32);
      g.fillStyle = tension >= 0.9 ? '#f55' : '#fff'; g.fillRect(w - 54, 20 + h * 0.6 * (1 - tension) - 3, 32, 6);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    skipBtn(m, r => { cancelAnimationFrame(raf); removeEventListener('keydown', kd); removeEventListener('keyup', ku); done(r); });
  });
}

export const MG = { canoe, botica, pesca, planta, cadeado, salva, bandeira };
