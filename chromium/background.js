let devmode = false;
const extension = chrome;

const CONSTANTS = {
  REMOVE_MOD: "REMOVE_MOD",
  MOD_REMOVED: "MOD_REMOVED",
  TOGGLE_MOD: "TOGGLE_MOD",
  MOD_TOGGLED: "MOD_TOGGLED",
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

extension.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // getting constants
  if (message.type === CONSTANTS.GET_CONSTANTS) {
    sendResponse({ CONSTANTS });
  }

  if (message.type === CONSTANTS.GAME_DETECTED) {
    extension.storage.session.get("surpressPopup", (data) => {
      // stop if this is invoked by a reload
      if (data.surpressPopup) {
        extension.storage.session.set({ surpressPopup: false });
        return;
      }
      // Perform your action here, like enabling the extension or injecting new content
      extension.storage.session.set({ gameDetected: true });

      // Close all other popups
      extension.windows.getAll({ populate: true }, (windows) => {
        windows.forEach((window) => {
          if (window.type === "popup") {
            extension.windows.remove(window.id);
          }
        });
      });

      const screen = message.screen;

      extension.windows.create({
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

  if (message.type === CONSTANTS.TOGGLE_MOD) {
    toggleMod(message.name, message.mod, sendResponse);
    sendResponse({ type: CONSTANTS.MOD_TOGGLED });
  }

  if (message.type === CONSTANTS.RELOAD_MODS) {
    reloadModRules().then(() => {
      sendResponse({ type: CONSTANTS.MODS_RELOADED });
    });
    return true;
  }
});

/**
 * Reloads the mod rules by going through all enabled mods, fetching their image
 * data, and then sending a message to content.js to process the images.
 *
 * First, it removes all existing rules, then it loops through all enabled mods
 * and their images, fetching the original image data, converting it to Base64,
 * and storing it in an array. Then it sends a message to content.js to process
 * the images, and once the response is received, it updates the dynamic rules
 * with the new images. If no response is received, it clears all rules.
 *
 * @return {Promise<void>} - A promise that resolves when the dynamic rules have
 * been updated or cleared.
 */
const reloadModRules = () => {
  return new Promise(async (resolve) => {
    const imageMap = {};

    // load the mods
    const result = await new Promise((resolve) => {
      extension.storage.local.get(null, resolve);
    });
    const allMods =
      Object.entries(result).map(([name, mod]) => ({ name, ...mod })) || [];
    const mods = allMods.filter((mod) => mod.enabled);

    // loop through the mods and their entries to get all /ORIGIN/ files
    for (const mod of mods) {
      Object.entries(mod).forEach(([pathName, object]) => {
        if (
          // exclude base keys
          [
            "enabled",
            "gameAbbreviation",
            "gameVersion",
            "version",
            "targetPath",
            "name",
          ].includes(pathName) ||
          !object
        )
          return;

        Object.entries(object).forEach(([imageName, dataArray]) => {
          // create a new entry in the map if it doesn't exist
          if (
            !imageMap[imageName] &&
            imageMap?.[imageName]?.targetPath !== mod.targetPath
          ) {
            imageMap[imageName] = {
              name: imageName,
              folder: pathName,
              targetPath: mod.targetPath,
            };
          }
          // exclude name key
          const index = Object.keys(imageMap[imageName]).length - 1;
          // add image if it is enabled
          if (dataArray[1] === true)
            imageMap[imageName][index] = [
              ...dataArray,
              mod.name, // add the mod name to identify defects
            ];
        });
      });
    }
    // to array
    let images = Object.values(imageMap);

    // Function to convert Blob to Base64
    const blobToBase64 = (blob) => {
      // promise to properly handle await
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          // return the base64 string
          resolve(reader.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    };

    // remove all existing rules first
    const rules =
      (await extension.declarativeNetRequest.getDynamicRules()) || [];
    const ruleIds = rules.map((rule) => rule.id);
    // create a bypass for the images of the previous rules
    const pathArray =
      rules.map((rule) => escapeRegex(rule.condition.urlFilter)) || null;

    // debug
    if (devmode) console.log(rules, generateCacheBypassRule(pathArray));

    // update the rules
    await extension.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: ruleIds,
      // add a cache bypass rule if applicable
      ...(pathArray !== null && pathArray?.length
        ? { addRules: [generateCacheBypassRule(pathArray)] }
        : {}),
    });

    // first get the original images
    for (let i = 0; i < images.length; i++) {
      // define the image and fetch the original copy
      const image = images[i];
      const fullPath = `${image.targetPath}${image.folder}${image.name}`;
      const originalImage = await fetch(fullPath);
      // Get the Blob from the response
      const blobImage = await originalImage.blob();
      // Convert Blob to Base64
      const base64Image = await blobToBase64(blobImage);
      // Store the Base64 string in your images array if no error page was returned
      if (!base64Image.startsWith("data:text/html;base64")) {
        image.originalImage = base64Image;
        images[i] = image;
        // remove entries without original
      } else delete images[i];
    }
    // rid of empty entries
    images = images.filter((image) => image !== undefined);
    // get the active tab to send a message to in content.js
    const activeTabs = await extension.tabs.query({
      active: true,
    });
    const windows = await Promise.all(
      activeTabs.map((tab) => extension.windows.get(tab.windowId))
    );
    const tabs = activeTabs.filter(
      (_, index) => windows[index].type === "normal"
    );
    // send a message to be picked up by content.js
    extension.tabs.sendMessage(
      tabs[0].id,
      {
        type: CONSTANTS.PROCESS_IMAGES,
        images,
      },
      (imageResponse) => {
        const newImages = imageResponse?.newImages || null;
        // end if no response
        if (!newImages || newImages.length === 0) {
          if (devmode) console.log("Cleared all rules!");
          return resolve();
        }

        // clean up all rules before making new ones
        handleDynamicRuleUpdate(newImages, resolve);
      }
    );
  });
};

/**
 * Given an array of new images, defines the dynamic rules and updates the
 * dynamic ruleset. This function is a callback for the promise returned by
 * `updateImages()`.
 *
 * @param {Object[]} newImages - An array of objects containing the new image
 * data and paths.
 * @param {function} resolve - The callback function to call when the dynamic
 * ruleset has been updated.
 * @return {boolean} True if the dynamic ruleset was updated successfully.
 */
const handleDynamicRuleUpdate = (newImages, resolve) => {
  // define the rules
  const newRules = newImages.map(({ data, path }, index) => ({
    id: index + 1,
    priority: 1,
    action: {
      type: "redirect",
      redirect: { url: data },
    },
    condition: {
      resourceTypes: ["xmlhttprequest"],
      urlFilter: path,
    },
  }));
  // map all paths into a regex
  const pathArray = newImages.map(({ path }) => escapeRegex(path));
  // define a cache bypass rule
  const cacheBypassRule = generateCacheBypassRule(pathArray);
  // push it into the new rules
  newRules.push(cacheBypassRule);

  // log if in devmode
  if (devmode) console.log(newRules);

  // Update the dynamic ruleset
  extension.declarativeNetRequest.updateDynamicRules(
    {
      removeRuleIds: [9999],
      addRules: newRules,
    },
    () => resolve()
  );
  return true;
};

// function to escape regex
const escapeRegex = (str) => str?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") || str;

/**
 * Generates a declarativeNetRequest rule to bypass cache for images
 * in the LSS Web Mod Loader.
 *
 * @return {Object} The generated rule.
 */
const generateCacheBypassRule = (pathArray) => {
  if (!pathArray || pathArray.length === 0) return null;
  const regexPattern = `.*(${pathArray.join("|")}).*`;
  return {
    id: 9999,
    priority: 1,
    action: {
      type: "modifyHeaders",
      responseHeaders: [
        {
          header: "Cache-Control",
          operation: "set",
          value: "no-store, no-cache, must-revalidate",
        },
        { header: "Pragma", operation: "set", value: "no-cache" },
        { header: "Expires", operation: "set", value: "0" },
      ],
    },
    condition: {
      resourceTypes: ["xmlhttprequest", "image"],
      regexFilter: regexPattern, // Use regex to match multiple paths
    },
  };
};

const removeMod = async (name, sendResponse) => {
  // Fetch the current mappings
  extension.storage.local.remove(name);
  reloadModRules();
};

const toggleMod = async (name, Mod, sendResponse) => {
  extension.storage.local.get(null, (result) => {
    const mods =
      Object.entries(result).map(([name, mod]) => ({ name, ...mod })) || [];

    // Find and toggle only the mod that matches modName
    mods.forEach((mod) => {
      if (mod.name === Mod.name) {
        mod.enabled = !mod.enabled; // Toggle true/false
      }
    });

    // Convert mods back into the format required for storage
    const updatedMods = mods.reduce((acc, mod) => {
      acc[mod.name] = { ...mod };
      delete acc[mod.name].name; // Remove redundant name property
      return acc;
    }, {});

    // Save back to extension.storage.local
    extension.storage.local.set(updatedMods, () => {
      if (devmode) console.log(`Toggled mod: ${Mod.name}`, updatedMods);
    });
  });
  reloadModRules();
};
