// popup.js
const lightToggle = document.getElementById('lightToggle');
const scheduleStart = document.getElementById('scheduleStart');
const scheduleEnd = document.getElementById('scheduleEnd');

let savedSchedule = { startTime: '12:00', endTime: '12:00' };

function applyTheme(isLightOut) {
    if (isLightOut) {
        document.body.classList.remove('theme-light');
        document.body.classList.add('theme-dark');
    } else {
        document.body.classList.remove('theme-dark');
        document.body.classList.add('theme-light');
    }
}

function updateToggleState(isLightOut) {
    lightToggle.checked = isLightOut;
    applyTheme(isLightOut);
}

// 1. Initialize
chrome.storage.local.get(['isGlobalLightOut', 'schedule'], (result) => {
    const isLightOut = result.isGlobalLightOut || false;
    updateToggleState(isLightOut);

    // Load schedule times (default to 12:00 if not set)
    savedSchedule = result.schedule || { startTime: '12:00', endTime: '12:00' };
    scheduleStart.value = savedSchedule.startTime;
    scheduleEnd.value = savedSchedule.endTime;
});

// Listen for state changes from background (e.g., schedule triggers)
chrome.storage.onChanged.addListener((changes) => {
    if (changes.isGlobalLightOut) {
        updateToggleState(changes.isGlobalLightOut.newValue);
    }
});

// 2. Master Toggle
lightToggle.addEventListener('change', () => {
    const isLightOut = lightToggle.checked;
    applyTheme(isLightOut);
    chrome.runtime.sendMessage({ type: 'TOGGLE_LIGHTS', state: !isLightOut });
});

// 3. Schedule inputs - save on blur (click outside) or popup close
function saveScheduleIfChanged() {
    if (!scheduleStart.value || !scheduleEnd.value) return;

    const newSchedule = {
        startTime: scheduleStart.value,
        endTime: scheduleEnd.value
    };

    // Only save if changed
    if (newSchedule.startTime !== savedSchedule.startTime ||
        newSchedule.endTime !== savedSchedule.endTime) {
        savedSchedule = newSchedule;
        chrome.storage.local.set({ schedule: newSchedule });
        chrome.runtime.sendMessage({ type: 'SCHEDULE_UPDATED', schedule: newSchedule });
    }
}

// Save when clicking outside inputs
document.addEventListener('click', (e) => {
    if (e.target !== scheduleStart && e.target !== scheduleEnd) {
        saveScheduleIfChanged();
    }
});

// Save when popup closes
window.addEventListener('beforeunload', saveScheduleIfChanged);
