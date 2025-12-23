// popup.js
const lightToggle = document.getElementById('lightToggle');
const scheduleToggle = document.getElementById('scheduleToggle');
const scheduleTimeInput = document.getElementById('scheduleTime');
const scheduleSection = document.querySelector('.schedule-section');

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

    // Toggle: checked = light is ON
    lightToggle.checked = !isLightOut;

    scheduleToggle.checked = scheduleEnabled;
    scheduleTimeInput.value = scheduleTime;
    updateScheduleUI(scheduleEnabled);
});

// 2. Master Toggle
lightToggle.addEventListener('change', () => {
    const isOn = lightToggle.checked;
    chrome.runtime.sendMessage({ type: 'TOGGLE_LIGHTS', state: isOn });
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
