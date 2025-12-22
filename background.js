// background.js

let isGlobalLightOut = false;
let scheduleEnabled = false;
let scheduleTime = '22:00'; // Default
let lastTriggerDate = ''; // 'YYYY-MM-DD'

// Load initial states
chrome.storage.local.get(['isGlobalLightOut', 'scheduleEnabled', 'scheduleTime', 'lastTriggerDate'], (result) => {
    isGlobalLightOut = result.isGlobalLightOut || false;
    scheduleEnabled = result.scheduleEnabled || false;
    scheduleTime = result.scheduleTime || '22:00';
    lastTriggerDate = result.lastTriggerDate || '';
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

// Daily Heartbeat (check every minute)
setInterval(() => {
    if (!scheduleEnabled) return;

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5); // 'HH:MM'

    if (currentTime === scheduleTime && lastTriggerDate !== today) {
        isGlobalLightOut = true;
        lastTriggerDate = today;

        chrome.storage.local.set({ isGlobalLightOut: true, lastTriggerDate: today });
        playSound('off');
        broadcast({ type: 'LIGHTS_OUT' });
    }
}, 30000); // Check every 30s for robustness

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

    if (message.type === 'UPDATE_SCHEDULE') {
        scheduleEnabled = message.enabled;
        scheduleTime = message.time;
        chrome.storage.local.set({ scheduleEnabled, scheduleTime });
        return;
    }
});

// Handle new tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && isGlobalLightOut) {
        chrome.tabs.sendMessage(tabId, { type: 'LIGHTS_OUT' }).catch(() => { });
    }
});
