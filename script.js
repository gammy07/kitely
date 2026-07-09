// =====================================
// KITELY v0.1
// =====================================

const arrow = document.getElementById("arrow");

const speedText = document.getElementById("speed");
const directionText = document.getElementById("direction");
const degreeText = document.getElementById("degrees");
const locationText = document.getElementById("location");
const statusText = document.getElementById("status");


// =====================================
// APP STATE
// =====================================

const state = {

    latitude: null,
    longitude: null,

    windSpeed: 0,
    windDirection: 0,

    heading: 0

};


// =====================================
// ARROW ANIMATION
// =====================================

let currentRotation = 0;
let targetRotation = 0;

function normalizeAngle(angle){

    angle %= 360;

    if(angle < 0)
        angle += 360;

    return angle;

}

function shortestDifference(from,to){

    return ((to-from+540)%360)-180;

}

function animationLoop(){

    let difference = shortestDifference(currentRotation,targetRotation);

    currentRotation += difference * 0.12;

    arrow.style.transform =
        `rotate(${currentRotation}deg)`;

    requestAnimationFrame(animationLoop);

}

animationLoop();


// =====================================
// CARDINAL DIRECTIONS
// =====================================

function degreesToCardinal(degrees){

    const dirs = [

        "N","NE","E","SE",
        "S","SW","W","NW"

    ];

    return dirs[
        Math.round(degrees/45)%8
    ];

}


// =====================================
// UPDATE UI
// =====================================

function updateUI(){

    speedText.textContent =
        Math.round(state.windSpeed);

    directionText.textContent =
        degreesToCardinal(state.windDirection);

    degreeText.textContent =
        `${Math.round(state.windDirection)}°`;

    statusText.textContent =
        "Wind found";

    updateArrow();

}


// =====================================
// UPDATE ARROW
// =====================================

function updateArrow(){

    targetRotation =
        normalizeAngle(
            state.windDirection
            -
            state.heading
        );

}


// =====================================
// WEATHER
// =====================================

async function getWeather(){

    const url =

`https://api.open-meteo.com/v1/forecast?latitude=${state.latitude}&longitude=${state.longitude}&current=wind_speed_10m,wind_direction_10m`;

    try{

        const response = await fetch(url);

        const data = await response.json();

        state.windSpeed =
            data.current.wind_speed_10m;

        state.windDirection =
            data.current.wind_direction_10m;

        updateUI();

    }

    catch(e){

        console.error(e);

        statusText.textContent =
            "Couldn't fetch weather";

    }

}


// =====================================
// LOCATION
// =====================================

navigator.geolocation.getCurrentPosition(

(position)=>{

    state.latitude =
        position.coords.latitude;

    state.longitude =
        position.coords.longitude;

    locationText.textContent =
        `${state.latitude.toFixed(2)}, ${state.longitude.toFixed(2)}`;

    getWeather();

},

()=>{

    statusText.textContent =
        "Location denied";

}

);


// =====================================
// REFRESH WEATHER
// =====================================

setInterval(

getWeather,

1000*60*10

);


// =====================================
// COMPASS PLACEHOLDER
// =====================================
//
// This will become Capacitor later.
//

window.addEventListener(

"deviceorientation",

(event)=>{

    if(event.alpha == null)
        return;

    state.heading = event.alpha;

    updateArrow();

}

);