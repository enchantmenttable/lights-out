// popup.js
const lightToggle = document.getElementById('lightToggle');
const scheduleToggle = document.getElementById('scheduleToggle');
const scheduleTimeInput = document.getElementById('scheduleTime');
const scheduleSection = document.querySelector('.schedule-section');

const statusText = document.getElementById('statusText');

function applyTheme(isLightOut) {
    if (isLightOut) {
        document.body.classList.remove('theme-light');
        document.body.classList.add('theme-dark');
        statusText.textContent = 'Light is off';
    } else {
        document.body.classList.remove('theme-dark');
        document.body.classList.add('theme-light');
        statusText.textContent = 'Light is on';
    }
}

function updateScheduleUI(enabled) {
    scheduleTimeInput.disabled = !enabled;
    if (enabled) {
        scheduleSection.classList.remove('disabled');
    } else {
        scheduleSection.classList.add('disabled');
    }
}

// 1. Initialize
chrome.storage.local.get(['isGlobalLightOut', 'scheduleEnabled', 'scheduleTime'], (result) => {
    const isLightOut = result.isGlobalLightOut || false;
    const scheduleEnabled = result.scheduleEnabled || false;
    const scheduleTime = result.scheduleTime || '22:00';

    // Toggle: checked = light is OUT (Moon state)
    // The asset logic: checked = Night Mode
    lightToggle.checked = isLightOut;
    applyTheme(isLightOut);

    scheduleToggle.checked = scheduleEnabled;
    scheduleTimeInput.value = scheduleTime;
    updateScheduleUI(scheduleEnabled);
});

// 2. Master Toggle
lightToggle.addEventListener('change', () => {
    const isLightOut = lightToggle.checked;
    applyTheme(isLightOut);
    chrome.runtime.sendMessage({ type: 'TOGGLE_LIGHTS', state: !isLightOut });
});

// 3. Schedule Toggle
scheduleToggle.addEventListener('change', () => {
    const enabled = scheduleToggle.checked;
    updateScheduleUI(enabled);
    saveSchedule();
});

// 4. Schedule Time
scheduleTimeInput.addEventListener('change', () => {
    saveSchedule();
});

function saveSchedule() {
    const enabled = scheduleToggle.checked;
    const time = scheduleTimeInput.value;
    chrome.runtime.sendMessage({ type: 'UPDATE_SCHEDULE', enabled, time });
}
