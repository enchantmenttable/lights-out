(function () {
    let isLightOut = false;
    let overlay = null;
    let shadowRoot = null;

    function createOverlay() {
        if (overlay) return;

        const host = document.createElement('div');
        host.id = 'lightout-host';
        host.style.position = 'fixed';
        host.style.top = '0';
        host.style.left = '0';
        host.style.width = '100vw';
        host.style.height = '100vh';
        host.style.zIndex = '2147483647';
        host.style.pointerEvents = 'none';
        document.documentElement.appendChild(host);

        shadowRoot = host.attachShadow({ mode: 'closed' });
        overlay = document.createElement('div');
        overlay.id = 'lightout-overlay';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'black';
        overlay.style.background = 'radial-gradient(circle at 50% 50%, transparent 100px, rgba(0,0,0,0.95) 250px)';
        overlay.style.display = 'none';
        overlay.style.transition = 'opacity 0.5s ease';
        overlay.style.opacity = '0';

        shadowRoot.appendChild(overlay);

        document.addEventListener('mousemove', (e) => {
            if (!isLightOut) return;
            const x = e.clientX;
            const y = e.clientY;
            overlay.style.background = `radial-gradient(circle at ${x}px ${y}px, transparent 100px, rgba(0,0,0,0.95) 250px)`;
        });
    }

    function turnLightsOut() {
        if (isLightOut) return;
        isLightOut = true;
        createOverlay();
        overlay.style.display = 'block';
        setTimeout(() => {
            overlay.style.opacity = '1';
        }, 10);
    }

    function turnLightsOn() {
        if (!isLightOut) return;
        isLightOut = false;
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 500);
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'LIGHTS_OUT') {
            turnLightsOut();
        } else if (message.type === 'LIGHTS_ON') {
            turnLightsOn();
        } else if (message.type === 'GET_STATE') {
            sendResponse({ isLightOut });
        }
    });

    // Check state on load
    chrome.runtime.sendMessage({ type: 'GET_TAB_STATE' }, (response) => {
        if (response && response.isLightOut) {
            isLightOut = true;
            createOverlay();
            overlay.style.display = 'block';
            overlay.style.opacity = '1';
        }
    });

})();
