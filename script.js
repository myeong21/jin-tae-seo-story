/* =========================================================
   진태서 스토리 - 게임 로직 (카메라 패닝 버전)
   ========================================================= */

// ---------- DOM 참조 ----------
const mapShell = document.getElementById("map-shell");
const mapWorld = document.getElementById("map-world");
const mapImg = document.getElementById("map-img");
const player = document.getElementById("player");
const dialogue = document.getElementById("text");
const locationText = document.getElementById("location");
const inventoryBox = document.querySelector(".inventory");

// ---------- 진행도 데이터 ----------
const progressTasks = [
    { id: "bench_key",  name: "벤치 아래 확인",   cleared: false },
    { id: "pond_clue",  name: "연못가 흔적 조사", cleared: false },
    { id: "locker",     name: "사물함 조사",       cleared: false },
    { id: "front_door", name: "본관 현관문 열기", cleared: false }
];

// ---------- 인벤토리 ----------
let inventory = [];
const ITEM_DB = {
    key: { id: "key", name: "낡은 열쇠" }
};

// ---------- 씬 데이터 (좌표는 전부 이미지 기준 % , 0~100) ----------
const SCENES = {
    school: {
        image: "images/school.png",
        spawnPct: { x: 50, y: 95 },

        travelPoints: [
            { id: "zone1", name: "운동장", xPct: 30, yPct: 66, wPct: 22, hPct: 12, enterText: "운동장이다." },
            { id: "zone2", name: "연못",   xPct: 68, yPct: 15, wPct: 20, hPct: 10, enterText: "연못이다." },
            { id: "zone3", name: "본관",   xPct: 30, yPct: 33, wPct: 18, hPct: 10, enterText: "본관으로 들어갈 수 있을 것 같다." },
            { id: "zone4", name: "???",    xPct: 78, yPct: 60, wPct: 16, hPct: 10, enterText: "아직 갈 수 없는 장소다." }
        ],

        points: [
            {
                id: "bench",
                xPct: 10, yPct: 8, wPct: 8, hPct: 4,
                progressTaskId: "bench_key",
                text: "벤치 아래에서 낡은 열쇠를 발견했다.",
                clearedText: "이미 확인한 벤치다.",
                givesItem: "key"
            },
            {
                id: "pond_edge",
                xPct: 63, yPct: 18, wPct: 8, hPct: 4,
                progressTaskId: "pond_clue",
                text: "물가에서 이상한 발자국을 발견했다.",
                clearedText: "이미 조사한 흔적이다."
            },
            {
                id: "locker",
                xPct: 22, yPct: 30, wPct: 8, hPct: 4,
                progressTaskId: "locker",
                text: "사물함 안에는 별다른 게 없었다.",
                clearedText: "이미 조사한 사물함이다."
            },
            {
                id: "front_door",
                xPct: 34, yPct: 30, wPct: 8, hPct: 4,
                progressTaskId: "front_door",
                requiresItem: "key",
                consumesItem: true,
                lockedText: "문이 잠겨있다. 무언가 열쇠가 필요할 것 같다.",
                text: "낡은 열쇠로 문을 열었다.",
                clearedText: "이미 열어둔 문이다."
            }
        ]
    }
};

// ---------- 카메라/월드 상태 ----------
let currentSceneId = null;
let naturalW = 0, naturalH = 0;
let worldW = 0, worldH = 0;
let panX = 0, panY = 0;

const PAN_SPEED = 480;
const EDGE_ZONE = 48;

const keysDown = new Set();
let mouseEdgeVec = { x: 0, y: 0 };
let lastTime = null;

// ---------- 좌표 변환 ----------
function pctToWorldPx(xPct, yPct) {
    return { x: worldW * (xPct / 100), y: worldH * (yPct / 100) };
}

// ---------- 씬 로딩 ----------
function loadScene(sceneId) {
    const scene = SCENES[sceneId];
    currentSceneId = sceneId;

    mapImg.onload = () => {
        naturalW = mapImg.naturalWidth;
        naturalH = mapImg.naturalHeight;

        fitWorldToViewport();

        const spawnPx = pctToWorldPx(scene.spawnPct.x, scene.spawnPct.y);
        placePlayer(spawnPx.x, spawnPx.y);
        centerCameraOn(spawnPx.x, spawnPx.y);

        renderPoints();
        setDialogue("게임을 시작하세요.");
        locationText.innerHTML = "학교";
    };
    mapImg.src = scene.image;
}

function fitWorldToViewport() {
    const vw = mapShell.clientWidth;
    const vh = mapShell.clientHeight;
    const scale = Math.max(vw / naturalW, vh / naturalH);

    worldW = naturalW * scale;
    worldH = naturalH * scale;

    mapWorld.style.width = worldW + "px";
    mapWorld.style.height = worldH + "px";
    mapImg.style.width = worldW + "px";
    mapImg.style.height = worldH + "px";
}

// ---------- 카메라(패닝) ----------
function clampPan() {
    const vw = mapShell.clientWidth;
    const vh = mapShell.clientHeight;
    const maxX = Math.max(0, worldW - vw);
    const maxY = Math.max(0, worldH - vh);
    panX = Math.min(Math.max(panX, 0), maxX);
    panY = Math.min(Math.max(panY, 0), maxY);
}

function applyPan() {
    clampPan();
    mapWorld.style.transform = `translate(${-panX}px, ${-panY}px)`;
}

function centerCameraOn(worldX, worldY) {
    const vw = mapShell.clientWidth;
    const vh = mapShell.clientHeight;
    panX = worldX - vw / 2;
    panY = worldY - vh / 2;
    applyPan();
}

function placePlayer(worldX, worldY) {
    player.style.left = worldX + "px";
    player.style.top = worldY + "px";
}

// ---------- 진행도 / 인벤토리 ----------
function setDialogue(text) { dialogue.innerHTML = text; }

function renderInventory() {
    inventoryBox.innerHTML = "";
    inventory.forEach(itemId => {
        const el = document.createElement("div");
        el.className = "inventory-item";
        el.textContent = ITEM_DB[itemId].name;
        inventoryBox.appendChild(el);
    });
}

function renderProgress() {
    progressTasks.forEach((task, i) => {
        const li = document.getElementById("progress" + i);
        if (!li) return;
        li.textContent = task.cleared ? task.name : "?????";
        li.classList.toggle("cleared", task.cleared);
    });
}

function completeProgress(taskId) {
    const task = progressTasks.find(t => t.id === taskId);
    if (task && !task.cleared) {
        task.cleared = true;
        renderProgress();
    }
}

function addItem(itemId) { inventory.push(itemId); renderInventory(); }
function removeItem(itemId) {
    const idx = inventory.indexOf(itemId);
    if (idx !== -1) inventory.splice(idx, 1);
    renderInventory();
}
function hasItem(itemId) { return inventory.includes(itemId); }

// ---------- 포인트 렌더링 & 클릭 ----------
function createPointEl(data, extraClass) {
    const el = document.createElement("div");
    el.className = ("point " + (extraClass || "")).trim();
    const pos = pctToWorldPx(data.xPct, data.yPct);
    const size = pctToWorldPx(data.wPct, data.hPct);
    el.style.left = pos.x + "px";
    el.style.top = pos.y + "px";
    el.style.width = size.x + "px";
    el.style.height = size.y + "px";
    return el;
}

function renderPoints() {
    document.querySelectorAll(".point").forEach(el => el.remove());
    const scene = SCENES[currentSceneId];

    scene.travelPoints.forEach(tp => {
        const el = createPointEl(tp, "point-travel");
        el.onclick = () => enterTravelPoint(tp);
        mapWorld.appendChild(el);
    });

    scene.points.forEach(p => {
        const el = createPointEl(p, p.cleared ? "point-cleared" : "");
        el.onclick = () => handlePointClick(p);
        mapWorld.appendChild(el);
    });
}

function enterTravelPoint(tp) {
    locationText.innerHTML = tp.name;
    setDialogue(tp.enterText);
    const pos = pctToWorldPx(tp.xPct, tp.yPct);
    placePlayer(pos.x, pos.y);
    centerCameraOn(pos.x, pos.y);
}

function handlePointClick(point) {
    if (point.cleared) {
        setDialogue(point.clearedText || point.text);
        return;
    }
    if (point.requiresItem && !hasItem(point.requiresItem)) {
        setDialogue(point.lockedText || "지금은 무언가 부족한 것 같다.");
        return;
    }

    point.cleared = true;
    if (point.requiresItem && point.consumesItem) removeItem(point.requiresItem);
    if (point.givesItem) addItem(point.givesItem);
    if (point.progressTaskId) completeProgress(point.progressTaskId);

    setDialogue(point.text);
    renderPoints();
}

// ---------- 입력: WASD + 가장자리 자동 스크롤 ----------
window.addEventListener("keydown", e => {
    const k = e.key.toLowerCase();
    if (["w", "a", "s", "d"].includes(k)) keysDown.add(k);
});
window.addEventListener("keyup", e => {
    keysDown.delete(e.key.toLowerCase());
});

mapShell.addEventListener("mousemove", e => {
    const rect = mapShell.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let vx = 0, vy = 0;
    if (x < EDGE_ZONE) vx = -1;
    else if (x > rect.width - EDGE_ZONE) vx = 1;
    if (y < EDGE_ZONE) vy = -1;
    else if (y > rect.height - EDGE_ZONE) vy = 1;
    mouseEdgeVec = { x: vx, y: vy };
});
mapShell.addEventListener("mouseleave", () => { mouseEdgeVec = { x: 0, y: 0 }; });

function tick(now) {
    if (lastTime == null) lastTime = now;
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    let dx = 0, dy = 0;
    if (keysDown.has("a")) dx -= 1;
    if (keysDown.has("d")) dx += 1;
    if (keysDown.has("w")) dy -= 1;
    if (keysDown.has("s")) dy += 1;

    if (dx === 0 && dy === 0) {
        dx = mouseEdgeVec.x;
        dy = mouseEdgeVec.y;
    }

    if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy) || 1;
        panX += (dx / len) * PAN_SPEED * dt;
        panY += (dy / len) * PAN_SPEED * dt;
        applyPan();
    }

    requestAnimationFrame(tick);
}

window.addEventListener("resize", () => {
    if (naturalW && naturalH) {
        fitWorldToViewport();
        renderPoints();
        applyPan();
    }
});

// ---------- 초기화 ----------
renderProgress();
renderInventory();
loadScene("school");
requestAnimationFrame(tick);