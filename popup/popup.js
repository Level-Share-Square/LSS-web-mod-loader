const DYNAMIC_RULESET_ID = "dynamic_rules";

// custom message if SMC is detected and the window pops up
document.addEventListener("DOMContentLoaded", () => {
	chrome.storage.local.get("smcDetected", (data) => {
		if (data.smcDetected) {
			const header = document.getElementById("header");
			header.textContent = "Load your mods!";
			chrome.storage.local.set({ smcDetected: false });
		}
	});
});

// enable button when a file is provided
document.getElementById("fileUploadId").addEventListener("change", function () {
	document.getElementById("submitButton").disabled = false;
});

// close button
document.getElementById('closePopupBtn').addEventListener('click', function () {
	window.close();
});

// parsing ini files
const parseIniFile = (base64Content) => {
	const decodedContent = window.atob(base64Content.split(',')[1]);
	const lines = decodedContent.split('\n');
	const parsedData = {};

	lines.forEach(line => {
		// Ignore empty lines or comments (lines starting with `;` or `#`)
		if (line.trim() && !line.startsWith(';') && !line.startsWith('#')) {
			const [key, value] = line.split('=').map(str => str.trim());

			if (key && value !== undefined) {
				parsedData[key] = value;
			}
		}
	});

	return parsedData;
}

// submit the form to load a new mod
document.getElementById("replacementForm").addEventListener("submit", async (event) => {
	event.preventDefault();

	const fileInput = document.getElementById("fileUploadId");

	if (!fileInput.files.length) {
		alert("Please select an .ini file!");
		return;
	}

	const file = fileInput.files[0];
	const filePath = file.name;
	const reader = new FileReader();

	reader.addEventListener("load", async () => {
		const fileContent = reader.result;
		// Parse the content
		const result = await parseIniFile(fileContent);
		const { GameVersion, Version, Name, ImageRoot } = result;
		const response = await fetch("https://levelsharesquare.com/api/accesspoint/gameversion/SMC");
		const currentGameVer = (await response.json())?.version;

		let proceed = true;

		if (GameVersion !== currentGameVer) {
			proceed = await new Promise(resolve => {
				const userResponse = confirm(`You are already on the latest version! (v${result.gameversion})`);
				resolve(userResponse);
			});
		}

		if (!proceed)
			return;

		const imageFilePath = filePath.replace(".ini", ImageRoot);

	});

	reader.readAsDataURL(file);
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