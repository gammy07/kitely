// =====================================
// KITELY v3.3.0 - @arnavg :)
// =====================================

// UI Elements
const arrow = document.getElementById("arrow");
const speedText = document.getElementById("speed");
const directionText = document.getElementById("direction");
const degreeText = document.getElementById("degrees");
const locationText = document.getElementById("location");
const statusText = document.getElementById("status");
const speedUnit = document.getElementById("unit"); 
const nextUpdateDiv = document.getElementById("next-update");
const gustsDiv = document.getElementById("gusts");
const toggleCompass = document.getElementById("togglecompass");
const arrowPath = document.querySelector('.arrow svg path');
const svgRain = `<svg class="weather-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 16C22 19.3137 19.3137 22 16 22C12.6863 22 10 19.3137 10 16C10 11.6863 16 2 16 2C16 2 22 11.6863 22 16Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 9C8 10.6569 6.65685 12 5 12C3.34315 12 2 10.6569 2 9C2 6.84315 5 2 5 2C5 2 8 6.84315 8 9Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const svgThunder = `<svg class="weather-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.2495 2H8.49395C8.31447 2 8.22473 2 8.14551 2.02733C8.07544 2.05149 8.01163 2.09093 7.95868 2.14279C7.89881 2.20143 7.85868 2.2817 7.77841 2.44223L3.57841 10.8422C3.38673 11.2256 3.29089 11.4173 3.31391 11.5731C3.33401 11.7091 3.40927 11.8309 3.52197 11.9097C3.65104 12 3.86534 12 4.29395 12H10.4995L7.49953 22L19.6926 9.35531C20.104 8.9287 20.3097 8.7154 20.3217 8.53288C20.3321 8.37446 20.2667 8.22049 20.1454 8.11803C20.0057 8 19.7094 8 19.1167 8H11.9995L14.2495 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// Alert UI Elements
const weatherAlertDiv = document.getElementById("weather-alert");
const weatherAlertText = document.getElementById("weather-alert-text");
const alertsToggle = document.getElementById("alerts-toggle");

let compassmode = 0;

// local storage stuffz
let currentUnit = localStorage.getItem("kitely-currentUnit") || 'kmh';
let enableGradients = localStorage.getItem("kitely-enableGradients") !== null ? localStorage.getItem("kitely-enableGradients") === "true" : true;
let showGusts = localStorage.getItem("kitely-showGusts") !== null ? localStorage.getItem("kitely-showGusts") === "true" : false;
let showUpdateTimes = localStorage.getItem("kitely-showUpdateTimes") !== null ? localStorage.getItem("kitely-showUpdateTimes") === "true" : true;
let showAlerts = localStorage.getItem("kitely-showAlerts") !== null ? localStorage.getItem("kitely-showAlerts") === "true" : true;

let audioCtx = null;

function pushLocationToWidget(lat, lon) {
    try {
        if (window.Capacitor && window.Capacitor.nativePromise) {
            window.Capacitor.nativePromise("LocationStorage", "saveLocation", { latitude: lat, longitude: lon, unit: currentUnit });
        }
    } catch (error) { console.error("WIDGET:", error); }
}

function playClickSound() {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.015);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.015);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.015);
    } catch (e) {}
}

function triggerHaptic(duration = 20) {
    try {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) {
            window.Capacitor.Plugins.Haptics.vibrate({ duration });
        } else if ('vibrate' in navigator) navigator.vibrate(duration);
    } catch (e) {}
}

const state = { latitude: null, longitude: null, windSpeed: 0, windGust: 0, windDirection: 0, heading: 0, weatherCode: 0};

function updateCountdown() {
    if (!nextUpdateDiv) return;
    if (!showUpdateTimes) { nextUpdateDiv.style.display = "none"; return; }
    nextUpdateDiv.style.display = "block";
    const now = new Date();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const minutesToNext = 15 - (minutes % 15);
    let remSeconds = 60 - seconds;
    let remMinutes = minutesToNext - 1;
    if (remSeconds === 60) { remSeconds = 0; remMinutes += 1; }
    if (remMinutes === 15) remMinutes = 0;
    nextUpdateDiv.textContent = `Next update in ${remMinutes}m ${String(remSeconds).padStart(2, '0')}s`;
}
setInterval(updateCountdown, 1000);
updateCountdown();

let currentRotation = 0;
let targetRotation = 0;

function normalizeAngle(angle) {
    angle %= 360;
    if (angle < 0) angle += 360;
    return angle;
}

function shortestDifference(from, to) { return ((to - from + 540) % 360) - 180; }

function animationLoop() {
    let difference = shortestDifference(currentRotation, targetRotation);
    currentRotation += difference * 0.12;
    if (arrow) arrow.style.transform = `rotate(${currentRotation}deg)`;
    requestAnimationFrame(animationLoop);
}
animationLoop();

function degreesToCardinal(degrees) {
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return dirs[Math.round(degrees / 45) % 8];
}

function getSpeedColor(speedInKmh) {
    if (!enableGradients) return "#ffffff";
    if (speedInKmh < 10) return "#60a5fa";      
    if (speedInKmh < 20) return "#34d399";      
    if (speedInKmh < 35) return "#fb9a24";      
    if (speedInKmh < 50) return "#ea07cc";      
    return "#ad14ff";                           
}

// MAIN Update UI function
function updateUI() {
    if (speedText) speedText.textContent = Math.round(state.windSpeed * 10) / 10;
    
    const unitLabel = currentUnit === 'mph' ? 'mph' : currentUnit === 'ms' ? 'm/s' : currentUnit === 'kn' ? 'kn' : 'km/h';
    if (speedUnit) speedUnit.textContent = unitLabel;

    let speedInKmh = state.windSpeed;
    if (currentUnit === 'mph') {
        speedInKmh = state.windSpeed * 1.60934;
    } else if (currentUnit === 'ms') {
        speedInKmh = state.windSpeed * 3.6;
    } else if (currentUnit === 'kn') {
        speedInKmh = state.windSpeed / 0.539957; 
    }

    const dynamicColor = getSpeedColor(speedInKmh);

    if (speedText) speedText.style.color = enableGradients ? dynamicColor : "#ffffff";
    if (arrow && compassmode === 0) arrow.style.color = enableGradients ? dynamicColor : "#ffffff";

    // Direction text + Independent Weather Icons
    if (directionText) {
        let directionIcon = "";
        if ([95, 96, 99].includes(state.weatherCode)) {
            directionIcon = `<span style="color: #fbbf24; margin-left: 6px; display: inline-flex; align-items: center; vertical-align: middle;">${svgThunder}</span>`;
        } else if ([61, 63, 65, 66, 67, 80, 81, 82].includes(state.weatherCode)) {
            directionIcon = `<span style="color: #60a5fa; margin-left: 6px; display: inline-flex; align-items: center; vertical-align: middle;">${svgRain}</span>`;
        }
        directionText.innerHTML = `${degreesToCardinal(state.windDirection)}${directionIcon}`;
    }

    if (degreeText) degreeText.textContent = `${Math.round(state.windDirection)}°`;

    if (gustsDiv) {
        if (showGusts) {
            gustsDiv.style.display = "block";
            gustsDiv.textContent = `Gusts: ${Math.round(state.windGust * 10) / 10} ${unitLabel}`;
        } else {
            gustsDiv.style.display = "none";
        }
    }

    if (nextUpdateDiv) {
        nextUpdateDiv.style.display = showUpdateTimes ? "block" : "none";
    }
    
    if (compassmode !== 1 && statusText) {
        statusText.textContent = "Wind metrics updated";
    }
}

function updateArrow() {
    let rawTarget = compassmode === 1 ? 180 - state.heading : state.windDirection - state.heading;
    targetRotation = normalizeAngle(rawTarget + 90); 
}

// MAIN weather-fetch function
async function getWeather() {
    if (!state.latitude || !state.longitude) return;
    
    let apiUnitStr = "";
    if (currentUnit === 'mph') apiUnitStr = "&wind_speed_unit=mph";
    if (currentUnit === 'ms') apiUnitStr = "&wind_speed_unit=ms";
    if (currentUnit === 'kn') apiUnitStr = "&wind_speed_unit=kn";

    // Fetch Open-Meteo Wind
    const fetchUrl = `https://api.open-meteo.com/v1/forecast?latitude=${state.latitude}&longitude=${state.longitude}&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code&hourly=wind_speed_10m,wind_direction_10m,weather_code&timezone=auto${apiUnitStr}&_=${Date.now()}`;

    try {
        const response = await fetch(fetchUrl);
        const data = await response.json();

        state.windSpeed = data.current.wind_speed_10m;
        state.windDirection = data.current.wind_direction_10m;
        state.windGust = data.current.wind_gusts_10m || 0;
        state.weatherCode = data.current.weather_code;
       
        const wmoCode = data.current.weather_code;
        let alertMessage = "";

        if ([95, 96, 99].includes(wmoCode)) alertMessage = "Thunderstorm Warning: Unsafe to fly!";
        else if ([61, 63, 65, 66, 67, 80, 81, 82].includes(wmoCode)) alertMessage = "Rain Expected: Keep your kite dry!";

        if (showAlerts && alertMessage !== "" && weatherAlertDiv && weatherAlertText) {
            weatherAlertText.textContent = alertMessage;
            weatherAlertDiv.style.display = "flex";
        } else if (weatherAlertDiv) {
            weatherAlertDiv.style.display = "none";
        }

        if (state.windGust > (state.windSpeed * 1.5) && state.windSpeed > 15) {
            alertMessage = "Turbulence alert: Gusty Winds";
        }

        if (data.hourly) addforecastrow(data.hourly);
        updateUI();
    } catch (e) {
        console.error("Wind fetch failed:", e);
        if (statusText) statusText.textContent = "Couldn't fetch weather";
    }
}

let locationSource = 'gps'; 

async function initNativeLocation() {
    if (locationSource === 'custom') return;
    try {
        const { Geolocation } = Capacitor.Plugins;
        let permStatus = await Geolocation.checkPermissions();
        if (permStatus.location === 'prompt' || permStatus.location === 'prompt-with-rationale') {
            permStatus = await Geolocation.requestPermissions();
        }
        if (permStatus.location === 'granted') {
            const position = await Geolocation.getCurrentPosition();
            state.latitude = position.coords.latitude;
            state.longitude = position.coords.longitude;
            if (locationText) locationText.textContent = `${state.latitude.toFixed(2)}, ${state.longitude.toFixed(2)}`;
            getWeather();
            pushLocationToWidget(state.latitude, state.longitude);
        } else if (statusText) statusText.textContent = "Location permission denied";
    } catch (error) {
        console.error("Native location failure:", error);
    }
}

function initAbsoluteCompass() {
    if ('ondeviceorientationabsolute' in window) window.addEventListener("deviceorientationabsolute", handleAbsoluteOrientation, true);
    else if ('ondeviceorientation' in window) window.addEventListener("deviceorientation", handleAbsoluteOrientation, true);
    else if (statusText) statusText.textContent = "Compass sensors not supported";
}

function handleAbsoluteOrientation(event) {
    let absoluteHeading = event.alpha;
    if (absoluteHeading === null || absoluteHeading === undefined) return;
    let baseHeading = normalizeAngle(360 - absoluteHeading);
    state.heading = normalizeAngle(baseHeading - 90);
    updateArrow();
}

function addforecastrow(hourlyData) {
    const container = document.getElementById("forecast-container");
    if (!container || !hourlyData || !hourlyData.time) return;
    container.innerHTML = "";
    const localDate = new Date();
    const pad = (num) => String(num).padStart(2, '0');
    const currentHourISO = `${localDate.getFullYear()}-${pad(localDate.getMonth() + 1)}-${pad(localDate.getDate())}T${pad(localDate.getHours())}:00`;
    let targetIndex = hourlyData.time.findIndex(t => t.startsWith(currentHourISO));
    if (targetIndex === -1) targetIndex = 0;

    for (let i = 1; i <= 24; i++) { 
        const index = targetIndex + i;
        if (index >= hourlyData.time.length) break;
        const formattedTime = hourlyData.time[index].split("T")[1];
        let speed = hourlyData.wind_speed_10m[index];
        const cardinalDirection = degreesToCardinal(hourlyData.wind_direction_10m[index]);
        const wmoCode = hourlyData.weather_code[index];
        let weatherIcon = "";

        if ([95, 96, 99].includes(wmoCode)) weatherIcon = `<span style="color: #fbbf24; margin-left: 4px; display: inline-flex; align-items: center; vertical-align: middle;">${svgThunder}</span>`;
        else if ([61, 63, 65, 66, 67, 80, 81, 82].includes(wmoCode)) weatherIcon = `<span style="color: #60a5fa; margin-left: 4px; display: inline-flex; align-items: center; vertical-align: middle;">${svgRain}</span>`;

        const card = document.createElement("div");
        card.className = "forecast-mini-card";
        card.innerHTML = `<div class="forecast-time" style="display: flex; align-items: center; justify-content: center;">${formattedTime}${weatherIcon}</div><div class="forecast-speed">${Math.round(speed * 10) / 10}</div><div class="forecast-dir">${cardinalDirection}</div>`;
        container.appendChild(card);
    }
} 

document.addEventListener("DOMContentLoaded", () => {
    initNativeLocation();
    initAbsoluteCompass();

    const versionBox = document.getElementById("app-version-box");
    if (versionBox) versionBox.addEventListener("click", () => window.open("https://arnavg-blg.vercel.app/kitely", "_blank"));

    const logoBtn = document.getElementById("top-left-logo");
    const settingsDrawer = document.getElementById("settings-drawer");
    const closeSettings = document.getElementById("close-settings");

    if (logoBtn && settingsDrawer && closeSettings) {
        logoBtn.addEventListener("click", () => { playClickSound(); triggerHaptic(10); settingsDrawer.classList.add("open"); });
        closeSettings.addEventListener("click", () => { playClickSound(); triggerHaptic(10); settingsDrawer.classList.remove("open"); });
        document.addEventListener("click", (event) => { if (!settingsDrawer.contains(event.target) && event.target !== logoBtn) settingsDrawer.classList.remove("open"); });
    }

    const refreshBtn = document.getElementById("refresh-btn");
    if (refreshBtn) refreshBtn.addEventListener("click", () => { playClickSound(); triggerHaptic(15); if (statusText) statusText.textContent = "Refreshing wind..."; getWeather(); });

    if (toggleCompass) {
        toggleCompass.addEventListener('click', function() {
            if (toggleCompass.classList.contains('off')) {
                toggleCompass.classList.remove('off'); toggleCompass.classList.add('on'); compassmode = 1;
                if (statusText) { statusText.textContent = "North Compass Mode"; statusText.style.color = "red"; }
                if (arrowPath) arrowPath.style.stroke = "red"; if (arrow) arrow.style.color = "red";
            } else {
                toggleCompass.classList.remove('on'); toggleCompass.classList.add('off'); compassmode = 0;
                if (statusText) { statusText.style.color = "#8b8b92"; statusText.textContent = "Wind Tracking Mode"; }
                if (arrowPath) arrowPath.style.stroke = "currentColor"; updateUI();
            }
            updateArrow(); triggerHaptic(40); playClickSound();
        });
    }

    if (alertsToggle) {
        alertsToggle.checked = showAlerts;
        alertsToggle.addEventListener("change", (e) => { playClickSound(); triggerHaptic(12); showAlerts = e.target.checked; localStorage.setItem("kitely-showAlerts", showAlerts); getWeather(); });
    }

    const gradientToggle = document.getElementById("gradient-toggle");
    if (gradientToggle) {
        gradientToggle.checked = enableGradients;
        gradientToggle.addEventListener("change", (e) => { playClickSound(); triggerHaptic(12); enableGradients = e.target.checked; localStorage.setItem("kitely-enableGradients", enableGradients); updateUI(); });
    }

    const gustsToggle = document.getElementById("gusts-toggle");
    if (gustsToggle) {
        gustsToggle.checked = showGusts;
        gustsToggle.addEventListener("change", (e) => { playClickSound(); triggerHaptic(12); showGusts = e.target.checked; localStorage.setItem("kitely-showGusts", showGusts); updateUI(); });
    }

    const updateTimeToggle = document.getElementById("update-time-toggle");
    if (updateTimeToggle) {
        updateTimeToggle.checked = showUpdateTimes;
        updateTimeToggle.addEventListener("change", (e) => { playClickSound(); triggerHaptic(12); showUpdateTimes = e.target.checked; localStorage.setItem("kitely-showUpdateTimes", showUpdateTimes); updateCountdown(); updateUI(); });
    }

    const unitSelect = document.getElementById('unit-select');
    if (unitSelect) {
        unitSelect.value = currentUnit; 
        unitSelect.addEventListener('change', (event) => { currentUnit = event.target.value; localStorage.setItem("kitely-currentUnit", currentUnit); getWeather(); if (state.latitude !== null && state.longitude !== null) pushLocationToWidget(state.latitude, state.longitude); });
    }

    const infoBtn = document.getElementById("info-btn");
    const infoPanel = document.getElementById("gradient-info-panel");
    if (infoBtn && infoPanel) infoBtn.addEventListener("click", () => { infoPanel.style.display = infoPanel.style.display === "none" ? "flex" : "none"; });

    const sourceRadios = document.querySelectorAll('input[name="loc-source"]');
    const customInputsDiv = document.getElementById("custom-coords-inputs");
    const applyBtn = document.getElementById("apply-coords-btn");
    const savePresetBtn = document.getElementById("save-preset-btn");
    const presetsList = document.getElementById("presets-list");
    const inputLat = document.getElementById("input-lat");
    const inputLon = document.getElementById("input-lon");

    let savedPresets = JSON.parse(localStorage.getItem("kitely-presets")) || [];
    
    function renderPresets() {
        if (!presetsList) return;
        presetsList.innerHTML = "";
        if (savedPresets.length === 0) { presetsList.innerHTML = `<div class="preset-coords" style="padding: 4px;">No presets saved yet</div>`; return; }
        savedPresets.forEach(preset => {
            const div = document.createElement("div"); div.className = "preset-item";
            div.innerHTML = `<div class="preset-info"><div class="preset-name">${preset.name}</div><div class="preset-coords">${preset.lat.toFixed(2)}, ${preset.lon.toFixed(2)}</div></div><button class="preset-delete-btn" aria-label="Delete Preset">&times;</button>`;
            div.querySelector(".preset-info").addEventListener("click", () => {
                inputLat.value = preset.lat; inputLon.value = preset.lon; state.latitude = preset.lat; state.longitude = preset.lon;
                pushLocationToWidget(state.latitude, state.longitude);
                if (locationText) locationText.textContent = `${state.latitude.toFixed(2)}, ${state.longitude.toFixed(2)}`;
                if (statusText) statusText.textContent = `Loaded preset: ${preset.name}`;
                getWeather();
            });
            div.querySelector(".preset-delete-btn").addEventListener("click", (e) => {
                e.stopPropagation(); savedPresets = savedPresets.filter(p => p.id !== preset.id);
                localStorage.setItem("kitely-presets", JSON.stringify(savedPresets)); renderPresets();
            });
            presetsList.appendChild(div);
        });
    }
    
    renderPresets();

    sourceRadios.forEach(radio => {
        radio.addEventListener("change", (e) => {
            locationSource = e.target.value;
            if (locationSource === "custom") { if (customInputsDiv) customInputsDiv.style.display = "block"; }
            else { if (customInputsDiv) customInputsDiv.style.display = "none"; initNativeLocation(); }
        });
    });

    if (applyBtn) {
        applyBtn.addEventListener("click", () => {
            const lat = parseFloat(inputLat.value); const lon = parseFloat(inputLon.value);
            if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lon) || lon < -180 || lon > 180) { if (statusText) statusText.textContent = "Invalid coordinates format"; return; }
            state.latitude = lat; state.longitude = lon;
            pushLocationToWidget(state.latitude, state.longitude);
            if (locationText) locationText.textContent = `${state.latitude.toFixed(2)}, ${state.longitude.toFixed(2)}`;
            if (statusText) statusText.textContent = "Custom location set";
            getWeather();
        });
    }

    if (savePresetBtn) {
        savePresetBtn.addEventListener("click", () => {
            const lat = parseFloat(inputLat.value); const lon = parseFloat(inputLon.value);
            if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lon) || lon < -180 || lon > 180) { if (statusText) statusText.textContent = "Enter valid coordinates first"; return; }
            const name = prompt("Enter a name for this preset location:");
            if (!name || name.trim() === "") return;
            const newPreset = { id: Date.now(), name: name.trim(), lat: lat, lon: lon };
            savedPresets.push(newPreset); localStorage.setItem("kitely-presets", JSON.stringify(savedPresets)); renderPresets();
        });
    }
});

setInterval(getWeather, 60000);