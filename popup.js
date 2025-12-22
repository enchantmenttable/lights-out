const toggle = document.getElementById('lightToggle');
const statusText = document.getElementById('status');
const optionsBtn = document.getElementById('optionsBtn');

// Function to update the label text
function updateStatusText(isOn) {
    statusText.innerText = isOn ? 'LIGHT IS ON' : 'LIGHT IS OUT';
}

// 1. Initialize state from background service worker (FAST)
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (!activeTab || !activeTab.url) return;

    // Ask background for the current domain's state
    chrome.runtime.sendMessage({ type: 'GET_TAB_STATE', url: activeTab.url }, (response) => {
        if (chrome.runtime.lastError) {
            console.log('Background not ready:', chrome.runtime.lastError.message);
            return;
        }

        if (response) {
            // Set toggle immediately
            toggle.checked = !response.isLightOut;
            updateStatusText(!response.isLightOut);
        }
    });
});

// 2. Handle toggle changes
toggle.addEventListener('change', () => {
    const isOn = toggle.checked;
    updateStatusText(isOn);
    chrome.runtime.sendMessage({ type: 'TOGGLE_LIGHTS', state: isOn });
});

// 3. Open options page
optionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});
