chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'GAME_DETECTED') {
        // Perform your action here, like enabling the extension or injecting new content
        chrome.storage.local.set({ smcDetected: true });

        // Close all other popups
        chrome.windows.getAll({ populate: true }, (windows) => {
            windows.forEach((window) => {
                if (window.type === 'popup') {
                    chrome.windows.remove(window.id);
                }
            });
        });

        const screen = message.screen;

        chrome.windows.create({
            url: 'popup/main/popup.html', // Path to your popup HTML file
            type: 'popup',
            width: 500,
            height: Math.round(screen.availHeight * 0.9),
            top: Math.round(screen.availHeight * 0.1),
            left: 0,
        });
    };
});


// Add a rule for redirection
const addRedirectionRule = async (originalUrl, replacementUrl) => {
    const ruleId = Date.now(); // Use a unique ID for the rule
    await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: [
            {
                id: ruleId,
                priority: 1,
                action: {
                    type: "redirect",
                    redirect: { url: replacementUrl },
                },
                condition: {
                    urlFilter: originalUrl,
                    resourceTypes: ["image"],
                },
            },
        ],
        removeRuleIds: [ruleId], // Remove existing rule with the same ID
    });
}