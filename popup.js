// popup.js
const lightToggle = document.getElementById('lightToggle');

function applyTheme(isLightOut) {
    if (isLightOut) {
        document.body.classList.remove('theme-light');
        document.body.classList.add('theme-dark');
    } else {
        document.body.classList.remove('theme-dark');
        document.body.classList.add('theme-light');
    }
}

// 1. Initialize
chrome.storage.local.get(['isGlobalLightOut'], (result) => {
    const isLightOut = result.isGlobalLightOut || false;
    lightToggle.checked = isLightOut;
    applyTheme(isLightOut);
});

// 2. Master Toggle
lightToggle.addEventListener('change', () => {
    const isLightOut = lightToggle.checked;
    applyTheme(isLightOut);
    chrome.runtime.sendMessage({ type: 'TOGGLE_LIGHTS', state: !isLightOut });
});
