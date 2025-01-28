const DYNAMIC_RULESET_ID = "dynamic_rules";

// get initial size
const initialHeight = window.outerHeight;
const initialWidth = window.outerWidth;

// prevent resizing
window.onresize = () => {
	console.log("!!!")

	if (window.outerWidth !== initialWidth || window.outerHeight !== initialHeight) {
		window.resizeTo(initialWidth, initialHeight); // Reset to the desired size
	}
};

// prevent fullscreen
window.addEventListener('blur', () => {
	window.close();
})

// close button
document.getElementById('closePopupBtn').addEventListener('click', () => {
	window.close();
});

// open manager button
document.getElementById('openManagerButton').addEventListener('click', () => {
	chrome.windows.create({
		url: 'popup/manager/popup.html',
		type: 'popup',
		width: Math.round(screen.availWidth * 0.6),
		height: Math.round(screen.availHeight * 0.6),
		top: Math.round(screen.availHeight * 0.2), // Center vertically
		left: Math.round(screen.availWidth * 0.2),  // Center horizontally
		focused: true
	});
	window.close();
});

// custom message if SMC is detected and the window pops up
document.addEventListener("DOMContentLoaded", () => {
	chrome.storage.local.get("smcDetected", (data) => {
		if (data.smcDetected) {
			const header = document.getElementById("header");
			header.textContent = "Manage your mods!";
			chrome.storage.local.set({ smcDetected: false });
		}
	});
});

async function updateRules(mappings) {
	const rules = Object.entries(mappings).map(([url, replacement], index) => ({
		id: index + 1,
		priority: 1,
		action: { type: "redirect", redirect: { url: replacement } },
		condition: { urlFilter: url }
	}));

	// Update the dynamic ruleset
	await chrome.declarativeNetRequest.updateDynamicRules({
		removeRuleIds: rules.map((rule) => rule.id),
		addRules: rules
	});
}

async function removeRule(urlToRemove) {
	// Fetch the current mappings
	chrome.storage.local.get("urlMappings", async (result) => {
		const mappings = result.urlMappings || {};

		// Find the rule ID to remove
		const ruleIndex = Object.keys(mappings).indexOf(urlToRemove);
		if (ruleIndex === -1) return; // Rules are empty

		const ruleIdToRemove = ruleIndex + 1;

		// Remove the rule from declarativeNetRequest
		await chrome.declarativeNetRequest.updateDynamicRules({
			removeRuleIds: [ruleIdToRemove]
		});

		// Remove the mapping from storage
		delete mappings[urlToRemove];
		chrome.storage.local.set({ urlMappings: mappings }, displayMappings);
	});
}

function displayMappings() {
	chrome.storage.local.get("urlMappings", (result) => {
		const mappings = result.urlMappings || {};
		const mappingList = document.getElementById("mappingList");
		mappingList.innerHTML = "";

		Object.entries(mappings).forEach(([url, replacement]) => {
			const listItem = document.createElement("li");
			listItem.textContent = `${url} → [Custom Image]`;

			// Add a remove button
			const removeButton = document.createElement("button");
			removeButton.textContent = "Remove";
			removeButton.addEventListener("click", () => removeRule(url));

			listItem.appendChild(removeButton);
			mappingList.appendChild(listItem);
		});
	});
}

document.addEventListener("DOMContentLoaded", displayMappings);