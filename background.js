const DEFAULT_TIMER = 10; // minutes

// Helper to get domain from URL
function getDomain(url) {
    if (!url) return null;
    try {
        const hostname = new URL(url).hostname;
        return hostname.replace(/^www\./, '');
    } catch (e) {
        return null;
    }
}

// Check if domain is in the tracked list
async function getSiteConfig(domain) {
    const { sites = [] } = await chrome.storage.sync.get('sites');
    return sites.find(s => s.domain === domain);
}

// Get domain state from local storage
async function getDomainState(domain) {
    const { domainStates = {} } = await chrome.storage.local.get('domainStates');
    return domainStates[domain];
}

// Save domain state to local storage
async function saveDomainState(domain, state) {
    const { domainStates = {} } = await chrome.storage.local.get('domainStates');
    domainStates[domain] = state;
    await chrome.storage.local.set({ domainStates });
}

// Offscreen management
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
        }).catch(e => console.log('Offscreen not ready or closed:', e.message));
    } catch (e) {
        console.error('Failed to prepare offscreen:', e);
    }
}

// Tick every second
setInterval(async () => {
    try {
        const window = await chrome.windows.getLastFocused();
        if (!window || !window.focused) return;

        const [activeTab] = await chrome.tabs.query({ active: true, windowId: window.id });
        if (!activeTab || !activeTab.url) return;

        const domain = getDomain(activeTab.url);
        if (!domain) return;

        const config = await getSiteConfig(domain);
        if (!config) return;

        let state = await getDomainState(domain);

        if (!state) {
            state = {
                remainingSeconds: (config.timer || DEFAULT_TIMER) * 60,
                isLightOut: false
            };
        }

        if (!state.isLightOut) {
            state.remainingSeconds--;
            if (state.remainingSeconds <= 0) {
                state.isLightOut = true;
                playSound('off');
                broadcastToDomain(domain, { type: 'LIGHTS_OUT' });
            }
            await saveDomainState(domain, state);
        }
    } catch (e) {
        // Silent catch for unexpected runtime issues
    }
}, 1000);

async function broadcastToDomain(domain, message) {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
        if (getDomain(tab.url) === domain) {
            chrome.tabs.sendMessage(tab.id, message).catch(() => {
                // Ignore errors for tabs without content scripts
            });
        }
    }
}

// Handle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_TAB_STATE') {
        const url = sender?.tab?.url || message.url;
        const domain = getDomain(url);
        if (!domain) {
            sendResponse({ isTracked: false, isLightOut: false });
            return;
        }

        (async () => {
            const config = await getSiteConfig(domain);
            const state = await getDomainState(domain);
            sendResponse({
                isTracked: !!config,
                isLightOut: state ? state.isLightOut : false,
                config
            });
        })();
        return true;
    }

    if (message.type === 'TOGGLE_LIGHTS') {
        (async () => {
            const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
            const activeTab = tabs[0];
            if (!activeTab) return;

            const d = getDomain(activeTab.url);
            if (!d) return;

            let state = await getDomainState(d);
            if (!state) {
                const config = await getSiteConfig(d);
                state = { remainingSeconds: (config?.timer || DEFAULT_TIMER) * 60, isLightOut: false };
            }

            const turningOn = message.state; // true = light on, false = light out
            state.isLightOut = !turningOn;

            if (turningOn) {
                const config = await getSiteConfig(d);
                state.remainingSeconds = (config?.timer || DEFAULT_TIMER) * 60;
                playSound('on');
            } else {
                playSound('off');
            }

            await saveDomainState(d, state);
            broadcastToDomain(d, { type: turningOn ? 'LIGHTS_ON' : 'LIGHTS_OUT' });
        })();
        return true;
    }
});

// Update state when config changes
chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'sync' && changes.sites) {
        const newSites = changes.sites.newValue || [];
        const { domainStates = {} } = await chrome.storage.local.get('domainStates');

        let changed = false;
        Object.keys(domainStates).forEach(domain => {
            if (!newSites.find(s => s.domain === domain)) {
                delete domainStates[domain];
                changed = true;
            }
        });

        if (changed) {
            await chrome.storage.local.set({ domainStates });
        }
    }
});
