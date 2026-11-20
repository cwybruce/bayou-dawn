// Bayou Dawn — boot and the one loop: input is read every frame, the world
// advances in fixed 1/60 s steps, and the renderer paints what is there.
// The game moves between title, play, paused, busted and job-done screens.
// ?seed=N fixes the bayou. ?shot=start|play|chase|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, SAVE_KEY, STEP } from './config.js';
import { createWorld, createGame, EVENT_COMPLETE, EVENT_HIT, EVENT_MISSION, EVENT_OVER } from './world.js';
import { ACTION_CONFIRM, ACTION_ENTER, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_COMPLETE, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const game = createGame(seed);
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off: the best score then lasts this visit only.
  }
}

function saveGame() {
  try {
    const p = game.state.player;
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: p.cash, jobsDone: game.state.jobsDone, missionIndex: game.state.missionIndex,
    }));
  } catch {
    // Save is best-effort.
  }
}

function runShot(name) {
  const scene = stageShot(name, game);
  let painted = 0;
  function paint() {
    renderer.draw(game.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    game.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing. Go see Mama Odette.');
  }

  function endGame(busted) {
    screen = busted ? SCREEN_OVER : SCREEN_COMPLETE;
    const p = game.state.player;
    if (p.cash > best) {
      best = p.cash;
      saveBest(best);
    }
    saveGame();
    if (busted) {
      audio.bust();
      announce(`Busted. Cash $${p.cash}. Best $${best}.`);
    } else {
      announce(`Job done. Cash $${p.cash}. Best $${best}.`);
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_COMPLETE)) {
      if (screen === SCREEN_OVER) game.bust();
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    if (actions & ACTION_ENTER && screen === SCREEN_PLAY) {
      const got = game.enterVehicle();
      if (got === 'car' || got === 'boat') announce(got === 'boat' ? 'Aboard the airboat.' : 'In the car.');
      else if (got === 'on foot') announce('On foot.');
    }
  }

  function aimAngle() {
    const cam = renderer.camera;
    const size = renderer.size;
    const mouse = input.mouse;
    const worldX = mouse.x - size.width / 2 + cam.x;
    const worldY = mouse.y - size.height / 2 + cam.y;
    const p = game.state.player;
    return Math.atan2(worldY - p.y, worldX - p.x);
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      game.step(STEP, { x: 0, y: 0 }, null);
      return;
    }
    const clicked = input.takeClick();
    const shooting = clicked || input.mouseDown
      ? { fire: true, angle: aimAngle() }
      : null;
    if (shooting) audio.shot();
    const events = game.step(STEP, input.direction(), shooting);
    const p = game.state.player;
    audio.setEngine(Boolean(p.vehicle), p.vehicle ? p.vehicle.speed : 0);
    if (events & EVENT_HIT) announce('Hit!');
    if (events & EVENT_MISSION) {
      audio.pickup();
      saveGame();
    }
    if (events & EVENT_COMPLETE) {
      audio.pickup();
      endGame(false);
    } else if (events & EVENT_OVER) {
      if (p.health <= 0 || game.state.player.bustedTimer > 1.5) {
        if (game.state.player.bustedTimer > 1.5) game.bust();
        endGame(true);
      } else {
        endGame(true);
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(game.state, screen, best);
  }

  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

export { createWorld };
