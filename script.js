/* =========================================================
   진태서 스토리 - 게임 로직 (카메라 패닝 지원 버전)

   구조:
   - #map-shell : 화면에 보이는 고정 크기 뷰포트
   - #map-world : 실제 이미지+포인트가 놓인 큰 판. transform으로 이동시켜 카메라 구현
   - 모든 좌표(포인트, 스폰 위치)는 이미지 기준 %(0~100)로 저장
     -> 이미지가 세로형/가로형 등 뭐든 상관없이 항상 같은 상대 위치에 배치됨
   ========================================================= */

// ---------- DOM 참조 ----------
const mapShell = document.getElementById("map-shell");
const mapWorld = document.getElementById("map-world");
const mapImg = document.getElementById("map-img");
const player = document.getElementById("player");
const dialogue = document.getElementById("text");
const locationText = document.getElementById("location");
const inventoryBox = document.querySelector(".inventory");

// ---------- 진행도(퀘스트) 데이터 ----------
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

// ---------- 씬(장소) 데이터 ----------
// 이미지가 바뀌는 장소(운동장/본관/교실 등)가 늘어나면 여기에 씬을 추가하면 됨.
// xPct/yPct/wPct/hPct 전부 해당 씬 이미지 기준 0~100 퍼센트.
const SCENES = {
    school: {
        image: "images/school.png",
        spawnPct: { x: 50, y: 90 },

        // 클릭하면 카메라+플레이어가 그 위치로 이동하는 '이동 지점'
        travelPoints: [
            { id: "zone1", name: "운동장", xPct: 33, yPct: 68, wPct: 20, hPct: 12, enterText: "운동장이다." },
            { id: "zone2", name: "연못",   xPct: 63, yPct: 16, wPct: 16, hPct: 10, enterText: "연못이다." },
            { id: "zone3", name: "본관",   xPct: 36, yPct: 36, wPct: 16, hPct: 10, enterText: "본관으로 들어갈 수 있을 것 같다." },
            { id: "zone4", name: "???",    xPct: 80, yPct: 58, wPct: 18, hPct: 12, enterText: "아직 갈 수 없는 장소다." }
        ],

        // 클릭하면 대사/아이템/진행도가 갱신되는 '조사 지점'
        points: [
            {
                id: "bench",
                xPct: 15, yPct: 12, wPct: 8, hPct: 5,
                progressTaskId: "bench_key",
                text: "벤치 아래에서 낡은 열쇠를 발견했다.",
                clearedText: "이미 확인한 벤치다.",
                givesItem: "key"
            },
            {
                id: "pond_edge",
                xPct: 60, yPct: 20, wPct: 8, hPct: 5,
                progressTaskId: "pond_clue",
                text: "물가에서 이상한 발자국을 발견했다.",
                clearedText: "이미 조사한 흔적이다."
            },
            {
                id: "locker",
                xPct: 33, yPct: 33, wPct: 8, hPct: 5,
                progressTaskId: "locker",
                text: "사물함 안에는 별다른 게 없었다.",
                clearedText: "이미 조사한 사물함이다."
            },
            {
                id: "front_door",
                xPct: 40, yPct: 33, wPct: 8, hPct: 5,
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
let currentSceneId = "school";
let naturalW = 0, naturalH = 0;   // 원본 이미지 픽셀 크기
let worldW = 0, worldH = 0;       // 뷰포트를 덮도록 확대된 실제 렌더 크기
let panX = 0, panY = 0;

const PAN_SPEED = 480;  // px/초 (WASD, 가장자리 스크롤 공통 속도)
const EDGE_ZONE = 48;   // 가장자리 자동 스크롤 감지 범위(px)

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

// 뷰포트를 여백 없이 채우도록 이미지를 확대(cover)
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
function setDialogue(text) {
    dialogue.innerHTML = text;
}

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

// ---------- 포인트(이동/조사) 렌더링 & 클릭 ----------
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

    // WASD 우선, 키 입력 없으면 가장자리 자동 스크롤 적용
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
    fitWorldToViewport();
    renderPoints();
    applyPan();
});

// ---------- 초기화 ----------
renderProgress();
renderInventory();
loadScene("school");
requestAnimationFrame(tick);