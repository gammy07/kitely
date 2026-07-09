// Get references to UI elements
const arrow = document.getElementById("arrow");

// App state
const state = {
    heading: 0,
    latitude: null,
    longitude: null,
    windSpeed: 0,
    windDirection: 0
};

// Get location
/* navigator.geolocation.getCurrentPosition(success, error);

function success(position) {
    state.latitude = position.coords.latitude;
    state.longitude = position.coords.longitude;

    console.log(state.latitude, state.longitude);

    getWeather();
}

function error(err) {
    console.error(err);
}

// Fetch weather
async function getWeather() {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${state.latitude}&longitude=${state.longitude}&current=wind_speed_10m,wind_direction_10m`;

    const response = await fetch(url);
    const data = await response.json();

    state.windSpeed = data.current.wind_speed_10m;
    state.windDirection = data.current.wind_direction_10m;

    console.log(state);
} */

    console.log("Before geolocation");

navigator.geolocation.getCurrentPosition(
    (position) => {
        console.log("SUCCESS!");
        console.log(position);
    },
    (error) => {
        console.log("FAILED!");
        console.log(error);
    }
);

console.log("After geolocation");