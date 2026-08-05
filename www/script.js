// =====================================
// KITELY v3.1.0 - @arnavg :)
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

let compassmode = 0;

// local storage stuffz

let currentUnit = localStorage.getItem("kitely-currentUnit") || 'kmh';

let enableGradients = localStorage.getItem("kitely-enableGradients") !== null 
    ? localStorage.getItem("kitely-enableGradients") === "true" 
    : true;

let showGusts = localStorage.getItem("kitely-showGusts") !== null 
    ? localStorage.getItem("kitely-showGusts") === "true" 
    : false;

let showUpdateTimes = localStorage.getItem("kitely-showUpdateTimes") !== null 
    ? localStorage.getItem("kitely-showUpdateTimes") === "true" 
    : true;

// audio and haptic feedback helper (this is probably messed up asf)

let audioCtx = null;

// 
function playClickSound() {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.015);

        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.015);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.015);
    } catch (e) {
        console.warn("Audio feedback error:", e);
    }
}

function triggerHaptic(duration = 20) {
    try {
        
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) {
            window.Capacitor.Plugins.Haptics.vibrate({ duration });
        } 
       
        else if ('vibrate' in navigator) {
            navigator.vibrate(duration);
        }
    } catch (e) {
        console.warn("Haptic feedback error:", e);
    }
}

// the app state

const state = {
    latitude: null,
    longitude: null,
    windSpeed: 0,
    windGust: 0,
    windDirection: 0, 
    heading: 0        
};

// countdown timer for `next update in: xx` feature

function updateCountdown() {
    if (!nextUpdateDiv) return;

    if (!showUpdateTimes) {
        nextUpdateDiv.style.display = "none";
        return;
    }

    nextUpdateDiv.style.display = "block";

    const now = new Date();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    const minutesToNext = 15 - (minutes % 15);
    let remSeconds = 60 - seconds;
    let remMinutes = minutesToNext - 1;

    if (remSeconds === 60) {
        remSeconds = 0;
        remMinutes += 1;
    }

    if (remMinutes === 15) {
        remMinutes = 0;
    }

    const mStr = remMinutes;
    const sStr = String(remSeconds).padStart(2, '0');

    nextUpdateDiv.textContent = `Next update in ${mStr}m ${sStr}s`;
}
setInterval(updateCountdown, 1000);
updateCountdown();

// arrow animation loop

let currentRotation = 0;
let targetRotation = 0;

function normalizeAngle(angle) {
    angle %= 360;
    if (angle < 0) angle += 360;
    return angle;
}

function shortestDifference(from, to) {
    return ((to - from + 540) % 360) - 180;
}

function animationLoop() {
    let difference = shortestDifference(currentRotation, targetRotation);
    currentRotation += difference * 0.12;
    if (arrow) arrow.style.transform = `rotate(${currentRotation}deg)`;
    requestAnimationFrame(animationLoop);
}
animationLoop();

// cardinal directionz

function degreesToCardinal(degrees) {
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return dirs[Math.round(degrees / 45) % 8];
}

// speed colors/speed gradient

function getSpeedColor(speedInKmh) {
    if (!enableGradients) return "#ffffff";

    if (speedInKmh < 10) return "#60a5fa";      
    if (speedInKmh < 20) return "#34d399";      
    if (speedInKmh < 35) return "#fbbf24";      
    if (speedInKmh < 50) return "#f97316";      
    return "#ef4444";                           
}

// MAIN Update UI function

function updateUI() {
    if (speedText) speedText.textContent = Math.round(state.windSpeed * 10) / 10;
    
    const unitLabel = currentUnit === 'mph' ? 'mph' : currentUnit === 'ms' ? 'm/s' : currentUnit === 'kn' ? 'kn' : 'km/h';
    if (speedUnit) speedUnit.textContent = unitLabel;

    // Convert state speed strictly into km/h for the color thresholds
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

    if (directionText) directionText.textContent = degreesToCardinal(state.windDirection);
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

// arrow rotation function

function updateArrow() {
    let rawTarget;
    if (compassmode === 1) {
        rawTarget = 180 - state.heading;
    } else {
        rawTarget = state.windDirection - state.heading;
    }
    targetRotation = normalizeAngle(rawTarget + 90); // adding 90 degrees because of how phone sensors work
}

// MAIN weather-fetch function from openmeteo

async function getWeather() {
    if (!state.latitude || !state.longitude) return;
    
    let apiUnitStr = "";
    if (currentUnit === 'mph') apiUnitStr = "&wind_speed_unit=mph";
    if (currentUnit === 'ms') apiUnitStr = "&wind_speed_unit=ms";
    if (currentUnit === 'kn') apiUnitStr = "&wind_speed_unit=kn";

    const fetchUrl = `https://api.open-meteo.com/v1/forecast?latitude=${state.latitude}&longitude=${state.longitude}&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=wind_speed_10m,wind_direction_10m&timezone=auto${apiUnitStr}&_=${Date.now()}`;

    try {
        const response = await fetch(fetchUrl);
        const data = await response.json();

        state.windSpeed = data.current.wind_speed_10m;
        state.windDirection = data.current.wind_direction_10m;
        state.windGust = data.current.wind_gusts_10m || 0;
       
        if (data.hourly) {
            addforecastrow(data.hourly);
        }

        updateUI();
    } catch (e) {
        console.error(e);
        if (statusText) statusText.textContent = "Couldn't fetch weather";
    }
}

// geolocation for GPS option in location source

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
        } else {
            if (statusText) statusText.textContent = "Location permission denied";
        }
    } catch (error) {
        console.error("Native location failure:", error);
        if (statusText) statusText.textContent = "Location access failed";
    }
}

// north compass logic

function initAbsoluteCompass() {
    if ('ondeviceorientationabsolute' in window) {
        window.addEventListener("deviceorientationabsolute", handleAbsoluteOrientation, true);
    } else if ('ondeviceorientation' in window) {
        window.addEventListener("deviceorientation", handleAbsoluteOrientation, true);
    } else {
        if (statusText) statusText.textContent = "Compass sensors not supported";
    }
}

function handleAbsoluteOrientation(event) {
    let absoluteHeading = event.alpha;
    if (absoluteHeading === null || absoluteHeading === undefined) return;

    let baseHeading = normalizeAngle(360 - absoluteHeading);
    state.heading = normalizeAngle(baseHeading - 90);
    updateArrow();
}

// 24-hour forecast display logic

function addforecastrow(hourlyData) {
    const container = document.getElementById("forecast-container");
    if (!container || !hourlyData || !hourlyData.time) return;

    container.innerHTML = "";

    const localDate = new Date();
    const pad = (num) => String(num).padStart(2, '0');
    const currentHourISO = `${localDate.getFullYear()}-${pad(localDate.getMonth() + 1)}-${pad(localDate.getDate())}T${pad(localDate.getHours())}:00`;

    let targetIndex = hourlyData.time.findIndex(t => t.startsWith(currentHourISO));
    if (targetIndex === -1) targetIndex = 0;

    // change the 24 to have less or more forecast tiles

    for (let i = 1; i <= 24; i++) { 
        const index = targetIndex + i;
        if (index >= hourlyData.time.length) break;

        const formattedTime = hourlyData.time[index].split("T")[1];
        let speed = hourlyData.wind_speed_10m[index];

        const directionDegrees = hourlyData.wind_direction_10m[index];
        const cardinalDirection = degreesToCardinal(directionDegrees);

        const card = document.createElement("div");
        card.className = "forecast-mini-card";
        card.innerHTML = `
            <div class="forecast-time">${formattedTime}</div>
            <div class="forecast-speed">${Math.round(speed * 10) / 10}</div>
            <div class="forecast-dir">${cardinalDirection}</div>
        `;
        container.appendChild(card);
    }
}

// init and event listeners

document.addEventListener("DOMContentLoaded", () => {
    initNativeLocation();
    initAbsoluteCompass();

    // version Box Link (old)
    const versionBox = document.getElementById("app-version-box");
    if (versionBox) {
        versionBox.addEventListener("click", () => {
            window.open("https://arnavg-blg.vercel.app/kitely", "_blank");
        });
    }

    // settings drawers
    const logoBtn = document.getElementById("top-left-logo");
    const settingsDrawer = document.getElementById("settings-drawer");
    const closeSettings = document.getElementById("close-settings");

    if (logoBtn && settingsDrawer && closeSettings) {
        logoBtn.addEventListener("click", () => {
            playClickSound();
            triggerHaptic(10);
            settingsDrawer.classList.add("open");
        });

        closeSettings.addEventListener("click", () => {
            playClickSound();
            triggerHaptic(10);
            settingsDrawer.classList.remove("open");
        });

        document.addEventListener("click", (event) => {
            if (!settingsDrawer.contains(event.target) && event.target !== logoBtn) {
                settingsDrawer.classList.remove("open");
            }
        });
    }


    const refreshBtn = document.getElementById("refresh-btn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
            playClickSound();
            triggerHaptic(15);
            if (statusText) statusText.textContent = "Refreshing wind...";
            getWeather();
        });
    }


    if (toggleCompass) {
        toggleCompass.addEventListener('click', function() {

            if (toggleCompass.classList.contains('off')) {
                toggleCompass.classList.remove('off');
                toggleCompass.classList.add('on');
                compassmode = 1;
                if (statusText) {
                    statusText.textContent = "North Compass Mode";
                    statusText.style.color = "red";
                }
                if (arrowPath) arrowPath.style.stroke = "red";
                if (arrow) arrow.style.color = "red";
            } else {
                toggleCompass.classList.remove('on');
                toggleCompass.classList.add('off');
                compassmode = 0;
                if (statusText) {
                    statusText.style.color = "#8b8b92";
                    statusText.textContent = "Wind Tracking Mode";
                }
                if (arrowPath) arrowPath.style.stroke = "currentColor";
                updateUI();
            }
            updateArrow();

            // run sound & haptics at the end
            triggerHaptic(40); 
            playClickSound();
        });
    }

    // toggles LocalStorage
    const gradientToggle = document.getElementById("gradient-toggle");
    if (gradientToggle) {
        gradientToggle.checked = enableGradients;
        gradientToggle.addEventListener("change", (e) => {
            playClickSound();
            triggerHaptic(12);
            enableGradients = e.target.checked;
            localStorage.setItem("kitely-enableGradients", enableGradients);
            updateUI();
        });
    }

    const gustsToggle = document.getElementById("gusts-toggle");
    if (gustsToggle) {
        gustsToggle.checked = showGusts;
        gustsToggle.addEventListener("change", (e) => {
            playClickSound();
            triggerHaptic(12);
            showGusts = e.target.checked;
            localStorage.setItem("kitely-showGusts", showGusts);
            updateUI();
        });
    }

    const updateTimeToggle = document.getElementById("update-time-toggle");
    if (updateTimeToggle) {
        updateTimeToggle.checked = showUpdateTimes;
        updateTimeToggle.addEventListener("change", (e) => {
            playClickSound();
            triggerHaptic(12);
            showUpdateTimes = e.target.checked;
            localStorage.setItem("kitely-showUpdateTimes", showUpdateTimes);
            updateCountdown();
            updateUI();
        });
    }

    // unit Setup
    const unitSelect = document.getElementById('unit-select');
    if (unitSelect) {
        unitSelect.value = currentUnit; 
        unitSelect.addEventListener('change', (event) => {
            currentUnit = event.target.value;
            localStorage.setItem("kitely-currentUnit", currentUnit);
            getWeather(); 
        });
    }

    // color Info Panel
    const infoBtn = document.getElementById("info-btn");
    const infoPanel = document.getElementById("gradient-info-panel");
    if (infoBtn && infoPanel) {
        infoBtn.addEventListener("click", () => {
            const isHidden = infoPanel.style.display === "none";
            infoPanel.style.display = isHidden ? "flex" : "none";
        });
    }

    // location & custom coords
    const sourceRadios = document.querySelectorAll('input[name="loc-source"]');
    const customInputsDiv = document.getElementById("custom-coords-inputs");
    const applyBtn = document.getElementById("apply-coords-btn");
    const savePresetBtn = document.getElementById("save-preset-btn");
    const presetsList = document.getElementById("presets-list");
    const inputLat = document.getElementById("input-lat");
    const inputLon = document.getElementById("input-lon");

    let savedPresets = JSON.parse(localStorage.getItem("kitely-presets")) || [];
    renderPresets();

    sourceRadios.forEach(radio => {
        radio.addEventListener("change", (e) => {
            locationSource = e.target.value;
            if (locationSource === "custom") {
                if (customInputsDiv) customInputsDiv.style.display = "block";
            } else {
                if (customInputsDiv) customInputsDiv.style.display = "none";
                initNativeLocation();
            }
        });
    });

    if (applyBtn) {
        applyBtn.addEventListener("click", () => {
            const lat = parseFloat(inputLat.value);
            const lon = parseFloat(inputLon.value);

            if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lon) || lon < -180 || lon > 180) {
                if (statusText) statusText.textContent = "Invalid coordinates format";
                return;
            }

            state.latitude = lat;
            state.longitude = lon;
            
            if (locationText) locationText.textContent = `${state.latitude.toFixed(2)}, ${state.longitude.toFixed(2)}`;
            if (statusText) statusText.textContent = "Custom location set";
            getWeather();
        });
    }

    if (savePresetBtn) {
        savePresetBtn.addEventListener("click", () => {
            const lat = parseFloat(inputLat.value);
            const lon = parseFloat(inputLon.value);

            if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lon) || lon < -180 || lon > 180) {
                if (statusText) statusText.textContent = "Enter valid coordinates first";
                return;
            }

            const name = prompt("Enter a name for this preset location:");
            if (!name || name.trim() === "") return;

            const newPreset = {
                id: Date.now(),
                name: name.trim(),
                lat: lat,
                lon: lon
            };

            savedPresets.push(newPreset);
            localStorage.setItem("kitely-presets", JSON.stringify(savedPresets));
            renderPresets();
        });
    }

    function renderPresets() {
        if (!presetsList) return;
        presetsList.innerHTML = "";

        if (savedPresets.length === 0) {
            presetsList.innerHTML = `<div class="preset-coords" style="padding: 4px;">No presets saved yet</div>`;
            return;
        }

        savedPresets.forEach(preset => {
            const div = document.createElement("div");
            div.className = "preset-item";
            div.innerHTML = `
                <div class="preset-info">
                    <div class="preset-name">${preset.name}</div>
                    <div class="preset-coords">${preset.lat.toFixed(2)}, ${preset.lon.toFixed(2)}</div>
                </div>
                <button class="preset-delete-btn" aria-label="Delete Preset">&times;</button>
            `;

            div.querySelector(".preset-info").addEventListener("click", () => {
                inputLat.value = preset.lat;
                inputLon.value = preset.lon;
                
                state.latitude = preset.lat;
                state.longitude = preset.lon;
                if (locationText) locationText.textContent = `${state.latitude.toFixed(2)}, ${state.longitude.toFixed(2)}`;
                if (statusText) statusText.textContent = `Loaded preset: ${preset.name}`;
                getWeather();
            });

            div.querySelector(".preset-delete-btn").addEventListener("click", (e) => {
                e.stopPropagation(); 
                savedPresets = savedPresets.filter(p => p.id !== preset.id);
                localStorage.setItem("kitely-presets", JSON.stringify(savedPresets));
                renderPresets();
            });

            presetsList.appendChild(div);
        });
    }
});

// Weather polling loop (kind of redundant, nice to have)
setInterval(getWeather, 5000);
