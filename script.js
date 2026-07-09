const arrow = document.getElementById("arrow");

// ----------------------
// App State
// ----------------------

const state = {
    heading: 0,
    windDirection: 0,
    windSpeed: 0,
    latitude: null,
    longitude: null
};

// ----------------------
// Smooth Arrow Animation
// ----------------------

let currentAngle = 0;
let targetAngle = 0;

function shortestAngle(current, target) {
    const diff = ((target - current + 540) % 360) - 180;
    return current + diff;
}

function animate() {
    currentAngle += (targetAngle - currentAngle) * 0.12;

    arrow.style.transform = `rotate(${currentAngle}deg)`;

    requestAnimationFrame(animate);
}

animate();

// ----------------------
// Update Arrow
// ----------------------

function updateArrow() {

    const relative =
        state.windDirection - state.heading;

    targetAngle =
        shortestAngle(currentAngle, relative);

}

// ----------------------
// Compass
// ----------------------

window.addEventListener("deviceorientation", (event) => {

    if(event.alpha == null) return;

    state.heading = event.alpha;

    updateArrow();

});

// ----------------------
// Weather
// ----------------------

async function getWeather() {

    const url =
`https://api.open-meteo.com/v1/forecast?latitude=${state.latitude}&longitude=${state.longitude}&current=wind_speed_10m,wind_direction_10m`;

    const response = await fetch(url);

    const data = await response.json();

    state.windDirection =
        data.current.wind_direction_10m;

    state.windSpeed =
        data.current.wind_speed_10m;

    console.log("Wind:", state.windDirection);
    console.log("Speed:", state.windSpeed);

    updateArrow();

}

// ----------------------
// Location
// ----------------------

navigator.geolocation.getCurrentPosition(

(position)=>{

    state.latitude = position.coords.latitude;
    state.longitude = position.coords.longitude;

    console.log(
        state.latitude,
        state.longitude
    );

    getWeather();

},

(error)=>{

    console.error(error);

}

);