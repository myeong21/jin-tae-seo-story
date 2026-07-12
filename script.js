/* =========================================================
   진태서 스토리 - 게임 로직 (카메라 패닝 버전)

   포인트는 이제 travelPoints/points 로 나누지 않고 하나의 배열로 통합.
   각 포인트는 type: "travel" 또는 "investigate" 를 가짐.

   - travel: 클릭하면 destPct 위치로 카메라+플레이어 이동, 대사(enterText)만 표시
   - investigate: 클릭하면 조건 체크 후 아이템/진행도 처리.
     becomesTravel이 설정돼 있으면, 클리어되는 순간 그 지점이
     travel 포인트로 성격이 바뀜(핑크색으로 전환, 이후엔 이동 기능만 함)
   ========================================================= */

// ---------- DOM 참조 ----------
const mapShell = document.getElementById("map-shell");
const mapWorld = document.getElementById("map-world");
const mapImg = document.getElementById("map-img");
const player = document.getElementById("player");
const dialogueBox = document.getElementById("dialogue");
const speakerEl = document.getElementById("speaker");
const dialogue = document.getElementById("text");
const dialogueNext = document.getElementById("dialogue-next");
const locationText = document.getElementById("location");
const inventoryBox = document.querySelector(".inventory");

// ---------- 진행도 데이터 ----------
// 지금은 비워둠. 실제 조사 포인트를 다시 설계하면서 필요한 만큼 채우면 됨.
const progressTasks = [];

// ---------- 인벤토리 ----------
let inventory = [];
const ITEM_DB = {
    key: { id: "key", name: "낡은 열쇠" }
};

// ---------- 씬 데이터 ----------
// xPct/yPct/wPct/hPct : 맵 위에서 보이는 클릭 박스 위치(이미지 기준 %)
// destPct             : 클릭했을 때 실제로 카메라/플레이어가 이동할 목적지(이미지 기준 %)
//                        지금은 전부 위치=목적지로 임시 설정해둠. 나중에 따로 지정 가능.
const SCENES = {
    school: {
        image: "images/school.png",
        spawnPct: { x: 81, y: 96 },

        // 각 항목의 모든 값을 개별로 수정 가능:
        //   xPct, yPct   : 클릭 박스가 보이는 위치 (박스 왼쪽 위 모서리 기준, 이미지 대비 %)
        //   wPct, hPct   : 클릭 박스의 가로/세로 크기 (이미지 대비 %)
        //   destPct      : 클릭 시 카메라+플레이어가 실제로 이동할 위치 (이미지 대비 %)
        //   enterText    : 클릭 시 대사창에 뜨는 문구
        points: [
            { id:"dorm",            name:"기숙사",      type:"travel", xPct:3, yPct:6.7, wPct:15.4, hPct:9, destPct:{x:7.2, y:4.6}, enterText:"기숙사이다." },
            { id:"admin",           name:"행정관",      type:"travel", xPct:21.6, yPct:6.7, wPct:15.4, hPct:9, destPct:{x:34, y:12.5}, enterText:"행정관이다." },
            { id:"cafeteria_table", name:"식당 테이블", type:"travel", xPct:5, yPct:18.7, wPct:10.8, hPct:8.2, destPct:{x:34, y:84.5}, enterText:"식당 테이블이다." },
            { id:"flowerbed4",      name:"화단4",       type:"travel", xPct:17.5, yPct:16, wPct:20.3, hPct:4.4, destPct:{x:52, y:66.5}, enterText:"화단4이다." },
            { id:"flowerbed5",      name:"화단5",       type:"travel", xPct:17.5, yPct:21.1, wPct:20.3, hPct:4.4, destPct:{x:70, y:66.5}, enterText:"화단5이다." },
            { id:"flowerbed1",      name:"화단1",       type:"travel", xPct:44, yPct:8, wPct:52, hPct:19, destPct:{x:88, y:48.5}, enterText:"화단1이다." },
            { id:"pond",            name:"연못",        type:"travel", xPct:80.6, yPct:15.3, wPct:13, hPct:7, destPct:{x:88, y:30.5}, enterText:"연못이다." },
            { id:"cafeteria",       name:"식당",        type:"travel", xPct:3, yPct:27.5, wPct:13.3, hPct:19.5, destPct:{x:52, y:12.5}, enterText:"식당이다." },
            { id:"annex",           name:"별관",        type:"travel", xPct:22.5, yPct:28.1, wPct:29.5, hPct:8.6, destPct:{x:70, y:12.5}, enterText:"별관이다." },
            { id:"main_hall",       name:"본관",        type:"travel", xPct:22.5, yPct:38, wPct:29.5, hPct:8.6, destPct:{x:88, y:12.5}, enterText:"본관으로 들어갈 수 있을 것 같다." },
            { id:"store",           name:"매점",        type:"travel", xPct:56, yPct:30.6, wPct:6.2, hPct:9.5, destPct:{x:52, y:30.5}, enterText:"매점이다." },
            { id:"store_table",     name:"매점 테이블", type:"travel", xPct:64.2, yPct:30.6, wPct:10.8, hPct:8.2, destPct:{x:70, y:30.5}, enterText:"매점 테이블이다." },
            { id:"library",         name:"도서관",      type:"travel", xPct:75.5, yPct:28.5, wPct:19.7, hPct:8.5, destPct:{x:34, y:30.5}, enterText:"도서관이다." },
            { id:"flowerbed6",      name:"화단6",       type:"travel", xPct:56, yPct:40, wPct:39.3, hPct:5.8, destPct:{x:88, y:66.5}, enterText:"화단6이다." },
            { id:"playground",      name:"운동장",      type:"travel", xPct:10, yPct:50, wPct:49, hPct:35, destPct:{x:70, y:30.5}, enterText:"운동장이다." },
            { id:"platform",        name:"구령대",      type:"travel", xPct:53, yPct:65.7, wPct:5, hPct:8.6, destPct:{x:88, y:30.5}, enterText:"구령대이다." },
            { id:"gym",             name:"체육관",      type:"travel", xPct:68, yPct:50.1, wPct:28, hPct:17, destPct:{x:16, y:48.5}, enterText:"체육관이다." },
            { id:"parking",         name:"주차장",      type:"travel", xPct:70, yPct:69.5, wPct:25.3, hPct:15.3, destPct:{x:34, y:48.5}, enterText:"주차장이다." },
            { id:"flowerbed2",      name:"화단2",       type:"travel", xPct:9, yPct:86, wPct:23, hPct:6, destPct:{x:16, y:66.5}, enterText:"화단2이다." },
            { id:"flowerbed3",      name:"화단3",       type:"travel", xPct:36.1, yPct:86, wPct:25, hPct:6, destPct:{x:34, y:66.5}, enterText:"화단3이다." },
            { id:"guard_room",      name:"경비실",      type:"travel", xPct:85, yPct:86.1, wPct:12, hPct:9.8, destPct:{x:52, y:48.5}, enterText:"경비실이다." },
            { id:"gate",            name:"교문",        type:"travel", xPct:73.5, yPct:94.8, wPct:14.8, hPct:4.7, destPct:{x:70, y:48.5}, dialogue: [{ speaker:"교문", text:"낡은 철제 교문이다." },{ speaker:"진태서", text:"아직 학교를 다 안둘러봤어." }]}
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
        playDialogue("게임을 시작하세요.");
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

// ---------- 대사 시스템 ----------
// 대사는 여러 줄(각 줄마다 화자 지정 가능)로 이어질 수 있음.
// input이 그냥 문자열이면 화자는 defaultSpeaker(기본 "진태서")로 자동 처리.
// input이 [{speaker, text}, ...] 배열이면 그대로 순서대로 재생.
let dialogueQueue = [];
let dialogueIndex = 0;

function normalizeDialogue(input, defaultSpeaker) {
    const speaker = defaultSpeaker || "진태서";
    if (!input) return [];
    if (Array.isArray(input)) {
        return input.map(item =>
            typeof item === "string"
                ? { speaker: speaker, text: item }
                : { speaker: item.speaker || speaker, text: item.text }
        );
    }
    return [{ speaker: speaker, text: input }];
}

function playDialogue(input, defaultSpeaker) {
    dialogueQueue = normalizeDialogue(input, defaultSpeaker);
    dialogueIndex = 0;
    renderDialogueLine();
}

function renderDialogueLine() {
    if (dialogueQueue.length === 0) return;
    const line = dialogueQueue[dialogueIndex];
    speakerEl.textContent = line.speaker;
    dialogue.innerHTML = line.text;
    dialogueNext.style.display = (dialogueIndex < dialogueQueue.length - 1) ? "block" : "none";
}

function advanceDialogue() {
    if (dialogueIndex < dialogueQueue.length - 1) {
        dialogueIndex++;
        renderDialogueLine();
    }
}

dialogueBox.addEventListener("click", advanceDialogue);

// 예전 코드 호환용 (setDialogue를 부르던 곳들이 있으면 그대로 동작)
function setDialogue(text) { playDialogue(text); }

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
function createPointEl(data) {
    const el = document.createElement("div");
    el.className = data.type === "travel" ? "point point-travel" : "point";
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

    scene.points.forEach(p => {
        const el = createPointEl(p);
        el.onclick = () => handlePointClick(p);
        mapWorld.appendChild(el);
    });
}

function handlePointClick(point) {
    if (point.type === "travel") {
        locationText.innerHTML = point.name;
        // point.dialogue가 있으면 그 배열(화자 포함) 사용, 없으면 enterText를 진태서 대사로 표시
        playDialogue(point.dialogue || point.enterText);
        const pos = pctToWorldPx(point.destPct.x, point.destPct.y);
        placePlayer(pos.x, pos.y);
        centerCameraOn(pos.x, pos.y);
        return;
    }

    // ---- 조사 포인트 처리 ----
    if (point.cleared) {
        playDialogue(point.clearedDialogue || point.clearedText || point.text);
        return;
    }
    if (point.requiresItem && !hasItem(point.requiresItem)) {
        playDialogue(point.lockedDialogue || point.lockedText || "지금은 무언가 부족한 것 같다.");
        return;
    }

    point.cleared = true;
    if (point.requiresItem && point.consumesItem) removeItem(point.requiresItem);
    if (point.givesItem) addItem(point.givesItem);
    if (point.progressTaskId) completeProgress(point.progressTaskId);

    playDialogue(point.dialogue || point.text);

    // 아이템을 얻는 등 완료 후 이동 포인트로 전환되도록 설정된 경우, 성격을 바꿔치기
    if (point.becomesTravel) {
        point.type = "travel";
        point.destPct = point.becomesTravel.destPct;
        point.enterText = point.becomesTravel.enterText || point.clearedText || point.text;
        point.name = point.becomesTravel.name || point.name;
    }

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