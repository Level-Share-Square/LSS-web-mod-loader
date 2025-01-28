chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GAME_DETECTED') {
        console.log(`Target game detected`);

        // Perform your action here, like enabling the extension or injecting new content
        chrome.storage.local.set({ smcDetected: true });
        chrome.windows.create({
            url: 'popup/popup.html', // Path to your popup HTML file
            type: 'popup',
            width: 500,
            height: 400,
            top: 80,
            left: 0,
        });
    }
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