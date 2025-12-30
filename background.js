// background.js

let isGlobalLightOut = false;
let schedule = { startTime: '12:00', endTime: '12:00' };
let lastScheduleState = null; // Track previous schedule state to detect transitions

// Load initial states
chrome.storage.local.get(['isGlobalLightOut', 'schedule'], (result) => {
    isGlobalLightOut = result.isGlobalLightOut || false;
    schedule = result.schedule || { startTime: '12:00', endTime: '12:00' };
    // Initialize lastScheduleState to current state so we don't trigger on startup
    lastScheduleState = isWithinSchedule(schedule.startTime, schedule.endTime);
});

// Schedule checking logic
function isWithinSchedule(startTime, endTime) {
    if (startTime === endTime) return null; // Schedule disabled

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes < endMinutes) {
        // Same day range (e.g., 09:00 - 17:00)
        return nowMinutes >= startMinutes && nowMinutes < endMinutes;
    } else {
        // Overnight range (e.g., 22:00 - 06:00)
        return nowMinutes >= startMinutes || nowMinutes < endMinutes;
    }
}

function checkSchedule() {
    const currentScheduleState = isWithinSchedule(schedule.startTime, schedule.endTime);

    if (currentScheduleState === null) {
        lastScheduleState = null;
        return; // Schedule disabled
    }

    // Only trigger on transition (when schedule state changes)
    if (currentScheduleState !== lastScheduleState) {
        lastScheduleState = currentScheduleState;

        // Entering "lights out" period: turn off (if currently on)
        // Exiting "lights out" period: turn on (only if currently off, i.e. following schedule)
        if (currentScheduleState && !isGlobalLightOut) {
            // Start time reached, turn lights off
            isGlobalLightOut = true;
            chrome.storage.local.set({ isGlobalLightOut });
            playSound('off');
            broadcast({ type: 'LIGHTS_OUT' });
        } else if (!currentScheduleState && isGlobalLightOut) {
            // End time reached and lights are off, turn them on
            isGlobalLightOut = false;
            chrome.storage.local.set({ isGlobalLightOut });
            playSound('on');
            broadcast({ type: 'LIGHTS_ON' });
        }
    }
}

// Set up alarm to check schedule every minute
chrome.alarms.create('scheduleCheck', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'scheduleCheck') {
        checkSchedule();
    }
});

// Sound logic
async function playSound(type) {
    try {
        const offscreenUrl = chrome.runtime.getURL('offscreen.html');
        const existingContexts = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT'],
            documentUrls: [offscreenUrl]
        });

        if (existingContexts.length === 0) {
            await chrome.offscreen.createDocument({
                url: 'offscreen.html',
                reasons: ['AUDIO_PLAYBACK'],
                justification: 'Playing light switch sounds'
            });
        }

        const soundFile = type === 'off' ? 'sounds/light-switch-off.mp3' : 'sounds/light-switch-on.mp3';
        chrome.runtime.sendMessage({
            type: 'PLAY_SOUND',
            target: 'offscreen',
            file: chrome.runtime.getURL(soundFile)
        }).catch(() => { });
    } catch (e) {
        console.error('Offscreen error:', e);
    }
}

function broadcast(message) {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, message).catch(() => { });
        });
    });
}



// Message Handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_TAB_STATE') {
        sendResponse({ isLightOut: isGlobalLightOut });
        return;
    }

    if (message.type === 'TOGGLE_LIGHTS') {
        isGlobalLightOut = !message.state; // true = light on, false = light out
        chrome.storage.local.set({ isGlobalLightOut });

        playSound(isGlobalLightOut ? 'off' : 'on');
        broadcast({ type: isGlobalLightOut ? 'LIGHTS_OUT' : 'LIGHTS_ON' });
        return;
    }

    if (message.type === 'SCHEDULE_UPDATED') {
        schedule = message.schedule;
        const currentScheduleState = isWithinSchedule(schedule.startTime, schedule.endTime);

        // If current time is within new schedule and lights are on, turn them off
        if (currentScheduleState === true && !isGlobalLightOut) {
            isGlobalLightOut = true;
            chrome.storage.local.set({ isGlobalLightOut });
            playSound('off');
            broadcast({ type: 'LIGHTS_OUT' });
        }

        // Set lastScheduleState so we don't re-trigger on next alarm check
        lastScheduleState = currentScheduleState;
        return;
    }
});

// Handle new tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && isGlobalLightOut) {
        chrome.tabs.sendMessage(tabId, { type: 'LIGHTS_OUT' }).catch(() => { });
    }
});
