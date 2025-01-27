chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.type === 'GAME_DETECTED') {
		console.log('Target game detected in iframe:', message.iframeSrc);

		// Perform your action here, like enabling the extension or injecting new content
		chrome.action.setPopup({
			popup: 'popup/popup.html'
		});
		chrome.action.setBadgeText({ text: 'Loaded!' });
		chrome.action.setBadgeBackgroundColor({ color: 'green' });
	}
});
// Add a rule for redirection
async function addRedirectionRule(originalUrl, replacementUrl) {
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