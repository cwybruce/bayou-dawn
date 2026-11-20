// Bayou Dawn — configuration: a Louisiana bayou swamp town at dawn.
// Top-down open world, 2600 x 1900 world units. Water is the base terrain;
// roads, town plots and docks are land rectangles laid over it.
export const WORLD = { width: 2600, height: 1900 };
export const STEP = 1 / 60;
export const BEST_KEY = 'bayou-dawn-best-cash';
export const SAVE_KEY = 'bayou-dawn-save';

// Dawn palette: black water, mist, muddy banks, stilt-house timber.
export const COLORS = {
  waterDeep: '#0d2b2e',
  water: '#123a3d',
  waterShallow: '#1d4a44',
  mud: '#5a4a33',
  grass: '#3d5230',
  road: '#2e2a26',
  roadLine: '#c9a86a',
  dock: '#7a5c38',
  dockDark: '#5d452a',
  houseWall: '#8a6b45',
  houseRoof: '#a34d2d',
  houseRoof2: '#4d6b52',
  tree: '#1e3d24',
  treeLight: '#2f5a35',
  mist: 'rgba(214, 228, 222, 0.10)',
  player: '#e8b23a',
  police: '#2f6fd0',
  airboat: '#c94f2e',
  car: '#7a8a99',
};

export const PLAYER = {
  radius: 13,
  walkSpeed: 170,
  wadeSpeed: 70,
  health: 100,
  shootCooldown: 0.28,
  bulletSpeed: 620,
  bulletRange: 420,
};

export const VEHICLE = {
  carAccel: 420,
  carMax: 330,
  carReverse: 140,
  boatAccel: 520,
  boatMax: 430,
  boatReverse: 120,
  turn: 2.6,
};

// Mission chain: meet Odette -> take the airboat -> swamp drop -> lose the heat -> deliver.
export const MISSIONS = [
  { id: 0, title: 'Meet Mama Odette', text: 'Walk to the shack on stilts. Mama Odette has work for you.', target: { x: 1180, y: 700 }, reward: 0 },
  { id: 1, title: 'Borrow the airboat', text: 'Take the airboat at the dock. Press E to climb aboard.', target: { x: 1560, y: 1240 }, reward: 0 },
  { id: 2, title: 'Run the swamp drop', text: 'Race the airboat through the bayou to the drop buoy. Watch for gators.', target: { x: 2260, y: 300 }, reward: 150 },
  { id: 3, title: 'Lose the heat', text: 'The law is on you. Stay out of sight for 20 seconds, then bring the goods home.', target: { x: 1180, y: 700 }, reward: 350 },
];
