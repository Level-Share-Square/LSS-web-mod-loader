chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GAME_DETECTED' || message.type === 'IFRAME_DETECTED') {
        chrome.action.setPopup({
            popup: 'popup/popup.html'
        });
        chrome.action.setBadgeText({ text: 'Loaded' });
        chrome.action.setBadgeBackgroundColor({ color: 'green' });
    }
});


