chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GAME_DETECTED') {
        console.log('Target game detected in iframe:', message.iframeSrc);

        // Perform your action here, like enabling the extension or injecting new content
    }
});
