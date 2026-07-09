const arrow = document.getElementById("arrow");

let angle = 0;

function rotateArrow(){

    angle = Math.random()*360;

    arrow.style.transform = `rotate(${angle}deg)`;

}

setInterval(rotateArrow,2500);