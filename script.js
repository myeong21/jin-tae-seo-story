/* =========================================================
   진태서 스토리 - 게임 로직
   구조: 위치(zone) 데이터 + 그 안의 상호작용 포인트 데이터를
   한 곳(GAME_DATA)에 몰아넣고, 클릭 이벤트는 이 데이터를 읽어
   공통 로직으로 처리한다. (위치/포인트가 늘어나도 코드 반복 없음)
   ========================================================= */

// ---------- DOM 참조 ----------
const player = document.getElementById("player");
const dialogue = document.getElementById("text");
const speaker = document.getElementById("speaker");
const locationText = document.getElementById("location");
const mapStage = document.getElementById("map-stage");
const inventoryBox = document.querySelector(".inventory");

// ---------- 진행도(퀘스트) 데이터 ----------
// 4개는 지금은 임시값. 언제든 늘리거나 줄이거나 이름을 바꿔도 됨.
// cleared가 true가 되면 사이드바에 '?????' 대신 name이 표시됨.
const progressTasks = [
    { id: "bench_key",   name: "벤치 아래 확인", cleared: false },
    { id: "pond_clue",   name: "연못가 흔적 조사", cleared: false },
    { id: "locker",      name: "사물함 조사",     cleared: false },
    { id: "front_door",  name: "본관 현관문 열기", cleared: false }
];

// ---------- 인벤토리 ----------
// 아이템은 {id, name} 형태. 화면엔 name만 보여줌.
let inventory = [];

const ITEM_DB = {
    key: { id: "key", name: "낡은 열쇠" }
};

// ---------- 위치(zone) & 상호작용 포인트 데이터 ----------
// x, y, w, h 는 map-stage 기준 절대 좌표(px). style.css의 zone 좌표와 같은 체계.
const GAME_DATA = {
    zone1: {
        name: "운동장",
        playerPos: { x: 165, y: 155 },
        enterText: "운동장이다.",
        points: [
            {
                id: "bench",
                x: 205, y: 190, w: 50, h: 50,
                progressTaskId: "bench_key",
                clearedText: "이미 확인한 벤치다.",
                text: "벤치 아래에서 낡은 열쇠를 발견했다.",
                givesItem: "key"
            }
        ]
    },
    zone2: {
        name: "연못",
        playerPos: { x: 475, y: 165 },
        enterText: "연못이다.",
        points: [
            {
                id: "pond_edge",
                x: 500, y: 200, w: 50, h: 50,
                progressTaskId: "pond_clue",
                clearedText: "이미 조사한 흔적이다.",
                text: "물가에서 이상한 발자국을 발견했다."
            }
        ]
    },
    zone3: {
        name: "본관",
        playerPos: { x: 240, y: 430 },
        enterText: "본관으로 들어갈 수 있을 것 같다.",
        points: [
            {
                id: "locker",
                x: 260, y: 460, w: 50, h: 50,
                progressTaskId: "locker",
                clearedText: "이미 조사한 사물함이다.",
                text: "사물함 안에는 별다른 게 없었다."
            },
            {
                id: "front_door",
                x: 320, y: 460, w: 50, h: 50,
                progressTaskId: "front_door",
                requiresItem: "key",
                lockedText: "문이 잠겨있다. 무언가 열쇠가 필요할 것 같다.",
                clearedText: "이미 열어둔 문이다.",
                text: "낡은 열쇠로 문을 열었다.",
                consumesItem: true
            }
        ]
    },
    zone4: {
        name: "???",
        playerPos: { x: 565, y: 440 },
        enterText: "아직 갈 수 없는 장소다.",
        points: []
    }
};

// ---------- 상태 ----------
let currentZoneId = null;

// ---------- 렌더링 함수 ----------

function setDialogue(text) {
    dialogue.innerHTML = text;
}

function renderInventory() {
    inventoryBox.innerHTML = "";
    inventory.forEach(itemId => {
        const item = ITEM_DB[itemId];
        const el = document.createElement("div");
        el.className = "inventory-item";
        el.textContent = item.name;
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

function addItem(itemId) {
    inventory.push(itemId);
    renderInventory();
}

function removeItem(itemId) {
    const idx = inventory.indexOf(itemId);
    if (idx !== -1) inventory.splice(idx, 1);
    renderInventory();
}

function hasItem(itemId) {
    return inventory.includes(itemId);
}

// 현재 위치의 상호작용 포인트들을 map-stage 위에 그린다.
function renderInteractionPoints(zoneId) {
    // 이전 위치의 포인트 DOM 제거
    document.querySelectorAll(".point").forEach(el => el.remove());

    const zone = GAME_DATA[zoneId];
    zone.points.forEach(point => {
        const el = document.createElement("div");
        el.className = "point" + (point.cleared ? " point-cleared" : "");
        el.style.left = point.x + "px";
        el.style.top = point.y + "px";
        el.style.width = point.w + "px";
        el.style.height = point.h + "px";

        el.onclick = () => handlePointClick(zoneId, point);

        mapStage.appendChild(el);
    });
}

// ---------- 클릭 핸들러 ----------

function enterZone(zoneId) {
    const zone = GAME_DATA[zoneId];
    currentZoneId = zoneId;

    player.style.left = zone.playerPos.x + "px";
    player.style.top = zone.playerPos.y + "px";

    setDialogue(zone.enterText);
    locationText.innerHTML = zone.name;

    renderInteractionPoints(zoneId);
}

function handlePointClick(zoneId, point) {
    // 이미 클리어한 포인트는 안내 대사만 다시 보여줌
    if (point.cleared) {
        setDialogue(point.clearedText || point.text);
        return;
    }

    // 아이템이 필요한 포인트인데 아이템이 없는 경우 -> 잠김
    if (point.requiresItem && !hasItem(point.requiresItem)) {
        setDialogue(point.lockedText || "지금은 무언가 부족한 것 같다.");
        return;
    }

    // 조건 충족 -> 클리어 처리
    point.cleared = true;

    // 아이템 소모
    if (point.requiresItem && point.consumesItem) {
        removeItem(point.requiresItem);
    }

    // 아이템 지급
    if (point.givesItem) {
        addItem(point.givesItem);
    }

    // 진행도 갱신
    if (point.progressTaskId) {
        completeProgress(point.progressTaskId);
    }

    setDialogue(point.text);

    // 포인트 스타일 갱신 (클리어 표시)
    renderInteractionPoints(zoneId);
}

// ---------- zone(위치 이동) 클릭 이벤트 등록 ----------

Object.keys(GAME_DATA).forEach(zoneId => {
    const el = document.getElementById(zoneId);
    if (el) {
        el.onclick = () => enterZone(zoneId);
    }
});

// ---------- 초기화 ----------
renderProgress();
renderInventory();
