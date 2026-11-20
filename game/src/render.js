// Bayou Dawn — renderer: dawn light over black water, mist, stilt houses,
// cypress trees, docks, traffic and police, plus the HUD and minimap.
import { WORLD, COLORS, MISSIONS } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_COMPLETE = 'complete';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let camX = 0;
  let camY = 0;
  let width = 0;
  let height = 0;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  function toScreen(x, y) {
    return { x: x - camX + width / 2, y: y - camY + height / 2 };
  }

  function drawVehicle(v, isPlayer) {
    const s = toScreen(v.x, v.y);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(v.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(ctx, -24, -12, 52, 28, 8);
    ctx.fill();
    ctx.fillStyle = v.color;
    if (v.kind === 'boat') {
      // Airboat: long hull, big fan cage at the back.
      roundRect(ctx, -30, -13, 60, 26, 10);
      ctx.fill();
      ctx.fillStyle = '#e8e0c8';
      roundRect(ctx, -6, -9, 18, 18, 4);
      ctx.fill();
      ctx.strokeStyle = '#3a2a1a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(-24, 0, 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#f2ead0';
      ctx.fillRect(-34, -2, 8, 4);
    } else {
      roundRect(ctx, -24, -12, 48, 24, 7);
      ctx.fill();
      ctx.fillStyle = '#bcd6e8';
      roundRect(ctx, -6, -10, 14, 20, 3);
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.fillRect(-20, -13, 6, 4);
      ctx.fillRect(-20, 9, 6, 4);
      ctx.fillRect(14, -13, 6, 4);
      ctx.fillRect(14, 9, 6, 4);
    }
    if (v.police) {
      const on = Math.floor(performance.now() / 300) % 2 === 0;
      ctx.fillStyle = on ? '#ff3b30' : '#2f6fd0';
      ctx.fillRect(-4, -13, 8, 5);
      ctx.fillStyle = on ? '#2f6fd0' : '#ff3b30';
      ctx.fillRect(-4, 8, 8, 5);
    }
    ctx.restore();
    if (isPlayer) {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 34, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function draw(state, screen, best) {
    const p = state.player;
    camX = Math.max(width / 2 - 40, Math.min(WORLD.width - width / 2 + 40, p.x));
    camY = Math.max(height / 2 - 40, Math.min(WORLD.height - height / 2 + 40, p.y));
    if (width >= WORLD.width) camX = WORLD.width / 2;
    if (height >= WORLD.height) camY = WORLD.height / 2;

    // Water.
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#16383a');
    grad.addColorStop(0.5, COLORS.water);
    grad.addColorStop(1, '#0d2b2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    // Water ripples.
    ctx.strokeStyle = 'rgba(120,180,170,0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 40; i += 1) {
      const wx = ((i * 173 + state.t * 12) % (WORLD.width + 200)) - 100;
      const wy = (i * 271) % WORLD.height;
      const s = toScreen(wx, wy);
      if (s.x < -60 || s.x > width + 60 || s.y < -10 || s.y > height + 10) continue;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + 46, s.y);
      ctx.stroke();
    }

    // Land plots: muddy grass.
    for (const r of state.plots) {
      const s = toScreen(r.x, r.y);
      ctx.fillStyle = COLORS.grass;
      ctx.fillRect(s.x, s.y, r.w, r.h);
      ctx.fillStyle = 'rgba(90,74,51,0.5)';
      ctx.fillRect(s.x, s.y + r.h - 14, r.w, 14);
    }
    // Roads.
    for (const r of state.roads) {
      const s = toScreen(r.x, r.y);
      ctx.fillStyle = COLORS.road;
      ctx.fillRect(s.x, s.y, r.w, r.h);
      ctx.strokeStyle = COLORS.roadLine;
      ctx.lineWidth = 2;
      ctx.setLineDash([18, 18]);
      ctx.beginPath();
      if (r.w > r.h) {
        ctx.moveTo(s.x, s.y + r.h / 2);
        ctx.lineTo(s.x + r.w, s.y + r.h / 2);
      } else {
        ctx.moveTo(s.x + r.w / 2, s.y);
        ctx.lineTo(s.x + r.w / 2, s.y + r.h);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // Docks: wooden planks.
    for (const r of state.docks) {
      const s = toScreen(r.x, r.y);
      ctx.fillStyle = COLORS.dock;
      ctx.fillRect(s.x, s.y, r.w, r.h);
      ctx.strokeStyle = COLORS.dockDark;
      ctx.lineWidth = 2;
      for (let y = r.y + 18; y < r.y + r.h; y += 18) {
        const a = toScreen(r.x, y);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(a.x + r.w, a.y);
        ctx.stroke();
      }
    }
    // Stilt houses.
    for (const h of state.houses) {
      const s = toScreen(h.x, h.y);
      ctx.fillStyle = '#3a2a1a';
      for (const lx of [8, h.w - 8]) {
        ctx.fillRect(s.x + lx - 2, s.y + h.h, 4, 16);
      }
      ctx.fillStyle = '#8a6b45';
      ctx.fillRect(s.x, s.y, h.w, h.h);
      ctx.fillStyle = h.roof;
      ctx.beginPath();
      ctx.moveTo(s.x - 6, s.y);
      ctx.lineTo(s.x + h.w / 2, s.y - 22);
      ctx.lineTo(s.x + h.w + 6, s.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffe9a8';
      ctx.fillRect(s.x + h.w / 2 - 7, s.y + h.h / 2 - 5, 14, 18);
      if (h.label) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(h.label, s.x + h.w / 2, s.y - 28);
      }
    }
    // Cypress trees.
    for (const t of state.trees) {
      const s = toScreen(t.x, t.y);
      if (s.x < -40 || s.x > width + 40 || s.y < -40 || s.y > height + 40) continue;
      ctx.fillStyle = COLORS.tree;
      ctx.beginPath();
      ctx.arc(s.x, s.y, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.treeLight;
      ctx.beginPath();
      ctx.arc(s.x - t.r * 0.25, s.y - t.r * 0.25, t.r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    // Cash crates.
    for (const c of state.crates) {
      if (c.taken) continue;
      const s = toScreen(c.x, c.y);
      ctx.fillStyle = '#c9a86a';
      ctx.fillRect(s.x - 10, s.y - 10, 20, 20);
      ctx.strokeStyle = '#5d452a';
      ctx.lineWidth = 2;
      ctx.strokeRect(s.x - 10, s.y - 10, 20, 20);
      ctx.fillStyle = '#5d452a';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', s.x, s.y + 4);
    }
    // Mission marker: pulsing diamond + ring at the target.
    if (!state.completed && state.missionIndex < MISSIONS.length) {
      const m = MISSIONS[state.missionIndex];
      const s = toScreen(m.target.x, m.target.y);
      const pulse = 1 + Math.sin(state.t * 4) * 0.15;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(12, 0);
      ctx.lineTo(0, 18);
      ctx.lineTo(-12, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,210,62,0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // Gators.
    for (const g of state.gators) {
      const s = toScreen(g.x, g.y);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(g.angle);
      ctx.fillStyle = '#2a4a26';
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8e0c8';
      ctx.beginPath();
      ctx.arc(16, -4, 2.5, 0, Math.PI * 2);
      ctx.arc(16, 4, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Thugs.
    for (const t of state.thugs) {
      if (!t.alive) continue;
      const s = toScreen(t.x, t.y);
      ctx.fillStyle = '#8a2f2f';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', s.x, s.y + 4);
    }
    // Pedestrians.
    for (const ped of state.peds) {
      const s = toScreen(ped.x, ped.y);
      ctx.fillStyle = ped.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    // Traffic, police, player vehicles.
    for (const car of state.traffic) drawVehicle(car, false);
    for (const pc of state.police) drawVehicle(pc, false);
    for (const v of state.vehicles) drawVehicle(v, p.vehicle === v);
    // Bullets.
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 3;
    for (const b of state.bullets) {
      const s = toScreen(b.x, b.y);
      ctx.beginPath();
      ctx.moveTo(s.x - Math.cos(b.angle) * 10, s.y - Math.sin(b.angle) * 10);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
    }
    // Player on foot: Cole in his yellow hat.
    if (!p.vehicle) {
      const s = toScreen(p.x, p.y);
      ctx.fillStyle = '#2a2a2a';
      ctx.beginPath();
      ctx.arc(s.x, s.y, PLAYER_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.player;
      ctx.beginPath();
      ctx.arc(s.x, s.y, PLAYER_R + 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a2a2a';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.player;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + Math.cos(p.angle) * 20, s.y + Math.sin(p.angle) * 20);
      ctx.stroke();
    }
    // Drifting mist.
    ctx.fillStyle = COLORS.mist;
    for (const m of state.mist) {
      const s = toScreen(m.x, m.y);
      if (s.x < -200 || s.x > width + 200 || s.y < -200 || s.y > height + 200) continue;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, m.r, m.r * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Dawn glow at the top of the frame.
    const dawn = ctx.createLinearGradient(0, 0, 0, 140);
    dawn.addColorStop(0, 'rgba(255,170,90,0.20)');
    dawn.addColorStop(1, 'rgba(255,170,90,0)');
    ctx.fillStyle = dawn;
    ctx.fillRect(0, 0, width, 140);

    drawHUD(state, screen, best);
  }

  function drawHUD(state, screen, best) {
    const p = state.player;
    ctx.textAlign = 'left';
    // Top-left: cash, health, wanted.
    ctx.fillStyle = 'rgba(8,20,20,0.72)';
    roundRect(ctx, 14, 14, 250, 92, 10);
    ctx.fill();
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`$${p.cash}`, 28, 44);
    ctx.fillStyle = '#fff';
    ctx.font = '13px sans-serif';
    ctx.fillText(`Best $${best}  •  Jobs done: ${state.jobsDone}`, 28, 64);
    ctx.fillStyle = '#333';
    ctx.fillRect(28, 72, 160, 10);
    ctx.fillStyle = p.health > 30 ? '#5ec95e' : '#e05e4e';
    ctx.fillRect(28, 72, Math.max(0, 160 * (p.health / 100)), 10);
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('★'.repeat(p.wanted) + '☆'.repeat(Math.max(0, 5 - p.wanted)), 28, 100);
    // Mission line.
    if (!state.completed && state.missionIndex < MISSIONS.length) {
      const m = MISSIONS[state.missionIndex];
      ctx.fillStyle = 'rgba(8,20,20,0.72)';
      roundRect(ctx, 14, height - 86, Math.min(width - 28, 560), 72, 10);
      ctx.fill();
      ctx.fillStyle = '#ffd23e';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(`${m.title}`, 28, height - 58);
      ctx.fillStyle = '#e8f0ea';
      ctx.font = '14px sans-serif';
      ctx.fillText(m.text, 28, height - 34);
    } else if (state.completed) {
      ctx.fillStyle = 'rgba(8,20,20,0.72)';
      roundRect(ctx, 14, height - 86, 480, 72, 10);
      ctx.fill();
      ctx.fillStyle = '#ffd23e';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('Free roam — the bayou is yours', 28, height - 58);
      ctx.fillStyle = '#e8f0ea';
      ctx.font = '14px sans-serif';
      ctx.fillText('Grab crates, steal a car, or just watch the mist.', 28, height - 34);
    }
    // Toast message.
    if (state.messageTimer > 0) {
      ctx.fillStyle = 'rgba(8,20,20,0.8)';
      const msg = state.message;
      ctx.font = '15px sans-serif';
      const w = ctx.measureText(msg).width + 32;
      roundRect(ctx, (width - w) / 2, 14, w, 34, 8);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(msg, width / 2, 37);
      ctx.textAlign = 'left';
    }
    // Controls hint.
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '12px sans-serif';
    ctx.fillText('WASD drive / walk • E enter vehicle • Click shoot • P pause • M mute', 14, height - 8 - 86 > 120 ? height - 100 : 118);
    // Speed when driving.
    if (p.vehicle) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(Math.abs(p.vehicle.speed) * 0.18)} mph`, width - 180, height - 24);
      ctx.textAlign = 'left';
    }
    drawMinimap(state);
    // Screen overlays.
    if (screen === SCREEN_TITLE) {
      ctx.fillStyle = 'rgba(6,16,18,0.55)';
      ctx.fillRect(0, 0, width, height);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd23e';
      ctx.font = 'bold 72px sans-serif';
      ctx.fillText('BAYOU DAWN', width / 2, height / 2 - 60);
      ctx.fillStyle = '#fff';
      ctx.font = '26px sans-serif';
      ctx.fillText("Cole's Run — a Louisiana swamp-town crime story", width / 2, height / 2 - 16);
      ctx.font = '18px sans-serif';
      ctx.fillStyle = '#cfe8dc';
      ctx.fillText('Airboats, stilt houses, gators — and Mama Odette has a job for you.', width / 2, height / 2 + 22);
      ctx.fillStyle = '#ffd23e';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('Press Enter to start', width / 2, height / 2 + 76);
      ctx.textAlign = 'left';
    } else if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(6,16,18,0.6)';
      ctx.fillRect(0, 0, width, height);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 44px sans-serif';
      ctx.fillText('Paused', width / 2, height / 2);
      ctx.font = '18px sans-serif';
      ctx.fillText('Press P to keep playing', width / 2, height / 2 + 36);
      ctx.textAlign = 'left';
    } else if (screen === SCREEN_OVER) {
      ctx.fillStyle = 'rgba(20,6,6,0.62)';
      ctx.fillRect(0, 0, width, height);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff6b5e';
      ctx.font = 'bold 56px sans-serif';
      ctx.fillText('BUSTED', width / 2, height / 2 - 20);
      ctx.fillStyle = '#fff';
      ctx.font = '20px sans-serif';
      ctx.fillText(`The sheriff took $100. Cash kept: $${p.cash}. Press Enter to try again.`, width / 2, height / 2 + 24);
      ctx.textAlign = 'left';
    } else if (screen === SCREEN_COMPLETE) {
      ctx.fillStyle = 'rgba(6,20,10,0.55)';
      ctx.fillRect(0, 0, width, height);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd23e';
      ctx.font = 'bold 56px sans-serif';
      ctx.fillText('JOB DONE', width / 2, height / 2 - 20);
      ctx.fillStyle = '#fff';
      ctx.font = '20px sans-serif';
      ctx.fillText(`$500 earned on the swamp run. Press Enter to keep roaming the bayou.`, width / 2, height / 2 + 24);
      ctx.textAlign = 'left';
    }
  }

  function drawMinimap(state) {
    const mw = 190;
    const mh = Math.round((mw * WORLD.height) / WORLD.width);
    const mx = width - mw - 14;
    const my = 14;
    const sx = mw / WORLD.width;
    const sy = mh / WORLD.height;
    ctx.fillStyle = 'rgba(8,20,20,0.72)';
    roundRect(ctx, mx - 6, my - 6, mw + 12, mh + 12, 8);
    ctx.fill();
    ctx.fillStyle = COLORS.water;
    ctx.fillRect(mx, my, mw, mh);
    ctx.fillStyle = COLORS.grass;
    for (const r of state.plots) ctx.fillRect(mx + r.x * sx, my + r.y * sy, r.w * sx, r.h * sy);
    ctx.fillStyle = COLORS.road;
    for (const r of state.roads) ctx.fillRect(mx + r.x * sx, my + r.y * sy, r.w * sx, r.h * sy);
    const p = state.player;
    if (!state.completed && state.missionIndex < MISSIONS.length) {
      const m = MISSIONS[state.missionIndex];
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath();
      ctx.arc(mx + m.target.x * sx, my + m.target.y * sy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#2f6fd0';
    for (const pc of state.police) {
      ctx.beginPath();
      ctx.arc(mx + pc.x * sx, my + pc.y * sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(mx + p.x * sx, my + p.y * sy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd23e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mx + p.x * sx, my + p.y * sy, 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  return {
    draw,
    get camera() {
      return { x: camX, y: camY, width, height };
    },
    get size() {
      return { width, height };
    },
  };
}

const PLAYER_R = 13;
