let canvas, ctx;
let gameActive = false;

// Base configuration node loaded dynamically
let catPlayer = {
  x: 200,
  y: 250,
  size: 16, 
  speed: 3.5,
  name: "Firepaw",
  clan: "ThunderClan",
  bodyStyle: "standard",
  furColor: "#d66a22",
  pattern: "solid",
  eyeColor: "#4caf50",
  marking: "none",
  hunger: 100,
  freshKillPile: 0
};

let keysPressed = {};
let preyEntities = [];
let pastLineages = [];
const BORDER_X = 400;

const MAP_OBSTACLES = [
  { x: 50, y: 70, width: 60, height: 60, name: "Highrocks Point" },
  { x: 670, y: 340, width: 80, height: 60, name: "Carrionplace Grid" },
  { x: 100, y: 380, width: 120, height: 30, name: "River Deep Skerries" },
  { x: 550, y: 80, width: 90, height: 40, name: "Moor Rock Gorse Pile" }
];

// Sound Synthesizer Node Engine via Web Audio API 
const AudioEngine = {
  ctx: null,
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioEngineContext || window.AudioContext)();
    }
  },
  playTone(freq, type, duration) {
    this.init();
    if (!this.ctx) return;
    try {
      let osc = this.ctx.createOscillator();
      let gainNode = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gainNode.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) { console.log("Audio contextual block safety active"); }
  },
  chirp() { this.playTone(880, "sine", 0.08); setTimeout(() => this.playTone(1320, "sine", 0.05), 40); },
  rustle() { this.playTone(180, "triangle", 0.15); },
  thud() { this.playTone(90, "sawtooth", 0.2); }
};

// Initial document rendering pipeline setup
window.addEventListener("DOMContentLoaded", () => {
  loadLineageHistory();
});

function loadLineageHistory() {
  const store = localStorage.getItem("warrior_clans_history_manifest");
  if (store) {
    pastLineages = JSON.parse(store);
    const container = document.getElementById("history-list");
    container.innerHTML = "";
    pastLineages.slice(-5).reverse().forEach(cat => {
      let li = document.createElement("li");
      li.innerText = `${cat.name} of ${cat.clan} - Caught: ${cat.freshKillPile} prey items`;
      container.appendChild(li);
    });
  }
}

function launchGame(isLoadMode) {
  document.getElementById("home-screen").classList.add("hidden");
  document.getElementById("simulation-view").classList.remove("hidden");

  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");

  if (isLoadMode) {
    const savedData = localStorage.getItem("warrior_cat_studio_life_v5");
    if (!savedData) {
      alert("No previous lives found in this browser cache. Spawning a new cat instead!");
      readMenuFormFields();
    } else {
      catPlayer = JSON.parse(savedData);
    }
  } else {
    readMenuFormFields();
  }

  generatePreyEcosystem();

  document.getElementById("hud-name").innerText = `${catPlayer.name} [${catPlayer.clan}]`;
  document.getElementById("hud-prey").innerText = catPlayer.freshKillPile;
  document.getElementById("hud-hunger").innerText = Math.floor(catPlayer.hunger);

  // Apply build configuration modifications dynamically
  if (catPlayer.bodyStyle === "massive") { catPlayer.size = 21; catPlayer.speed = 2.8; }
  else if (catPlayer.bodyStyle === "sleek") { catPlayer.size = 14; catPlayer.speed = 4.5; }
  else if (catPlayer.bodyStyle === "frail") { catPlayer.size = 12; catPlayer.speed = 3.3; }
  else { catPlayer.size = 16; catPlayer.speed = 3.5; }

  // Check for Broken/Twisted leg modifications
  if (catPlayer.marking === "twisted-foot") { catPlayer.speed *= 0.65; }

  gameActive = true;
  setupInputHandlers();
  window.requestAnimationFrame(runGameLoop);
  
  AudioEngine.chirp();
}

function readMenuFormFields() {
  const prefix = document.getElementById("dev-prefix").value || "Custom";
  const suffix = document.getElementById("dev-suffix").value;
  catPlayer.name = prefix + suffix;
  catPlayer.clan = document.getElementById("dev-clan").value;
  catPlayer.bodyStyle = document.getElementById("dev-body").value;
  catPlayer.furColor = document.getElementById("dev-color").value;
  catPlayer.pattern = document.getElementById("dev-pattern").value;
  catPlayer.eyeColor = document.getElementById("dev-eyes").value;
  catPlayer.marking = document.getElementById("dev-markings").value;
  catPlayer.hunger = 100;
  catPlayer.freshKillPile = 0;
  
  catPlayer.x = (catPlayer.clan === "ThunderClan" || catPlayer.clan === "RiverClan") ? 150 : 650;
  catPlayer.y = (catPlayer.clan === "ThunderClan" || catPlayer.clan === "WindClan") ? 150 : 350;
}

function generatePreyEcosystem() {
  preyEntities = [];
  for (let i = 0; i < 18; i++) {
    let targetX = Math.random() * (canvas.width - 40) + 20;
    let targetY = Math.random() * (canvas.height - 40) + 20;
    let type = "Mouse";
    let color = "#a1887f";

    if (targetX < BORDER_X) {
      if (targetY > 250) { type = "Carp"; color = "#4fc3f7"; }
    } else {
      if (targetY < 250) { type = "Rabbit"; color = "#e0e0e0"; }
      else { type = "Frog"; color = "#81c784"; }
    }

    preyEntities.push({
      x: targetX,
      y: targetY,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      type: type,
      color: color,
      radius: 4,
      caught: false
    });
  }
}

function setupInputHandlers() {
  window.addEventListener("keydown", (e) => { keysPressed[e.key.toLowerCase()] = true; });
  window.addEventListener("keyup", (e) => { keysPressed[e.key.toLowerCase()] = false; });

  const binds = [
    { id: "btn-up", key: "w" },
    { id: "btn-down", key: "s" },
    { id: "btn-left", key: "a" },
    { id: "btn-right", key: "d" }
  ];

  binds.forEach(bind => {
    const el = document.getElementById(bind.id);
    if(el) {
      el.addEventListener("touchstart", (e) => { e.preventDefault(); keysPressed[bind.key] = true; });
      el.addEventListener("touchend", (e) => { e.preventDefault(); keysPressed[bind.key] = false; });
      el.addEventListener("mousedown", () => { keysPressed[bind.key] = true; });
      el.addEventListener("mouseup", () => { keysPressed[bind.key] = false; });
    }
  });
}

function saveCurrentLife() {
  localStorage.setItem("warrior_cat_studio_life_v5", JSON.stringify(catPlayer));
  
  // Push validation onto lineages system
  let lineageExists = pastLineages.some(c => c.name === catPlayer.name && c.clan === catPlayer.clan);
  if (!lineageExists) {
    pastLineages.push({ name: catPlayer.name, clan: catPlayer.clan, freshKillPile: catPlayer.freshKillPile });
    localStorage.setItem("warrior_clans_history_manifest", JSON.stringify(pastLineages));
  }
  
  document.getElementById("live-ticker").innerText = "Advanced cat data and cosmetic profile stored to tracking history layout tables.";
  AudioEngine.chirp();
}

function runGameLoop() {
  if (!gameActive) return;

  updateCatPosition();
  updatePreyPositions();
  checkPreyIntersections();
  renderEnvironment();

  window.requestAnimationFrame(runGameLoop);
}

function updateCatPosition() {
  let nextX = catPlayer.x;
  let nextY = catPlayer.y;
  let moving = false;

  if (keysPressed["w"] || keysPressed["arrowup"]) { nextY -= catPlayer.speed; moving = true; }
  if (keysPressed["s"] || keysPressed["arrowdown"]) { nextY += catPlayer.speed; moving = true; }
  if (keysPressed["a"] || keysPressed["arrowleft"]) { nextX -= catPlayer.speed; moving = true; }
  if (keysPressed["d"] || keysPressed["arrowright"]) { nextX += catPlayer.speed; moving = true; }

  if (moving) {
    catPlayer.hunger = Math.max(0, catPlayer.hunger - 0.025);
    document.getElementById("hud-hunger").innerText = Math.floor(catPlayer.hunger);
    
    if(catPlayer.hunger <= 0) {
      document.getElementById("live-ticker").innerText = "Starvation warning! Starvation threat! Your cat is exhausted. Consume prey.";
    }
    if(Math.random() > 0.985) AudioEngine.rustle();
  }

  // Bounding block evaluations
  if (!detectBoxCollisions(nextX, catPlayer.y)) { catPlayer.x = nextX; } else { AudioEngine.thud(); }
  if (!detectBoxCollisions(catPlayer.x, nextY)) { catPlayer.y = nextY; } else { AudioEngine.thud(); }

  if (catPlayer.x < 12) catPlayer.x = 12;
  if (catPlayer.x > canvas.width - 12) catPlayer.x = canvas.width - 12;
  if (catPlayer.y < 12) catPlayer.y = 12;
  if (catPlayer.y > canvas.height - 12) catPlayer.y = canvas.height - 12;

  const zoneText = document.getElementById("hud-zone");
  let locatedZone = "Neutral Grounds";

  if (catPlayer.x < BORDER_X) {
    locatedZone = catPlayer.y < 250 ? "ThunderClan Oak Forest" : "RiverClan Reed Wetlands";
  } else {
    locatedZone = catPlayer.y < 250 ? "WindClan Open Moorland" : "ShadowClan Pine Marsh";
  }

  if (zoneText.innerText !== locatedZone) {
    zoneText.innerText = locatedZone;
    document.getElementById("live-ticker").innerText = `Moving into: ${locatedZone}. Scent markers updated.`;
  }
}

function detectBoxCollisions(projectedX, projectedY) {
  const r = catPlayer.size;
  for (let i = 0; i < MAP_OBSTACLES.length; i++) {
    let obs = MAP_OBSTACLES[i];
    if (projectedX + r > obs.x && projectedX - r < obs.x + obs.width &&
        projectedY + r > obs.y && projectedY - r < obs.y + obs.height) {
      return true;
    }
  }
  return false;
}

function updatePreyPositions() {
  preyEntities.forEach(p => {
    if (p.caught) return;
    p.x += p.vx;
    p.y += p.vy;

    if (p.x < 10 || p.x > canvas.width - 10) p.vx *= -1;
    if (p.y < 10 || p.y > canvas.height - 10) p.vy *= -1;
  });
}

function checkPreyIntersections() {
  const r = catPlayer.size;
  preyEntities.forEach(p => {
    if (p.caught) return;

    let dist = Math.hypot(catPlayer.x - p.x, catPlayer.y - p.y);
    if (dist < r + p.radius) {
