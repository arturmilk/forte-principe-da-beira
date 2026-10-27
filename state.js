// Estado do jogo compartilhado entre os módulos
export const S = {
  flags: {}, inv: [], codex: [], phase: 'manha', played: 0, started: false,
};
// preenchido por game.js: toast, give, take, say, mg, phase, card, refresh
export const G = {};
export const has = id => S.inv.includes(id);
export const f = k => !!S.flags[k];
export const setf = (k, v = true) => { S.flags[k] = v; G.refresh && G.refresh(); };
export const fresh = () => { S.flags = {}; S.inv = []; S.codex = []; S.phase = 'manha'; S.played = 0; S.started = false; };
