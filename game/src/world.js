// Bayou Dawn — the world: a Louisiana swamp town at dawn.
// Water is the base terrain. Roads, town plots and docks are land rectangles.
// Cole walks, wades, drives a pickup on the roads and an airboat on the black
// water. Traffic follows the roads, pedestrians wander the town, gators patrol
// the water, police chase when the wanted level rises, and Mama Odette's four
// jobs chain into one run: meet her, take the airboat, run the swamp drop,
// lose the heat and deliver.
import { WORLD, PLAYER, VEHICLE, MISSIONS } from './config.js';
import { createRandom, pick, range } from './random.js';

export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_MISSION = 4;
export const EVENT_COMPLETE = 8;
export const EVENT_CRIME = 16;

// Land rectangles: roads first, then town plots, the shack plot and docks.
const ROADS = [
  { x: 80, y: 900, w: 2440, h: 110 },   // Main Street, east-west
  { x: 1240, y: 80, w: 120, h: 1740 }, // Cross Street, north-south
  { x: 300, y: 380, w: 1750, h: 90 },  // North Road (ends at the east water channel)
  { x: 300, y: 1500, w: 1750, h: 90 }, // South Road (ends at the east water channel)
];
const PLOTS = [
  { x: 1080, y: 580, w: 260, h: 180 },  // Odette's shack plot
  { x: 700, y: 700, w: 300, h: 180 },
  { x: 1500, y: 700, w: 320, h: 180 },
  { x: 700, y: 1120, w: 300, h: 180 },
  { x: 1500, y: 1120, w: 320, h: 180 },
  { x: 1700, y: 380, w: 300, h: 160 },
  { x: 500, y: 1500, w: 280, h: 160 },
  { x: 1800, y: 1500, w: 300, h: 160 },
];
const DOCKS = [
  { x: 1500, y: 1010, w: 120, h: 290 }, // airboat dock, south of Main Street
  { x: 2100, y: 470, w: 110, h: 220 },  // north dock
  { x: 420, y: 1010, w: 110, h: 200 },  // west dock
];
const LAND = [...ROADS, ...PLOTS, ...DOCKS];

export function isLand(x, y) {
  for (const r of LAND) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
  }
  return false;
}

export function isRoad(x, y) {
  for (const r of ROADS) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
  }
  return false;
}

function inRect(x, y, r, pad) {
  return x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;
}

export function createWorld(rng) {
  const houses = [
    { x: 1120, y: 620, w: 90, h: 70, roof: '#a34d2d', label: "Odette's" },
    { x: 740, y: 730, w: 100, h: 80, roof: '#4d6b52' },
    { x: 1560, y: 730, w: 110, h: 80, roof: '#a34d2d' },
    { x: 740, y: 1150, w: 100, h: 80, roof: '#4d6b52' },
    { x: 1560, y: 1150, w: 110, h: 80, roof: '#a34d2d' },
    { x: 1740, y: 400, w: 100, h: 70, roof: '#4d6b52' },
    { x: 540, y: 1520, w: 100, h: 70, roof: '#a34d2d' },
    { x: 1840, y: 1520, w: 100, h: 70, roof: '#4d6b52' },
  ];
  const trees = [];
  for (let i = 0; i < 90; i += 1) {
    const x = range(rng, 60, WORLD.width - 60);
    const y = range(rng, 60, WORLD.height - 60);
    // Cypress crowd the banks and stand knee-deep in the shallows.
    if (isLand(x, y) || rng() < 0.45) trees.push({ x, y, r: range(rng, 14, 26) });
  }
  const crates = [];
  const crateSpots = [
    { x: 2000, y: 700 }, { x: 600, y: 500 }, { x: 2300, y: 1200 },
    { x: 400, y: 1700 }, { x: 1900, y: 1650 },
  ];
  for (const s of crateSpots) crates.push({ ...s, taken: false });

  const state = {
    t: 0,
    rng,
    houses,
    trees,
    crates,
    roads: ROADS,
    plots: PLOTS,
    docks: DOCKS,
    player: {
      x: 1150, y: 830, angle: -Math.PI / 2, speed: 0,
      health: PLAYER.health, vehicle: null, cash: 0, wanted: 0,
      wantedTimer: 0, bustedTimer: 0, hideTimer: 0, shootCooldown: 0,
    },
    vehicles: [
      { id: 'pickup', kind: 'car', x: 900, y: 955, angle: 0, speed: 0, color: '#7a8a99', stolen: false, traffic: false },
      { id: 'airboat', kind: 'boat', x: 1560, y: 1240, angle: Math.PI / 2, speed: 0, color: '#c94f2e', stolen: false, traffic: false },
    ],
    traffic: [],
    peds: [],
    police: [],
    thugs: [],
    gators: [],
    bullets: [],
    missionIndex: 0,
    jobsDone: 0,
    message: 'Dawn over the bayou. Go see Mama Odette.',
    messageTimer: 6,
    completed: false,
    mist: [],
  };

  for (let i = 0; i < 8; i += 1) {
    state.traffic.push({
      kind: 'car', x: range(rng, 200, 2400), y: 955, angle: rng() < 0.5 ? 0 : Math.PI,
      speed: range(rng, 90, 150), color: pick(rng, ['#5a7a8a', '#8a6a4a', '#6a5a7a', '#4a6a4a', '#9a8a5a']),
      axis: 'h', dir: rng() < 0.5 ? 1 : -1, traffic: true,
    });
  }
  for (let i = 0; i < 4; i += 1) {
    state.traffic.push({
      kind: 'car', x: 1300, y: range(rng, 200, 1700), angle: rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2,
      speed: range(rng, 90, 140), color: pick(rng, ['#5a7a8a', '#8a6a4a', '#6a5a7a']),
      axis: 'v', dir: rng() < 0.5 ? 1 : -1, traffic: true,
    });
  }
  for (let i = 0; i < 14; i += 1) {
    state.peds.push({
      x: range(rng, 650, 1900), y: range(rng, 650, 1350),
      angle: range(rng, 0, Math.PI * 2), speed: range(rng, 25, 45),
      color: pick(rng, ['#c9a86a', '#7a9a6a', '#9a6a6a', '#6a8a9a', '#b08a4a']),
      panic: 0,
    });
  }
  for (let i = 0; i < 6; i += 1) {
    state.gators.push({
      x: range(rng, 300, 2400), y: range(rng, 200, 1750),
      angle: range(rng, 0, Math.PI * 2), speed: range(rng, 12, 25), biteCooldown: 0,
    });
  }
  for (let i = 0; i < 26; i += 1) {
    state.mist.push({ x: range(rng, 0, WORLD.width), y: range(rng, 0, WORLD.height), r: range(rng, 60, 160), drift: range(rng, 4, 12) });
  }
  // Rival thugs guard the drop buoy, in the open water north of North Road.
  for (let i = 0; i < 4; i += 1) {
    state.thugs.push({
      x: 2260 + range(rng, -120, 120), y: 300 + range(rng, -80, 80),
      angle: 0, health: 30, shootCooldown: range(rng, 0.5, 2), alive: true,
    });
  }
  return state;
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pushOutOfHouses(state, e, radius) {
  for (const h of state.houses) {
    if (inRect(e.x, e.y, h, radius)) {
      const cx = Math.max(h.x, Math.min(e.x, h.x + h.w));
      const cy = Math.max(h.y, Math.min(e.y, h.y + h.h));
      const dx = e.x - cx;
      const dy = e.y - cy;
      const d = Math.hypot(dx, dy) || 1;
      e.x = cx + (dx / d) * radius;
      e.y = cy + (dy / d) * radius;
    }
  }
}

function spawnPolice(state) {
  const p = state.player;
  const want = Math.min(5, p.wanted + 1);
  while (state.police.length < want) {
    // Police roll in from the roads, never out of the swamp itself.
    let x = p.x;
    let y = p.y;
    for (let tries = 0; tries < 12; tries += 1) {
      const angle = Math.random() * Math.PI * 2;
      const d = 380 + Math.random() * 220;
      const cx = Math.max(80, Math.min(WORLD.width - 80, p.x + Math.cos(angle) * d));
      const cy = Math.max(80, Math.min(WORLD.height - 80, p.y + Math.sin(angle) * d));
      if (isLand(cx, cy)) { x = cx; y = cy; break; }
      x = cx; y = cy;
    }
    state.police.push({
      kind: 'car', x, y,
      angle: 0, speed: 0, color: '#2f6fd0', police: true, siren: 0,
    });
  }
}

export function createGame(seed) {
  const rng = createRandom(seed);
  let state = createWorld(rng);

  function reset() {
    state = createWorld(createRandom(seed));
  }

  function currentMission() {
    return MISSIONS[Math.min(state.missionIndex, MISSIONS.length - 1)];
  }

  function addWanted(n) {
    const p = state.player;
    const before = p.wanted;
    p.wanted = Math.min(5, p.wanted + n);
    p.wantedTimer = 0;
    if (p.wanted > before) spawnPolice(state);
    return p.wanted > before;
  }

  function step(dt, input, shooting) {
    const p = state.player;
    let events = 0;
    state.t += dt;
    if (state.messageTimer > 0) state.messageTimer -= dt;
    if (p.shootCooldown > 0) p.shootCooldown -= dt;

    // Mist drifts over the black water.
    for (const m of state.mist) {
      m.x += m.drift * dt;
      if (m.x > WORLD.width + 200) m.x = -200;
    }

    // --- Player movement: on foot, in a car, or in the airboat ---
    const veh = p.vehicle;
    if (veh) {
      const forward = -input.y; // W = forward
      const max = veh.kind === 'boat' ? VEHICLE.boatMax : VEHICLE.carMax;
      const accel = veh.kind === 'boat' ? VEHICLE.boatAccel : VEHICLE.carAccel;
      const onWater = !isLand(veh.x, veh.y);
      const grip = veh.kind === 'boat' ? (onWater ? 1 : 0.25) : (onWater ? 0.25 : 1);
      if (forward > 0) veh.speed = Math.min(max * grip, veh.speed + accel * grip * dt);
      else if (forward < 0) veh.speed = Math.max(-(veh.kind === 'boat' ? VEHICLE.boatReverse : VEHICLE.carReverse), veh.speed - accel * grip * dt);
      else veh.speed *= Math.pow(0.4, dt);
      if (Math.abs(veh.speed) > 5) veh.angle += input.x * VEHICLE.turn * dt * Math.sign(veh.speed);
      veh.x += Math.cos(veh.angle) * veh.speed * dt;
      veh.y += Math.sin(veh.angle) * veh.speed * dt;
      veh.x = Math.max(30, Math.min(WORLD.width - 30, veh.x));
      veh.y = Math.max(30, Math.min(WORLD.height - 30, veh.y));
      pushOutOfHouses(state, veh, 26);
      p.x = veh.x;
      p.y = veh.y;
      p.angle = veh.angle;
    } else {
      const inWater = !isLand(p.x, p.y);
      const speed = inWater ? PLAYER.wadeSpeed : PLAYER.walkSpeed;
      const len = Math.hypot(input.x, input.y) || 1;
      p.x += (input.x / len) * speed * dt * (input.x || input.y ? 1 : 0);
      p.y += (input.y / len) * speed * dt * (input.x || input.y ? 1 : 0);
      if (input.x || input.y) p.angle = Math.atan2(input.y, input.x);
      p.x = Math.max(20, Math.min(WORLD.width - 20, p.x));
      p.y = Math.max(20, Math.min(WORLD.height - 20, p.y));
      pushOutOfHouses(state, p, PLAYER.radius + 4);
    }

    // --- Shooting (mouse aim from main.js) ---
    if (shooting && shooting.fire && p.shootCooldown <= 0) {
      p.shootCooldown = PLAYER.shootCooldown;
      state.bullets.push({
        x: p.x, y: p.y, angle: shooting.angle,
        life: PLAYER.bulletRange / PLAYER.bulletSpeed,
      });
      addWanted(0); // firing near town draws attention via the hit below
      if (p.wanted === 0 && state.police.length === 0) {
        // A shot in the quiet town is a crime the law hears.
        if (Math.random() < 0.5) { addWanted(1); events |= EVENT_CRIME; }
      }
    }
    for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
      const b = state.bullets[i];
      b.x += Math.cos(b.angle) * PLAYER.bulletSpeed * dt;
      b.y += Math.sin(b.angle) * PLAYER.bulletSpeed * dt;
      b.life -= dt;
      let dead = b.life <= 0;
      for (const t of state.thugs) {
        if (t.alive && Math.hypot(t.x - b.x, t.y - b.y) < 16) {
          t.health -= 20;
          dead = true;
          if (t.health <= 0) {
            t.alive = false;
            p.cash += 25;
            state.message = 'Rival down. +$25.';
            state.messageTimer = 3;
          }
          break;
        }
      }
      for (const pc of state.police) {
        if (Math.hypot(pc.x - b.x, pc.y - b.y) < 20) {
          dead = true;
          addWanted(1);
          events |= EVENT_CRIME;
          break;
        }
      }
      if (dead) state.bullets.splice(i, 1);
    }

    // --- Traffic follows the roads ---
    for (const car of state.traffic) {
      if (car.axis === 'h') {
        car.x += car.dir * car.speed * dt;
        car.angle = car.dir > 0 ? 0 : Math.PI;
        if (car.x > 2500) { car.x = 2500; car.dir = -1; }
        if (car.x < 100) { car.x = 100; car.dir = 1; }
      } else {
        car.y += car.dir * car.speed * dt;
        car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        if (car.y > 1800) { car.y = 1800; car.dir = -1; }
        if (car.y < 100) { car.y = 100; car.dir = 1; }
      }
      // Traffic brakes for the player in its path.
      if (Math.hypot(car.x - p.x, car.y - p.y) < 70) car.speed = Math.max(30, car.speed - 200 * dt);
      else car.speed = Math.min(150, car.speed + 40 * dt);
    }

    // --- Pedestrians wander, and panic when the heat is on ---
    for (const ped of state.peds) {
      const d = Math.hypot(ped.x - p.x, ped.y - p.y);
      if (p.wanted >= 2 || (veh && Math.abs(veh.speed) > 200)) ped.panic = 2;
      if (ped.panic > 0) {
        ped.panic -= dt;
        ped.angle = Math.atan2(ped.y - p.y, ped.x - p.x);
        ped.x += Math.cos(ped.angle) * 90 * dt;
        ped.y += Math.sin(ped.angle) * 90 * dt;
      } else {
        if (Math.random() < dt * 0.2) ped.angle = Math.random() * Math.PI * 2;
        ped.x += Math.cos(ped.angle) * ped.speed * dt;
        ped.y += Math.sin(ped.angle) * ped.speed * dt;
        if (!isLand(ped.x, ped.y)) { ped.angle += Math.PI; ped.x += Math.cos(ped.angle) * 20; ped.y += Math.sin(ped.angle) * 20; }
      }
      ped.x = Math.max(20, Math.min(WORLD.width - 20, ped.x));
      ped.y = Math.max(20, Math.min(WORLD.height - 20, ped.y));
    }

    // --- Gators patrol the water and bite waders ---
    for (const g of state.gators) {
      if (Math.random() < dt * 0.1) g.angle = Math.random() * Math.PI * 2;
      g.x += Math.cos(g.angle) * g.speed * dt;
      g.y += Math.sin(g.angle) * g.speed * dt;
      if (isLand(g.x, g.y)) { g.angle += Math.PI; }
      g.x = Math.max(40, Math.min(WORLD.width - 40, g.x));
      g.y = Math.max(40, Math.min(WORLD.height - 40, g.y));
      if (g.biteCooldown > 0) g.biteCooldown -= dt;
      if (!veh && g.biteCooldown <= 0 && Math.hypot(g.x - p.x, g.y - p.y) < 30 && !isLand(p.x, p.y)) {
        p.health -= 15;
        g.biteCooldown = 3;
        events |= EVENT_HIT;
        state.message = 'A gator took a bite! Get out of the water.';
        state.messageTimer = 3;
      }
    }

    // --- Thugs shoot back near the drop ---
    for (const t of state.thugs) {
      if (!t.alive) continue;
      const d = Math.hypot(t.x - p.x, t.y - p.y);
      t.shootCooldown -= dt;
      if (d < 380 && t.shootCooldown <= 0) {
        t.shootCooldown = 1.6;
        t.angle = Math.atan2(p.y - t.y, p.x - t.x);
        state.bullets.push({ x: t.x, y: t.y, angle: t.angle, life: 0.9, enemy: true });
      }
    }
    // Enemy bullets hurt the player.
    for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
      const b = state.bullets[i];
      if (b.enemy && Math.hypot(b.x - p.x, b.y - p.y) < 16) {
        p.health -= 8;
        events |= EVENT_HIT;
        state.bullets.splice(i, 1);
      }
    }

    // --- Police chase, ram, and bust the player on foot ---
    if (p.wanted > 0) {
      spawnPolice(state);
      p.wantedTimer += dt;
      let nearest = Infinity;
      for (const pc of state.police) {
        const d = Math.hypot(pc.x - p.x, pc.y - p.y);
        nearest = Math.min(nearest, d);
        const wantAngle = Math.atan2(p.y - pc.y, p.x - pc.x);
        let diff = wantAngle - pc.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        pc.angle += Math.max(-2.2 * dt, Math.min(2.2 * dt, diff));
        // A patrol car bogs down badly off the road, in the bayou water.
        const pcGrip = isLand(pc.x, pc.y) ? 1 : 0.3;
        pc.speed = Math.min(360 * pcGrip, pc.speed + 300 * pcGrip * dt);
        pc.x += Math.cos(pc.angle) * pc.speed * dt;
        pc.y += Math.sin(pc.angle) * pc.speed * dt;
        pc.siren += dt;
        if (d < 34) {
          if (veh) {
            veh.speed *= 0.92;
            p.health -= 4 * dt;
            if (Math.random() < dt * 0.5) { events |= EVENT_HIT; }
          } else {
            p.bustedTimer += dt;
            if (p.bustedTimer > 1.5) {
              events |= EVENT_OVER;
              return events;
            }
          }
        }
      }
      if (nearest > 350) p.bustedTimer = 0;
      // Mission 3: stay unseen for 20 seconds.
      if (state.missionIndex === 3) {
        if (nearest > 350) {
          state.player.hideTimer += dt;
          if (state.player.hideTimer >= 20) {
            state.missionIndex = 4;
            state.completed = true;
            p.cash += MISSIONS[3].reward;
            state.jobsDone += 1;
            state.message = 'Delivered. Mama Odette pays $350. The bayou is yours — free roam.';
            state.messageTimer = 6;
            events |= EVENT_COMPLETE;
          }
        } else {
          state.player.hideTimer = Math.max(0, state.player.hideTimer - dt * 2);
        }
      }
      // Heat cools off if the player stays clean and far away.
      if (p.wantedTimer > 25 && nearest > 500) {
        p.wanted = Math.max(0, p.wanted - 1);
        p.wantedTimer = 0;
        state.police.length = Math.min(state.police.length, p.wanted + 1);
        if (p.wanted === 0) state.police.length = 0;
      }
    } else {
      state.police.length = 0;
      p.bustedTimer = 0;
    }

    // --- Crates: free-roam cash ---
    for (const c of state.crates) {
      if (!c.taken && Math.hypot(c.x - p.x, c.y - p.y) < 40) {
        c.taken = true;
        p.cash += 20;
        state.message = 'Found a stash crate. +$20.';
        state.messageTimer = 3;
      }
    }

    // --- Mission triggers ---
    if (!state.completed && state.missionIndex < MISSIONS.length) {
      const m = MISSIONS[state.missionIndex];
      const d = Math.hypot(m.target.x - p.x, m.target.y - p.y);
      if (state.missionIndex === 1) {
        // Boarding the airboat advances the job.
        if (veh && veh.kind === 'boat') {
          state.missionIndex = 2;
          p.cash += 0;
          state.message = 'Airboat away! Run the swamp drop at the buoy.';
          state.messageTimer = 4;
          events |= EVENT_MISSION;
        }
      } else if (d < 70) {
        if (state.missionIndex === 0) {
          state.missionIndex = 1;
          state.message = "Odette: 'Take my airboat at the south dock, cher. Don't scratch her.'";
          state.messageTimer = 5;
          events |= EVENT_MISSION;
        } else if (state.missionIndex === 2) {
          state.missionIndex = 3;
          p.cash += MISSIONS[2].reward;
          addWanted(2);
          state.message = 'Drop made! +$150 — but the law saw you. Lose them, then get home.';
          state.messageTimer = 5;
          events |= EVENT_MISSION;
        } else if (state.missionIndex === 3) {
          // Arriving home early does not finish the job; the hide timer does.
          state.message = 'Stay out of sight until the heat dies down.';
          state.messageTimer = 3;
        }
      }
    }

    if (p.health <= 0) {
      events |= EVENT_OVER;
    }
    return events;
  }

  function enterVehicle() {
    const p = state.player;
    if (p.vehicle) {
      const veh = p.vehicle;
      p.vehicle = null;
      p.x = veh.x + Math.cos(veh.angle + Math.PI / 2) * 40;
      p.y = veh.y + Math.sin(veh.angle + Math.PI / 2) * 40;
      veh.speed = 0;
      return 'on foot';
    }
    let best = null;
    let bestD = 70;
    for (const v of [...state.vehicles, ...state.traffic]) {
      const d = Math.hypot(v.x - p.x, v.y - p.y);
      if (d < bestD) { best = v; bestD = d; }
    }
    if (!best) return null;
    if (best.traffic && !best.stolen) {
      best.stolen = true;
      addWanted(1);
      state.message = 'You stole a car! The law is coming.';
      state.messageTimer = 4;
    }
    if (best.police) return null;
    p.vehicle = best;
    // A stolen traffic car joins the player's vehicles; stop its AI route.
    state.traffic = state.traffic.filter((c) => c !== best);
    if (!state.vehicles.includes(best)) state.vehicles.push(best);
    return best.kind;
  }

  function bust() {
    const p = state.player;
    p.cash = Math.max(0, p.cash - 100);
    p.health = PLAYER.health;
    p.wanted = 0;
    p.bustedTimer = 0;
    state.police.length = 0;
    if (p.vehicle) p.vehicle.speed = 0;
    p.vehicle = null;
    p.x = 1150;
    p.y = 830;
    state.message = 'Busted! The sheriff took $100. Odette bailed you out — again.';
    state.messageTimer = 5;
  }

  return {
    get state() { return state; },
    reset,
    step,
    enterVehicle,
    bust,
    currentMission,
    isLand,
    isRoad,
  };
}
