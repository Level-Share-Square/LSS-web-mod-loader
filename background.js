const CONSTANTS = {
  REMOVE_MOD: "REMOVE_MOD",
  MOD_REMOVED: "MOD_REMOVED",
  MODS_RELOADED: "MODS_RELOADED",
  GAME_DETECTED: "GAME_DETECTED",
  GET_CONSTANTS: "GET_CONSTANTS",
  CHECK_GAME_IFRAME: "CHECK_GAME_IFRAME",
  RELOAD_GAME: "RELOAD_GAME",
  RELOAD_MODS: "RELOAD_MODS",
  PROCESS_IMAGES: "PROCESS_IMAGES",
};

let replaceRoot = "https://levelsharesquare.com/html5/supermarioconstruct/";
const imageRoot = "images/";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // getting constants
  if (message.type === CONSTANTS.GET_CONSTANTS) {
    sendResponse({ CONSTANTS });
  }

  if (message.type === CONSTANTS.GAME_DETECTED) {
    chrome.storage.session.get("surpressPopup", (data) => {
      // stop if this is invoked by a reload
      if (data.surpressPopup) {
        chrome.storage.session.set({ surpressPopup: false });
        return;
      }
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
    });
  }

  if (message.type === CONSTANTS.REMOVE_MOD) {
    removeMod(message.name, sendResponse);
    sendResponse({ type: CONSTANTS.MOD_REMOVED });
  }

  if (message.type === CONSTANTS.RELOAD_MODS) {
    reloadModRules();
    sendResponse({ type: CONSTANTS.MODS_RELOADED });
  }
});

const reloadModRules = async () => {
  const imageMap = {};

  // load the mods
  const result = await new Promise((resolve) => {
    chrome.storage.local.get(null, resolve);
  });
  const allMods =
    Object.entries(result).map(([name, mod]) => ({ name, ...mod })) || [];
  const mods = allMods.filter((mod) => mod.enabled);

  // loop through the mods and their entries to get all /images/ files
  for (const mod of mods) {
    Object.entries(mod.images).forEach(([imageName, base64Data]) => {
      // create a new entry in the map if it doesn't exist
      if (!imageMap[imageName]) {
        imageMap[imageName] = { name: imageName };
      }
      // add the base64 image to the entry
      const index = Object.keys(imageMap[imageName]).length - 1; // -1 to exclude "name" key
      imageMap[imageName][index] = base64Data;
    });
  }

  // to array
  let images = Object.values(imageMap);
  const fullRootPath = `${replaceRoot}${imageRoot}`;

  // Function to convert Blob to Base64
  const blobToBase64 = (blob) => {
    // promise to properly handle await
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result.startsWith("data:text/html;base64")) return resolve();

        // return the base64 string
        resolve(reader.result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // first get the original images
  await console.log(images);
  for (let i = 0; i < images.length; i++) {
    // define the image and fetch the original copy
    const image = images[i];
    const fullPath = `${fullRootPath}${image.name}`;
    const originalImage = await fetch(fullPath);
    // Get the Blob from the response
    const blobImage = await originalImage.blob();
    // Convert Blob to Base64
    const base64Image = await blobToBase64(blobImage);
    // Store the Base64 string in your images array
    if (base64Image) image.originalImage = base64Image;
    images[i] = image;
  }

  await console.log(images);

  // get the active tab to send a message to in content.js
  const activeTabs = await chrome.tabs.query({
    active: true,
  });
  const windows = await Promise.all(
    activeTabs.map((tab) => chrome.windows.get(tab.windowId))
  );
  const tabs = activeTabs.filter(
    (_, index) => windows[index].type === "normal"
  );
  console.log(tabs);
  // send a message to be picked up by content.js
  const newImages = await chrome.tabs.sendMessage(tabs[0].id, {
    type: CONSTANTS.PROCESS_IMAGES,
    images,
    fullRootPath,
  });

  // clean up all rules before making new ones
  await chrome.declarativeNetRequest.getDynamicRules((rules) => {
    const ruleIds = rules.map((rule) => rule.id);
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: ruleIds,
    });
  });

  if (!newImages || newImages.length === 0) return;
  console.log(images);
  console.log(newImages);
  for (const img of newImages) {
    const fullPath = `${fullRootPath}${img.name}`;
    // load the original image

    console.log(fullPath);
    const response = await fetch(fullPath);
    console.log(response.blob());

    var mappings = {};
    mappings[fullPath] = `${img[0]}`;

    const rules = Object.entries(mappings).map(([url, replacement], index) => ({
      id: index + 1,
      priority: 1,
      action: { type: "redirect", redirect: { url: replacement } },
      condition: { urlFilter: url },
    }));
    // Update the dynamic ruleset
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: rules.map((rule) => rule.id),
      addRules: rules,
    });
  }
};

const removeMod = async (name, sendResponse) => {
  // Fetch the current mappings
  chrome.storage.local.remove(name);
  reloadModRules();
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
