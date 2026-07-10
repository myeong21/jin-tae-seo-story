const mapShell = document.getElementById("map-shell");
const mapStage = document.getElementById("map-stage");
const map = document.getElementById("map");
const player = document.getElementById("player");
const dialogue = document.getElementById("text");
const locationText = document.getElementById("location");

function fitMap() {
    if (!map.naturalWidth || !map.naturalHeight) return;

    const shellWidth = mapShell.clientWidth;
    const shellHeight = mapShell.clientHeight;

    const imageRatio = map.naturalWidth / map.naturalHeight;
    const shellRatio = shellWidth / shellHeight;

    if (imageRatio < shellRatio) {
        // 세로로 긴 맵 -> 가로를 화면에 맞춤
        mapStage.style.width = `${shellWidth}px`;
        mapStage.style.height = `${Math.round(shellWidth / imageRatio)}px`;
    } else {
        // 가로로 긴 맵 -> 세로를 화면에 맞춤
        mapStage.style.height = `${shellHeight}px`;
        mapStage.style.width = `${Math.round(shellHeight * imageRatio)}px`;
    }
}

function movePlayer(xPercent, yPercent, text, location) {
    player.style.left = `${xPercent}%`;
    player.style.top = `${yPercent}%`;

    dialogue.textContent = text;
    locationText.textContent = location;
}

document.getElementById("zone1").addEventListener("click", () => {
    movePlayer(16, 18, "운동장이다.", "운동장");
});

document.getElementById("zone2").addEventListener("click", () => {
    movePlayer(46, 20, "연못이다.", "연못");
});

document.getElementById("zone3").addEventListener("click", () => {
    movePlayer(30, 56, "본관으로 들어갈 수 있을 것 같다.", "본관");
});

document.getElementById("zone4").addEventListener("click", () => {
    movePlayer(68, 64, "아직 갈 수 없는 장소다.", "???");
});

document.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    const step = 40;

    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        e.preventDefault();
    }

    if (key === "w" || e.key === "ArrowUp") {
        mapShell.scrollTop -= step;
    }
    if (key === "s" || e.key === "ArrowDown") {
        mapShell.scrollTop += step;
    }
    if (key === "a" || e.key === "ArrowLeft") {
        mapShell.scrollLeft -= step;
    }
    if (key === "d" || e.key === "ArrowRight") {
        mapShell.scrollLeft += step;
    }
});

window.addEventListener("resize", fitMap);
map.addEventListener("load", fitMap);

if (map.complete) {
    fitMap();
}

// 처음 위치
movePlayer(10, 15, "게임을 시작하세요.", "학교");