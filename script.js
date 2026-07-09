const player = document.getElementById("player");

const dialogue = document.getElementById("text");

const locationText = document.getElementById("location");


function movePlayer(x,y,text,location){

    player.style.left = x + "px";

    player.style.top = y + "px";

    dialogue.innerHTML = text;

    locationText.innerHTML = location;

}



document.getElementById("zone1").onclick=()=>{

    movePlayer(

        165,
        155,

        "운동장이다.",

        "운동장"

    );

}


document.getElementById("zone2").onclick=()=>{

    movePlayer(

        475,
        165,

        "연못이다.",

        "연못"

    );

}


document.getElementById("zone3").onclick=()=>{

    movePlayer(

        240,
        430,

        "본관으로 들어갈 수 있을 것 같다.",

        "본관"

    );

}


document.getElementById("zone4").onclick=()=>{

    movePlayer(

        565,
        440,

        "아직 갈 수 없는 장소다.",

        "???"

    );

}