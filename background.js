const CONSTANTS = {
  REMOVE_MOD: "REMOVE_MOD",
  MOD_REMOVED: "MOD_REMOVED",
  MODS_RELOADED: "MODS_RELOADED",
  GAME_DETECTED: "GAME_DETECTED",
  GET_CONSTANTS: "GET_CONSTANTS",
  RELOAD_MODS: "RELOAD_MODS",
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // getting constants
  if (message.type === CONSTANTS.GET_CONSTANTS) {
    sendResponse({ CONSTANTS });
  }

  if (message.type === CONSTANTS.GAME_DETECTED) {
    // Perform your action here, like enabling the extension or injecting new content
    chrome.storage.session.set({ smcDetected: true });

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
    removeMod(message.name, sendResponse);
    sendResponse({ type: CONSTANTS.MOD_REMOVED });
  }

  if (message.type === CONSTANTS.RELOAD_MODS) {
    updateRules();
    sendResponse({ type: CONSTANTS.MODS_RELOADED });
  }
});

const updateRules = async (mods) => {
  // TODO logic is needed to load all mods and COMBINE the images into a singular one, first load the initial image.
  // TODO then load the rest of the mods into the same image.
  //   const rules = Object.entries(mappings).map(([url, replacement], index) => ({
  //     id: index + 1,
  //     priority: 1,
  //     action: { type: "redirect", redirect: { url: replacement } },
  //     condition: { urlFilter: url },
  //   }));
  //   // Update the dynamic ruleset
  //   await chrome.declarativeNetRequest.updateDynamicRules({
  //     removeRuleIds: rules.map((rule) => rule.id),
  //     addRules: rules,
  //   });
};

const removeMod = async (name, sendResponse) => {
  // Fetch the current mappings
  chrome.storage.local.remove(name);
  updateRules();
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
