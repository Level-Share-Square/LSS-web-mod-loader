const CONSTANTS = {
  MOD_REMOVED: "MOD_REMOVED",
  MOD_ADDED: "MOD_ADDED",
  GAME_DETECTED: "GAME_DETECTED",
  GET_CONSTANTS: "GET_CONSTANTS",
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // getting constants
  if (message.type === CONSTANTS.GET_CONSTANTS) {
    sendResponse({ CONSTANTS });
  }

  if (message.type === CONSTANTS.GAME_DETECTED) {
    // Perform your action here, like enabling the extension or injecting new content
    chrome.storage.local.set({ smcDetected: true });

    // Close all other popups
    chrome.windows.getAll({ populate: true }, (windows) => {
      windows.forEach((window) => {
        if (window.type === "popup") {
          chrome.windows.remove(window.id);
        }
      });
    });

    const screen = message.screen;

    chrome.windows.create({
      url: "popup/main/popup.html", // Path to your popup HTML file
      type: "popup",
      width: 500,
      height: Math.round(screen.height),
      top: 0,
      left: 0,
      focused: true,
    });
  }

  if (message.type === CONSTANTS.REMOVE_MOD) {
    removeMod(message.url, sendResponse);
  }
});

const updateRules = async (mappings) => {
  const rules = Object.entries(mappings).map(([url, replacement], index) => ({
    id: index + 1,
    priority: 1,
    action: { type: "redirect", redirect: { url: replacement } },
    condition: { urlFilter: url },
  }));

  // Update the dynamic ruleset
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: rules.map((rule) => rule.id),
    addRules: rules,
  });
};

const removeMod = async (urlToRemove, sendResponse) => {
  // Fetch the current mappings
  chrome.storage.local.get("urlMappings", async (result) => {
    const mappings = result.urlMappings || {};

    // Find the rule ID to remove
    const ruleIndex = Object.keys(mappings).indexOf(urlToRemove);
    if (ruleIndex === -1) return; // Rules are empty

    const ruleIdToRemove = ruleIndex + 1;

    // Remove the rule from declarativeNetRequest
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [ruleIdToRemove],
    });

    // Remove the mapping from storage
    delete mappings[urlToRemove];
    chrome.storage.local.set({ urlMappings: mappings }, () => {
      sendResponse({ type: CONSTANTS.MOD_REMOVED });
    });
  });
};

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
};
