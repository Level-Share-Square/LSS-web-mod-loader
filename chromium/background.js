let devmode = true;
const extension = typeof browser !== "undefined" ? browser : chrome;

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
  // removing a mod
  if (message.type === CONSTANTS.REMOVE_MOD) {
    removeMod(message.mod).then(() =>
      sendResponse({ type: CONSTANTS.MOD_REMOVED })
    );
    return true; // async response
  }
  // toggling a mod
  if (message.type === CONSTANTS.TOGGLE_MOD) {
    toggleMod(message.mod).then(() =>
      sendResponse({ type: CONSTANTS.MOD_TOGGLED })
    );
    return true; // async response
  }
  // refreshing mod rules
  if (message.type === CONSTANTS.RELOAD_MODS) {
    reloadModRules().then(async () => {
      const activeTabs = await extension.tabs.query({ active: true });
      // Wait for all window queries to resolve
      const windows = await Promise.all(
        activeTabs.map((tab) => extension.windows.get(tab.windowId))
      );
      // Filter only normal windows
      const tabs = activeTabs.filter(
        (_, index) => windows[index].type === "normal"
      );
      // get the mods to pass in
      const mods = await extension.storage.local.get(null);
      // script the current tab
      await extension.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: reloadServiceWorkers,
        args: [mods],
      });
      // then send the response
      sendResponse({ type: CONSTANTS.MODS_RELOADED });
    });
    return true; // async response
  }
});

const reloadServiceWorkers = (mods) => {
  return new Promise(async (resolve) => {
    // loop through mods
    for (const key in mods) {
      const mod = mods[key];
      // loop through the registrations
      // extract folders from mod of storage
      const folderArray = Object.keys(mod).filter(
        (key) =>
          ![
            "enabled",
            "gameAbbreviation",
            "gameVersion",
            "targetPath",
            "version",
          ].includes(key)
      );
      // define deleted request
      const deletedCache = [];
      // loop through folders
      for (const i of folderArray) {
        const folderPath = mod.targetPath + i;
        // loop through files in the folder
        for (file in mod[i]) {
          // full path to the file
          const fullFilePath = folderPath + file;
          // loop through caches
          await caches.keys().then((cacheNames) => {
            cacheNames.forEach((cacheName) => {
              caches.open(cacheName).then((cache) => {
                cache.keys().then((requests) => {
                  requests.forEach((request) => {
                    // if its cached
                    if (
                      request.url === fullFilePath &&
                      deletedCache.indexOf(fullFilePath) === -1
                    ) {
                      // delete it
                      deletedCache.push(fullFilePath);
                      cache.delete(request);
                    }
                  });
                });
              });
            });
          });
        }
      }
    }
    // resolve
    resolve();
  });
};

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
    const fileMap = {};

    // load the mods
    const result = await new Promise((resolve) => {
      extension.storage.local.get(null, resolve);
    });
    const allMods =
      Object.entries(result).map(([name, mod]) => ({ name, ...mod })) || [];
    // only use enabled mods
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

        Object.entries(object).forEach(([fileName, dataArray]) => {
          // create a new entry in the map if it doesn't exist
          if (
            !fileMap[fileName] &&
            fileMap?.[fileName]?.targetPath !== mod.targetPath
          ) {
            fileMap[fileName] = {
              name: fileName,
              folder: pathName,
              targetPath: mod.targetPath,
            };
          }
          // exclude name key
          const index = Object.keys(fileMap[fileName]).length - 1;
          // add image if it is enabled
          if (dataArray[1] === true)
            fileMap[fileName][index] = [
              ...dataArray,
              mod.name, // add the mod name to identify defects
            ];
        });
      });
    }
    // to array
    let filesToProcess = Object.values(fileMap);

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
    await resetDeclaredRules();

    // first get the original files
    for (let i = 0; i < filesToProcess.length; i++) {
      // define the image and fetch the original copy
      const file = filesToProcess[i];
      const fullPath = `${file.targetPath}${file.folder}${file.name}`;
      const originalFile = await fetch(fullPath);
      // Get the Blob from the response
      const blobImage = await originalFile.blob();
      // Convert Blob to Base64
      const base64Image = await blobToBase64(blobImage);
      // Store the Base64 string in your file array if no error page was returned
      if (!base64Image.startsWith("data:text/html;base64")) {
        const numberKey = Object.keys(file).find(
          (key) => !isNaN(parseInt(key))
        );
        file.type = file[numberKey][2]; // file type is within base 64 array
        file.originalFile = base64Image;
        filesToProcess[i] = file;
        // remove entries without original
      } else delete filesToProcess[i];
    }
    // rid of empty entries
    filesToProcess = filesToProcess.filter((file) => file !== undefined);
    const images = filesToProcess.filter((file) => file.type === "img");
    filesToProcess = filesToProcess.filter((file) => file.type !== "img");
    // send a message to be picked up by content.js
    extension.runtime.sendMessage(
      {
        type: CONSTANTS.PROCESS_IMAGES,
        images,
      },
      (imageResponse) => {
        const newImages = imageResponse?.newImages || [];
        let processedJsonFiles = [], processedOtherFiles = [];

        // process the files
        processedJsonFiles = processJsons(filesToProcess);
        processedOtherFiles = processOtherFiles(filesToProcess);

        // end if no response
        if (!newImages.length && !filesToProcess.length) {
          if (devmode) console.log("Cleared all rules!");
          return resolve();
        }

        const allModdedFiles = [...newImages, ...processedJsonFiles, ...processedOtherFiles];
        // clean up all rules before making new ones
        handleDynamicRuleUpdate(allModdedFiles, resolve);
      }
    );
  });
};

/**
 * Resets all declared rules by getting the list of declared rules and
 * removing all of them.
 *
 * @return {Promise<void>} A promise that resolves when the rules have been
 * reset.
 */
const resetDeclaredRules = () => {
  return new Promise(async (resolve) => {
    const rules =
      (await extension.declarativeNetRequest.getDynamicRules()) || [];
    const ruleIds = rules.map((rule) => rule.id);

    // debug
    if (devmode) console.log("Previous rules:", rules);

    // update the rules
    await extension.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: ruleIds,
    });
    resolve();
  });
};

/**
 * Recursively replaces values in an object with values from another object.
 * @param {Object} target The object to replace values in.
 * @param {Object} source The object to take values from.
 * @param {Object} keys The object containing the keys to replace.
 * @returns {Object} The modified target object.
 */
const deepReplace = (target, source, keys) => {
  // If the target or source object is not an object, return the target
  if (!target || typeof target !== "object") return target;
  if (!source || typeof source !== "object") return target;

  // Loop through the target object
  for (const key of Object.keys(target)) {
    if (keys.includes(key) && key in source) {
      target[key] = source[key]; // Replace key
    } else if (typeof target[key] === "object") {
      target[key] = deepReplace(target[key], source, keys); // Recurse
    }
  }
  // Return the modified target
  return target;
};

/**
 * Processes an array of file objects from the mod folder and returns a new array
 * of file objects with the JSON data replaced according to the rules of the
 * replacement JSON files. The function takes an array of file objects as follows:
 * [
 *   { path: "path/to/file.json", type: "json", originalFile: "data:application/json;base64,..." },
 *   { path: "path/to/other/file.json", type: "json", originalFile: "data:application/json;base64,..." },
 * ]
 *
 * The function will return an array of file objects with the same paths and
 * types, but with the JSON data replaced according to the rules of the
 * replacement JSON files.
 * @param {Object[]} files The array of file objects to process.
 * @returns {Object[]} The array of file objects with the JSON data replaced.
 */
const processJsons = (files) => {
  const pathFiles = [];

  // return if empty
  if (!files?.length) return pathFiles;

  for (let i = 0; i < files.length; i++) {
    // only process JSON
    const file = files[i];

    if (file.type !== "json") continue;
    // get the entry with the array buffer
    const fileDataArray = Object.entries(file).filter(
      ([key, _]) => !isNaN(parseInt(key))
    );
    if (fileDataArray.length === 0) continue;
    const encodeInfo = file.originalFile.split(",")[0];
    let originalJSON = JSON.parse(atob(file.originalFile.split(",")[1])); // Original JSON

    // Replace any key in the original object with the keys of the new files
    for (const dataArray of fileDataArray) {
      // extract JSON array from data array, then parse the base64 string in the first slot
      const fileData = JSON.parse(atob(dataArray[1][0].split(",")[1]));

      // Deep replace any key in the original object
      const resultJSON = deepReplace(
        originalJSON,
        fileData,
        Object.keys(fileData)
      );

      originalJSON = resultJSON;
    }
    const newJSON = JSON.stringify(originalJSON);
    const data = btoa(newJSON);

    pathFiles.push({ path: file.name, data: encodeInfo + "," + data });
  }

  return pathFiles;
};

/**
 * Processes an array of file objects from the mod folder and returns a new array
 * of file objects with the original file data unchanged. This function takes an
 * array of file objects as follows:
 * [
 *   { name: "path/to/file.any", folder: "path/to/", originalFile: "data:application/any;base64,..." },
 *   { name: "path/to/other/file.any", folder: "path/to/", originalFile: "data:application/any;base64,..." },
 * ]
 *
 * The function will return an array of file objects with the same paths and
 * types, but with the original file data unchanged.
 * @param {Object[]} files The array of file objects to process.
 * @returns {Object[]} The array of file objects with the original file data unchanged.
 */
const processOtherFiles = (files) => {
  // return if empty
  if (!files?.length) return [];
  // define the
  const pathFiles = files.map((file) => {
    const path = `${file.folder}${file.name}`;
    // get the entry with the array buffer
    const data = Object.entries(file).filter(
      ([key, _]) => !isNaN(parseInt(key))
    )[0][1][0];
    // return the object
    return {
      path,
      data
    }
  });
  return pathFiles;
}

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
const handleDynamicRuleUpdate = (allModdedFiles, resolve) => {
  // define the rules
  const newRules = allModdedFiles.map(({ data, path }, index) => ({
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
  // indicate async success
  return true;
};

/**
 * Removes a mod from storage and reloads the mod rules.
 * @param {Object} mod - The mod object to remove.
 * @return {Promise} A promise that resolves when the mod has been removed and
 * the mod rules have been reloaded.
 */
const removeMod = async (mod) => {
  return new Promise((resolve) => {
    // Fetch the current mappings
    extension.storage.local.remove(mod?.name);
    if (devmode) console.log(`Removed mod: ${mod.name}`, mod);
    reloadModRules().then(() => resolve());
  });
};

/**
 * Toggles the enabled state of a mod and saves the updated state
 * back to storage.
 * 
 * @param {Object} mod - The mod object containing the name of the mod
 * to toggle.
 * @return {Promise} A promise that resolves when the mod's enabled
 * state has been toggled and saved.
 */
const toggleMod = (mod) => {
  return new Promise((resolve) => {
    extension.storage.local.get(mod.name, (result) => {
      // get the state from storage, then toggle enabled
      const newMod = result[mod.name];
      newMod.enabled = !newMod.enabled;
      // Save back to extension.storage.local
      extension.storage.local.set({ [mod.name]: newMod }, () => {
        if (devmode) console.log(`Toggled mod: ${mod.name}`, mod);
        resolve();
      });
    });
  });
};
