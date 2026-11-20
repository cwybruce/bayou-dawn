// Screenshot scenes for Bayou Dawn. Each one plays the real rules forward
// from a fresh world for a fixed number of steps, steered by a simple
// autopilot, so the frame is what a short game really looks like and the same
// seed always gives the same frame.
import { STEP, MISSIONS } from './config.js';
import { EVENT_OVER, EVENT_COMPLETE } from './world.js';
import { SCREEN_COMPLETE, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const CHASE_SECONDS = 20;
const SAMPLE = STEP;

/** Steer a vehicle toward a point: turn toward it, throttle forward. */
function steerToward(game, target) {
  const p = game.state.player;
  const veh = p.vehicle;
  if (!veh) return { x: 0, y: 0 };
  const want = Math.atan2(target.y - veh.y, target.x - veh.x);
  let diff = want - veh.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return { x: diff > 0.1 ? 1 : diff < -0.1 ? -1 : 0, y: -1 };
}

/** Steer through waypoints in order, moving to the next within 90 units. */
function steerWaypoints(game, waypoints, index) {
  const p = game.state.player;
  const veh = p.vehicle;
  if (!veh) return index;
  const target = waypoints[Math.min(index, waypoints.length - 1)];
  if (Math.hypot(target.x - veh.x, target.y - veh.y) < 90) return Math.min(index + 1, waypoints.length - 1);
  return index;
}

export function stageShot(name, game) {
  game.reset();
  const state = game.state;
  if (name !== 'play' && name !== 'chase' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / SAMPLE; i += 1) game.step(SAMPLE, { x: 0, y: 0 }, null);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    // Cole has met Odette (job 1 done) and boards the airboat; the autopilot
    // runs it down the east water channel to the drop buoy, staying in water:
    // south off the dock, east along the open south bayou, north up the
    // channel that the roads do not cross.
    state.missionIndex = 1;
    const boat = state.vehicles.find((v) => v.kind === 'boat');
    state.player.x = boat.x;
    state.player.y = boat.y;
    game.enterVehicle();
    const waypoints = [
      { x: 1560, y: 1700 },
      { x: 2250, y: 1700 },
      { x: 2250, y: 300 },
      MISSIONS[2].target,
    ];
    let wp = 0;
    for (let i = 0; i < PLAY_SECONDS / SAMPLE; i += 1) {
      wp = steerWaypoints(game, waypoints, wp);
      const input = steerToward(game, waypoints[wp]);
      if (game.step(SAMPLE, input, null) & EVENT_OVER) break;
    }
    return { screen: SCREEN_PLAY, best: state.player.cash };
  }
  if (name === 'chase') {
    // Cole in the pickup on Main Street, three stars, police closing in.
    // The autopilot paces up and down Main Street so the car stays on the road.
    state.missionIndex = 3;
    const car = state.vehicles.find((v) => v.kind === 'car');
    state.player.x = car.x;
    state.player.y = car.y;
    game.enterVehicle();
    state.player.wanted = 3;
    // Pace up and down Main Street: coast (brake) before each end so the
    // U-turn stays on the road instead of sliding into the bayou.
    let east = true;
    for (let i = 0; i < CHASE_SECONDS / SAMPLE; i += 1) {
      const p = state.player;
      if (east && p.x > 2250) east = false;
      if (!east && p.x < 150) east = true;
      const target = east ? { x: 2400, y: 955 } : { x: 200, y: 955 };
      const veh = p.vehicle;
      let input = steerToward(game, target);
      const nearEnd = Math.abs(target.x - p.x) < 350;
      if (nearEnd || (veh && Math.abs(veh.speed) > 200)) input.y = 0;
      // U-turn: reverse while turning (three-point turn) so the arc stays
      // on the road instead of sliding off into the bayou.
      if (veh) {
        const want = Math.atan2(target.y - veh.y, target.x - veh.x);
        let diff = want - veh.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) > 2.0 && Math.abs(veh.speed) < 120) {
          input = { x: diff > 0 ? 1 : -1, y: 1 };
        }
      }
      if (game.step(SAMPLE, input, null) & EVENT_OVER) break;
    }
    return { screen: state.player.health <= 0 ? SCREEN_OVER : SCREEN_PLAY, best: state.player.cash };
  }
  // end: the job is done — $500 earned, Odette paid, free roam ahead.
  state.missionIndex = MISSIONS.length;
  state.completed = true;
  state.jobsDone = 1;
  state.player.cash = 500;
  state.player.x = 1180;
  state.player.y = 760;
  state.message = 'Delivered. Mama Odette pays $350. The bayou is yours.';
  state.messageTimer = 6;
  for (let i = 0; i < 2 / SAMPLE; i += 1) game.step(SAMPLE, { x: 0, y: 0 }, null);
  return { screen: SCREEN_COMPLETE, best: 500 };
}

export { EVENT_COMPLETE };
