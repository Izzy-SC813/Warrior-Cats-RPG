let canvas, ctx;
let gameActive = false;

// Global Character State Object Core
let catPlayer = {
  x: 200,
  y: 250,
  size: 16, 
  speed: 3.5,
  name: "Firepaw",
  clan: "ThunderClan",
  furColor: "#d66a22",
  pattern: "solid",
  eyeColor: "#4caf50",
  marking: "none",
  hunger: 100,
  freshKillPile: 0
};

let keysPressed = {};
let preyEntities = [];
const BORDER_X = 400;

// World Static Collision Arrays
const MAP_OBSTACLES = [
  { x: 50, y: 70, width: 60, height: 60, name: "Highrocks Point" },
  { x: 670, y: 340, width: 80, height: 60, name: "Carrionplace Grid" },
  { x: 100, y: 380, width: 120, height: 30, name: "River Deep Skerries" },
  { x: 550, y: 80, width: 90, height: 40, name: "Moor Rock Gorse Pile" }
];

function launchGame(isLoadMode) {
  document.getElementById("home-screen").classList.add("hidden");
  document.getElementById("simulation-view").classList.remove("hidden");

  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");

  if (isLoadMode) {
    const savedData = localStorage.getItem("github_warrior_cat_life_v5");
    if (!savedData) {
      alert("No previous lives found in your browser's local cache. Spawning a new cat instead!");
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

  gameActive = true;
  setupInputHandlers();
  window.requestAnimationFrame(runGameLoop);
  
  document.getElementById("live-ticker").innerText = `Success! Spawned ${catPlayer.name} into the territory. Hunt prey to maintain your nourishment.`;
}

function readMenuFormFields() {
  const prefix = document.getElementById("dev-prefix").value || "Custom";
  catPlayer.name = prefix + "paw";
  catPlayer.clan = document.getElementById("dev-clan").value;
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
  for (let i = 0; i < 20; i++) {
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
      el.addEventListener("touchstart", (e) => { e.preventDefault(); keysPressed[bind.key] = true; }, {passive: false});
      el.addEventListener("touchend", (e) => { e.preventDefault(); keysPressed[bind.key] = false; }, {passive: false});
      el.addEventListener("mousedown", () => { keysPressed[bind.key] = true; });
      el.addEventListener("mouseup", () => { keysPressed[bind.key] = false; });
    }
  });
}

function saveCurrentLife() {
  localStorage.setItem("github_warrior_cat_life_v5", JSON.stringify(catPlayer));
  document.getElementById("live-ticker").innerText = "Advanced cat data and cosmetic layout saved to local storage profile.";
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
      document.getElementById("live-ticker").innerText = "Starvation threat! Your cat is exhausted. Return to home grounds to eat.";
    }
  }

  if (!detectBoxCollisions(nextX, catPlayer.y)) { catPlayer.x = nextX; }
  if (!detectBoxCollisions(catPlayer.x, nextY)) { catPlayer.y = nextY; }

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
      p.caught = true;
      catPlayer.freshKillPile++;
      catPlayer.hunger = Math.min(100, catPlayer.hunger + 15);
      
      document.getElementById("hud-prey").innerText = catPlayer.freshKillPile;
      document.getElementById("hud-hunger").innerText = Math.floor(catPlayer.hunger);
      document.getElementById("live-ticker").innerText = `Caught a ${p.type}! Energy restored, fresh-kill value logged into the tracking table.`;
      
      setTimeout(() => {
        p.caught = false;
        p.x = Math.random() * (canvas.width - 40) + 20;
        p.y = Math.random() * (canvas.height - 40) + 20;
      }, 7000);
    }
  });
}

function renderEnvironment() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#1e3516"; ctx.fillRect(0, 0, BORDER_X, 250);
  ctx.fillStyle = "#153344"; ctx.fillRect(0, 250, BORDER_X, 250);
  ctx.fillStyle = "#424e3b"; ctx.fillRect(BORDER_X, 0, canvas.width - BORDER_X, 250);
  ctx.fillStyle = "#1a1c19"; ctx.fillRect(BORDER_X, 250, canvas.width - BORDER_X, 250);

  MAP_OBSTACLES.forEach(obs => {
    ctx.fillStyle = "rgba(40, 40, 40, 0.85)";
    ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 1;
    ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
  });

  ctx.strokeStyle = "#444";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(BORDER_X, 0); ctx.lineTo(BORDER_X, canvas.height);
  ctx.moveTo(0, 250); ctx.lineTo(canvas.width, 250);
  ctx.stroke();

  ctx.fillStyle = "#555";
  ctx.beginPath(); ctx.arc(BORDER_X, 250, 25, 0, Math.PI * 2); ctx.fill();

  preyEntities.forEach(p => {
    if (p.caught) return;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  const cx = catPlayer.x;
  const cy = catPlayer.y;
  const rad = catPlayer.size;

  if (catPlayer.marking === "white-socks") {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(cx - 12, cy + 10, 5, 0, Math.PI * 2); ctx.arc(cx + 12, cy + 10, 5, 0, Math.PI * 2); ctx.fill();
  }

  // Base Bicolor Mask rendering choice
  if (catPlayer.pattern === "bicolor") {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = catPlayer.furColor;
    ctx.beginPath(); ctx.arc(cx, cy - 3, rad - 3, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = catPlayer.furColor;
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
  }

  ctx.strokeStyle = catPlayer.furColor;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(cx, cy + 10);
  if (catPlayer.marking === "docked-tail") { ctx.lineTo(cx - 10, cy + 15); } 
  else { ctx.lineTo(cx - 18, cy + 22); }
  ctx.stroke();

  // Draw Coat Variants
