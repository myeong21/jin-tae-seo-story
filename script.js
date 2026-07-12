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
const mapOverlay = document.getElementById("map-overlay");

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
        // destOffset을 안 주면 그 항목의 왼쪽 위 모서리(xPct, yPct)로 이동함.
        // 특정 포인트만 이동 지점을 다르게 하고 싶으면 destOffset:{x:.., y:..}를 추가하면 됨.
        points: [
            { id:"dorm",            name:"기숙사",      type:"travel", xPct:3, yPct:6.7, wPct:15.4, hPct:9, destOffset:{x:7.7, y:9}, enterText:"기숙사이다." },
            { id:"admin",           name:"행정관",      type:"travel", xPct:21.6, yPct:6.7, wPct:15.4, hPct:9, destOffset:{x:7.7, y:9}, enterText:"행정관이다." },
            { id:"cafeteria_table", name:"식당 테이블", type:"travel", xPct:5, yPct:18.7, wPct:10.8, hPct:8.2, destOffset:{x:5.4, y:4.1}, enterText:"식당 테이블이다." },
            { id:"flowerbed4",      name:"화단4",       type:"travel", xPct:17.5, yPct:16, wPct:20.3, hPct:4.4, destOffset:{x:10.15, y:2.2}, enterText:"화단4이다." },
            { id:"flowerbed5",      name:"화단5",       type:"travel", xPct:17.5, yPct:21.1, wPct:20.3, hPct:4.4, destOffset:{x:10.15, y:2.2}, enterText:"화단5이다." },
            { id:"flowerbed1",      name:"화단1",       type:"travel", xPct:44, yPct:8, wPct:52, hPct:19, destOffset:{x:11.5, y:14.25}, enterText:"화단1이다." },
            { id:"pond",            name:"연못",        type:"travel", xPct:80.6, yPct:15.3, wPct:13, hPct:7, destOffset:{x:0, y:3.5}, enterText:"연못이다." },
            { id:"cafeteria",       name:"식당",        type:"travel", xPct:3, yPct:27.5, wPct:13.3, hPct:19.5, destOffset:{x:14.3, y:14}, enterText:"식당이다." },
            { id:"annex",           name:"별관",        type:"travel", xPct:22.5, yPct:28.1, wPct:29.5, hPct:8.6, destOffset:{x:14.75, y:8.6}, enterText:"별관이다." },
            { id:"main_hall",       name:"본관",        type:"travel", xPct:22.5, yPct:38, wPct:29.5, hPct:8.6, destOffset:{x:14.75, y:8.6}, enterText:"본관으로 들어갈 수 있을 것 같다." },
            { id:"store",           name:"매점",        type:"travel", xPct:56, yPct:30.6, wPct:6.2, hPct:9.5, destOffset:{x:7.1, y:8.4}, enterText:"매점이다." },
            { id:"store_table",     name:"매점 테이블", type:"travel", xPct:64.2, yPct:30.6, wPct:10.8, hPct:8.2, destOffset:{x:5.4, y:4.1}, enterText:"매점 테이블이다." },
            { id:"library",         name:"도서관",      type:"travel", xPct:75.5, yPct:28.5, wPct:19.7, hPct:8.5, destOffset:{x:-1, y:6.25}, enterText:"도서관이다." },
            { id:"flowerbed6",      name:"화단6",       type:"travel", xPct:56, yPct:40, wPct:39.3, hPct:5.8, destOffset:{x:19.65, y:2.9}, enterText:"화단6이다." },
            { id:"playground",      name:"운동장",      type:"travel", xPct:10, yPct:50, wPct:49, hPct:35, destOffset:{x:24.5, y:21.3}, enterText:"운동장이다." },
            { id:"platform",        name:"구령대",      type:"travel", xPct:53, yPct:65.7, wPct:5, hPct:8.6, destOffset:{x:6, y:4.3}, enterText:"구령대이다." },
            { id:"gym",             name:"체육관",      type:"travel", xPct:68, yPct:50.1, wPct:28, hPct:17, destOffset:{x:-1, y:5.5}, enterText:"체육관이다." },
            { id:"parking",         name:"주차장",      type:"travel", xPct:70, yPct:69.5, wPct:25.3, hPct:15.3, destOffset:{x:12.65, y:7.65}, enterText:"주차장이다." },
            { id:"flowerbed2",      name:"화단2",       type:"travel", xPct:9, yPct:86, wPct:23, hPct:6, destOffset:{x:11.5, y:3}, enterText:"화단2이다." },
            { id:"flowerbed3",      name:"화단3",       type:"travel", xPct:36.1, yPct:86, wPct:25, hPct:6, destOffset:{x:12.5, y:3}, enterText:"화단3이다." },
            
            { id:"guard_room",      name:"경비실",      type:"travel", xPct:85, yPct:86.1, wPct:12, hPct:9.8, destOffset:{x:0, y:2}, enterText:"경비실이다." },
            
            { id:"gate",            name:"교문",        type:"travel", xPct:73.5, yPct:94.8, wPct:14.8, hPct:4.7, destOffset:{x:7.4, y:1.35}, dialogue: [{ speaker:"교문", text:"낡은 철제 교문이다." },{ speaker:"진태서", text:"아직 학교를 다 안둘러봤어." }]}
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

// 포인트의 실제 이동 목적지 계산.
// destOffset이 없으면 그 포인트의 왼쪽 위 모서리(xPct, yPct)가 그대로 목적지가 됨.
// destOffset: {x, y}를 주면 그 모서리 기준 상대 위치(%)만큼 이동한 지점이 목적지가 됨.
function getDestPct(point) {
    const off = point.destOffset || { x: 0, y: 0 };
    return { x: point.xPct + off.x, y: point.yPct + off.y };
}

// ---------- 게임 시작 도입부 대사 ----------
// darkness: 그 줄이 뜨는 동안 맵 위 검은 오버레이의 진하기(1=완전히 검음 ~ 0=완전히 안 보임)
// textColor: 그 줄만 다른 글자색 (CSS color 값 아무거나, 예: "red", "#ff3b3b")
const introDialogue = [
    { speaker:" ", text:"일단 설명을 하자면", darkness:1 },
    { speaker:" ", text:"우리는 지금...", darkness:1 },
    { speaker:" ", text:"다 같이 모여 있는 거야", darkness:1 },
    { speaker:" ", text:"우리끼리 이렇게 이 자리에서..", darkness:1 },
    { speaker:" ", text:"", darkness:1 },
    { speaker:"???", text:"오랜만이지?", darkness:1 },
    { speaker:"???", text:"...어쩐지 좀 익숙한 것 같기도 하고", darkness:1 },
    { speaker:"???", text:"근데.. 이상하게 다시 한 번 온 것 같기도 하고", darkness:1 },
    { speaker:"???", text:"", darkness:1 },
    { speaker:"???", text:"근데 그거~ 다 착각이야~", darkness:1 },
    { speaker:"???", text:"다시 온 것 같은 기분", darkness:1 },
    { speaker:"???", text:"", darkness:1 },
    { speaker:"???", text:"여기는 조금 낯설어..", darkness:1 },
    { speaker:"???", text:"왜일까?", darkness:1 },
    { speaker:"???", text:"익숙한데.. 낯설어...", darkness:1 },

    { speaker:"???", text:"근데 그게 사실 그렇게 중요한 건 아니잖아", darkness:0.75 },
    { speaker:"???", text:"우리 모두 여기 있다는 게 중요한 거지", darkness:0.75 },
    { speaker:"친구", text:"우리끼리 친구들끼리 모여서", darkness:0.75 },
    { speaker:"친구", text:"다 같이 함께 있다는 게 가장 중요한 거 아니겠니?", darkness:0.75 },

    { speaker:"친구", text:"우리는 지금 교문 앞에 서 있어", darkness:0.5 },
    { speaker:"친구", text:"학교는 뭐 다들 알다시피 우리 학교 그렇게 크지 않잖아", darkness:0.5 },
    { speaker:"친구", text:"전교생이 아마.. 500명 정도 되려나?", darkness:0.5 },
    { speaker:"친구", text:"정확하게... 세어본 적은 없어서 모르겠네?", darkness:0.5 },
    { speaker:"친구", text:"하여튼! 내가 학생을 정확하게 세어본 적은 없어서 모르겠어", darkness:0.5 },
    { speaker:"친구", text:"어쨌든 그 정도겠지?", darkness:0.5 },
    { speaker:"친구", text:"우리가 왜 여기 왔을까?", darkness:0.5 },
    { speaker:"친구", text:"뭐 우리가 다니는 학교니까 왔겠지?", darkness:0.5 },
    { speaker:"친구", text:"근데 그 전까지의 기억은 딱히 나는 게 없어", darkness:0.5 },
    { speaker:"친구", text:"...하지만", darkness:0.5 },
    { speaker:"친구", text:"정말 익숙하게 우리는 학교로 왔다는 사실이야", darkness:0.5 },
    { speaker:"친구", text:"왔다는 게 지금 이 상황이고", darkness:0.5 },

    { speaker:"친구", text:"이상하게 기억이 나 '아 맞아 우리 학교 왔었지'", darkness:0.25 },
    { speaker:"친구", text:"그리고 나는", darkness:0.25 },
    { speaker:"친구", text:"너희가 잘 아는", darkness:0.25 },
    { speaker:"친구", text:"너희들의 친구", darkness:0.25 },
    { speaker:"진태서", text:"진태서", darkness:0.25, textColor:"red" },
    { speaker:"진태서", text:"익숙하지?", darkness:0.25 },
    { speaker:"진태서", text:"다른 건 기억이 다 안 나도", darkness:0.25 },
    { speaker:"진태서", text:"나는 기억이 날 거야", darkness:0.25 },

    { speaker:"진태서", text:"하늘은 분홍색", darkness:0 },
    { speaker:"진태서", text:"구름은 하늘색", darkness:0 },
    { speaker:"진태서", text:"아주 맑은 날이야~ 날씨가 좋더라고", darkness:0 },
    { speaker:"진태서", text:"해도 떠 있고 아마.. 점심쯤인가?", darkness:0 },
    { speaker:"진태서", text:"근데 이상하지?", darkness:0 },
    { speaker:"진태서", text:"이 시간은 분명.. 학교에 학생들이 있을 시간인데?", darkness:0 },
    { speaker:"진태서", text:"..이상하게 조용해", darkness:0 },
    { speaker:"진태서", text:"", darkness:0 },
    { speaker:"진태서", text:"선생님도... 없는 것 같고?", darkness:0 },
    { speaker:"진태서", text:"일단, 들어가 보는 게 좋지 않을까?", darkness:0 },
    { speaker:"진태서", text:"어쨌든 우리는 학생이고", darkness:0 },
    { speaker:"진태서", text:"우리는 지금 지각을 했잖아", darkness:0 },
    { speaker:"진태서", text:"지각한 학생들은 얼른 학교로 들어가야지", darkness:0 },
    { speaker:"진태서", text:"그렇게 우리는 움직이기 시작할 건데", darkness:0 },
    { speaker:"진태서", text:"어떻게? 학교로 들어가 볼래?", darkness:0 }
];

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
        playDialogue(introDialogue);
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

// ---------- 대사 시스템 (타이핑 + 진행중 조작 잠금) ----------
// 대사는 여러 줄(각 줄마다 화자 지정 가능)로 이어질 수 있음.
// input이 그냥 문자열이면 화자는 defaultSpeaker(기본 "진태서")로 자동 처리.
// input이 [{speaker, text}, ...] 배열이면 그대로 순서대로 재생.
let dialogueQueue = [];
let dialogueIndex = 0;
let dialogueActive = false;      // 대사창이 화면에 보이는지(연출용)
let interactionsLocked = false;  // 이동/다른 상호작용을 막을지 여부 (더 볼 대사가 남아있을 때만 true)
let isTyping = false;            // 현재 줄이 타이핑 애니메이션 중인지
let typingTimer = null;

// 맵 위 검은 오버레이의 어둡기(0~1)를 직접 지정. 1=완전히 검게, 0=완전히 안 보임.
function setMapDarkness(value) {
    mapOverlay.style.opacity = value;
}

// 일반적인 잠금/해제 처리 (기본 어둡기: 잠기면 0.65, 풀리면 0). 대사 줄에 darkness가 따로 지정 안 됐을 때 쓰임.
function setInteractionsLocked(value) {
    interactionsLocked = value;
    setMapDarkness(value ? 0.65 : 0);
}

const TYPE_SPEED_MS = 25; // 글자당 속도(ms). 느리게/빠르게 하고 싶으면 이 숫자만 바꾸면 됨.

function normalizeDialogue(input, defaultSpeaker) {
    const speaker = defaultSpeaker || "진태서";
    if (!input) return [];
    if (Array.isArray(input)) {
        return input.map(item =>
            typeof item === "string"
                ? { speaker: speaker, text: item }
                // darkness(맵 어둡기 지정)와 textColor(글자색 지정)도 그대로 유지해서 넘김
                : { speaker: item.speaker || speaker, text: item.text, darkness: item.darkness, textColor: item.textColor }
        );
    }
    return [{ speaker: speaker, text: input }];
}

function playDialogue(input, defaultSpeaker) {
    dialogueQueue = normalizeDialogue(input, defaultSpeaker);
    if (dialogueQueue.length === 0) return;
    dialogueIndex = 0;
    dialogueActive = true;
    dialogueBox.classList.add("active");
    startTypingLine();
}

function startTypingLine() {
    const line = dialogueQueue[dialogueIndex];
    speakerEl.textContent = line.speaker;
    dialogue.style.color = line.textColor || ""; // 지정 없으면 기본 글자색으로 리셋
    dialogue.innerHTML = "";
    dialogueNext.style.display = "none";
    isTyping = true;

    // 잠금 여부는 "타이핑 중이냐"가 아니라 "뒤에 더 볼 대사가 남아있냐"로 결정.
    // 즉 마지막 줄이면 타이핑되는 도중이라도 바로 잠금 해제(오버레이도 즉시 사라짐).
    const isLastLine = dialogueIndex >= dialogueQueue.length - 1;
    interactionsLocked = !isLastLine;

    // 이 줄에 darkness가 직접 지정돼 있으면 그 값을 그대로 사용, 없으면 기본 규칙(잠기면 0.65, 풀리면 0)
    const darkness = (typeof line.darkness === "number") ? line.darkness : (interactionsLocked ? 0.65 : 0);
    setMapDarkness(darkness);

    // 빈 대사(내용 없음)는 타이핑할 글자가 없으니 바로 완료 처리
    if (line.text.length === 0) {
        finishLine();
        return;
    }

    let i = 0;
    clearInterval(typingTimer);
    typingTimer = setInterval(() => {
        i++;
        dialogue.innerHTML = line.text.slice(0, i);
        if (i >= line.text.length) {
            finishLine();
        }
    }, TYPE_SPEED_MS);
}

function finishLine() {
    clearInterval(typingTimer);
    isTyping = false;
    const isLastLine = dialogueIndex >= dialogueQueue.length - 1;
    dialogueNext.style.display = isLastLine ? "none" : "block";
    // 어둡기/잠금 상태는 이미 startTypingLine에서 정해졌으므로 여기선 건드리지 않음
}

function skipTyping() {
    const line = dialogueQueue[dialogueIndex];
    dialogue.innerHTML = line.text;
    finishLine();
}

// 클릭/스페이스/엔터 공통 진행 로직:
// 타이핑 중이면 스킵, 다음 줄 있으면 다음 줄, 마지막 줄이면 대사창 닫기
function advanceDialogue() {
    if (!dialogueActive) return;

    if (isTyping) {
        skipTyping();
        return;
    }

    if (dialogueIndex < dialogueQueue.length - 1) {
        dialogueIndex++;
        startTypingLine();
    } else {
        endDialogue();
    }
}

function endDialogue() {
    dialogueActive = false;
    setInteractionsLocked(false);
    dialogueBox.classList.remove("active");
    dialogueQueue = [];
    dialogueIndex = 0;
}

dialogueBox.addEventListener("click", advanceDialogue);
window.addEventListener("keydown", e => {
    if ((e.key === " " || e.key === "Enter") && dialogueActive) {
        e.preventDefault();
        advanceDialogue();
    }
});

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
    if (interactionsLocked) return; // 아직 볼 대사가 남아있을 때만 다른 상호작용 잠금

    if (point.type === "travel") {
        locationText.innerHTML = point.name;
        // point.dialogue가 있으면 그 배열(화자 포함) 사용, 없으면 enterText를 진태서 대사로 표시
        playDialogue(point.dialogue || point.enterText);
        const dest = getDestPct(point);
        const pos = pctToWorldPx(dest.x, dest.y);
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
        point.destOffset = point.becomesTravel.destOffset || { x: 0, y: 0 };
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

    if (!interactionsLocked) {
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