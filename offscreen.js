chrome.runtime.onMessage.addListener((message) => {
    if (message.target === 'offscreen') {
        if (message.type === 'PLAY_SOUND') {
            const audio = new Audio(message.file);
            audio.play().catch(e => console.error('Offscreen playback failed:', e));
        }
    }
});
