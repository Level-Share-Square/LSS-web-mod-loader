window.devmode = false;
const reloadModsButton = document.getElementById("reloadMods");
const findModsButton = document.getElementById("findMods");
let CONSTANTS;
let currentGameVersions = [];

/**
 * Fetches the current game versions from the LSS API and updates the versions
 * displayed in the popup if the element exists.
 *
 * @return {undefined} - Does not return a value.
 */
const getGameVer = async () => {
  const response = await fetch(
    "https://levelsharesquare.com/api/accesspoint/gameversion/ALL"
  );
  currentGameVersions = (await response.json())?.version;
  const gameVerSpan = document.getElementById("game-ver-display");
  if (!gameVerSpan) return;
  // map all game versions
  currentGameVersions?.forEach((game) => {
    if (game.acronym === "SM127") return;
    const newChild = document.createElement("span");
    newChild.textContent = `${game.acronym} - ${game.version}`;
    gameVerSpan.appendChild(newChild);
  });
  // if no children were created...
  if (gameVerSpan.children.length === 0) {
    gameVerSpan.textContent = extension.i18n.getMessage(
      "game_version_retrieval_error"
    );
  }
};

extension.runtime.sendMessage({ type: "GET_CONSTANTS" }, (response) => {
  CONSTANTS = response.CONSTANTS;
});

/**
 * Retrieves and displays the list of mods from local storage.
 * Clears the current mod list display and populates it with mod information.
 * Updates the display based on the presence of mods and their validity.
 * Creates and appends mod elements, including text and version information.
 * Adds toggle and remove buttons for each mod, depending on the context.
 */

const displayMods = (modInput) => {

  const runDisplay = (mods, storedMods) => {
    // parse the mods
    const parsedStoredMods =
      Object.entries(storedMods).map(([name, mod]) => ({ name, ...mod })) || [];

    // if there is no input
    if (!mods?.length) mods = parsedStoredMods;

    const modList = document.getElementById("mod-list");
    const hasMods = mods.length > 0;

    while (modList.firstChild) {
      modList.removeChild(modList.firstChild);
    }
    document.getElementById("empty").style.display = hasMods ? "none" : "block";
    // loop over mods to turn them into elements
    mods.forEach((mod) => {

      // check if the user already owns the mod
      const isOwned = parsedStoredMods.find(
        (storedMod) => storedMod?.name === mod?.name
      );
      const hasLatestVersion = parsedStoredMods.find(
        (storedMod) => storedMod?.version === mod?.version
      );

      // create a list item
      const listItem = document.createElement("span");
      listItem.classList.add("list-item");

      // create an element for the text
      const itemText = document.createElement("span");
      // nest version into another span for styling
      const itemVersion = document.createElement("span");
      itemVersion.classList.add("list-item-version");
      itemVersion.innerHTML = `[${mod.gameAbbreviation} ${mod.gameVersion}]`;

      // check if its outdated
      const game = currentGameVersions.find(
        (game) => game.acronym === mod.gameAbbreviation
      );
      // if its outdated/unknown
      if (mod.gameVersion !== game?.version || !mod.gameAbbreviation) {
        if (!mod.gameVersion || !mod.gameAbbreviation) {
          // handle unknown
          itemVersion.innerHTML = extension.i18n.getMessage(
            "unknown_game_or_version"
          );
          itemVersion.classList.add("unknown");
          // known but outdated
        } else {
          itemVersion.classList.add("outdated");
          itemVersion.title = extension.i18n.getMessage("incompatible_mod");
        }
      }

      // text content
      itemText.classList.add("list-item-text");
      itemText.innerHTML = `${mod.name} ${mod.version} `;
      // append the version
      itemText.appendChild(itemVersion);
      listItem.appendChild(itemText);

      // update availability
      if (window.modBrowser && isOwned) {
        const updateAvailability = createUpdateAvailability(hasLatestVersion);
        itemText.appendChild(updateAvailability);
      }

      // create a toggle button which is always visible (except on mod browser)
      if (!window.modBrowser) {
        const toggleModButton = createToggleButton(mod);
        listItem.appendChild(toggleModButton);
      }

      // add a download button
      if (window.modBrowser && !hasLatestVersion) {
        const downloadButton = createDownloadButton(mod, listItem, isOwned);
        listItem.appendChild(downloadButton);
      }
      // add a remove button
      if (window.isManager || (window.modBrowser && isOwned)) {
        const removeButton = createRemoveButton(mod, listItem);
        listItem.appendChild(removeButton);
      }

      modList.appendChild(listItem);
    });
    // update page state for mod browser
    if (window.modBrowser === true) {
      // get elements
      const modBrowserContainer = document.getElementById("mod-browser-container");
      const loadingEl = document.getElementById("loading");
      // make them visible
      if (modBrowserContainer.classList.contains("hidden")) modBrowserContainer.classList.remove("hidden");
      if (!loadingEl.classList.contains("hidden")) loadingEl.classList.add("hidden");
    }
  }
  // if invoked by the installed mod list
  extension.storage.local.get(null, (result) => runDisplay(modInput, result));
};

/**
 * Creates a button to remove a mod from the list
 * @param {Object} mod the mod object
 * @param {HTMLElement} listItem the list item to append the button to
 * @returns {HTMLElement} the created button
 */
const createRemoveButton = (mod, listItem) => {
  // Add a remove button
  const removeButton = document.createElement("button");
  removeButton.classList.add("action-button");
  removeButton.title = extension.i18n.getMessage("remove_mod");
  removeButton.style.setProperty('--button-color', "223, 38, 13");
  removeButton.classList.add("material-symbols-outlined");
  removeButton.classList.add("delete-button");
  removeButton.textContent = "delete";
  // onclick event handler
  removeButton.addEventListener("click", async () => {
    // confirmation
    const proceed = await confirm(
      extension.i18n.getMessage("remove_mod_confirm")
    );
    if (!proceed) return;
    // make a call to the background to remove the mod
    extension.runtime.sendMessage(
      { type: CONSTANTS.REMOVE_MOD, mod: mod },
      (response) => {
        if (response.type === CONSTANTS.MOD_REMOVED) {

          // change the buttons for mod browser
          if (window.modBrowser) {
            // remove the delete button
            removeButton.remove();
            // add a download button
            const downloadButton = createDownloadButton(mod, listItem, false);
            listItem.appendChild(downloadButton);
            // remove latest version indicator
            listItem.querySelector(".up-to-date-display").remove();
            return
          }

          // remove the mod entry
          listItem.remove();
          if (document.getElementById("mod-list").children.length === 0) {
            document.getElementById("empty").style.display = "block";
          }
        }
      }
    );
  });
  // append it
  return removeButton;
};

const createDownloadButton = (mod, listItem, listAsUpdate) => {
  // Add a remove button
  const downloadButton = document.createElement("button");
  downloadButton.style.setProperty('--button-color', listAsUpdate ? "0, 163, 251" : "47, 175, 0");
  downloadButton.classList.add("action-button");
  downloadButton.title = extension.i18n.getMessage(listAsUpdate ? "update_mod" : "install_mod");
  downloadButton.classList.add("material-symbols-outlined");
  downloadButton.textContent = listAsUpdate ? "sync" : "download";
  if (listAsUpdate) downloadButton.classList.add("rainbow-action")
  // onclick event handler
  downloadButton.addEventListener("click", async () => {
    // confirmation
    const proceed = await confirm(
      extension.i18n.getMessage(listAsUpdate ? "update_mod_confirm" : "install_mod_confirm")
    );
    if (!proceed) return;

    // make a call to the background to fetch the mod
    const folder = await handleModFetch(mod);
    await handleModLoad(folder);
    // update latest version indicator
    const updateAvailability = listItem.querySelector(".up-to-date-display");
    if (updateAvailability) {
      // update sync button
      updateAvailability.classList.remove("update-availability")
      updateAvailability.classList.add("up-to-date")
      updateAvailability.innerHTML = " " + extension.i18n.getMessage("mod_up_to_date");
    } else {
      // reapply download button
      const newUpdAv = createUpdateAvailability(true);
      listItem.querySelector(".list-item-text").appendChild(newUpdAv);
    }
    // update display
    downloadButton.remove();
    const oldRemoveButton = listItem.querySelector('.delete-button');
    if (oldRemoveButton) return;
    // add a remove button
    const removeButton = createRemoveButton(mod, listItem);
    listItem.appendChild(removeButton);
  });
  // append it
  return downloadButton;
};

/**
 * Creates a span element indicating the update availability of a mod.
 * 
 * @param {boolean} hasLatestVersion - A boolean indicating if the mod is up to date.
 * If true, the element will display an "up-to-date" message; otherwise, it will indicate
 * that an update is available.
 * 
 * @returns {HTMLElement} A span element with appropriate classes and message
 * reflecting the mod's update status.
 */

const createUpdateAvailability = (hasLatestVersion) => {
  const updateAvailability = document.createElement("span");
  updateAvailability.classList.add(hasLatestVersion ? "up-to-date" : "update-availability");
  updateAvailability.classList.add("list-item-text");
  updateAvailability.classList.add("up-to-date-display");
  updateAvailability.innerHTML = " " + extension.i18n.getMessage(hasLatestVersion ? "mod_up_to_date" : "mod_update_available");
  return updateAvailability
}

/**
 * Creates a toggle button to toggle a mod on or off
 * @param {Object} mod the mod object
 * @returns {HTMLElement} the created button
 */
const createToggleButton = (mod) => {
  //add a toggle mod button
  const toggleModButton = document.createElement("button");
  toggleModButton.classList.add("toggle");
  toggleModButton.id = "toggle-button";

  // initial state
  if (!mod.enabled) toggleModButton.classList.add("toggled-off");

  toggleModButton.title = !toggleModButton.classList.contains("toggled-off")
    ? extension.i18n.getMessage("click_to_disable")
    : extension.i18n.getMessage("click_to_enable");

  // add en element inside the button
  const toggleSlider = document.createElement("div");
  toggleSlider.classList.add("toggle-slider");
  toggleModButton.appendChild(toggleSlider);

  // for styling, add hover events
  toggleModButton.addEventListener("mouseenter", () => {
    // go to middle
    toggleSlider.classList.add("middle-state");
  });
  toggleModButton.addEventListener("mouseout", () => {
    // go back
    toggleSlider.classList.remove("middle-state");
  });

  // onclick handler
  toggleModButton.addEventListener("click", async () => {
    // switch classes
    if (toggleSlider.classList.contains("middle-state"))
      toggleSlider.classList.remove("middle-state");
    toggleModButton.classList.toggle("toggled-off");
    //tell background.js to reload the mods
    try {
      extension.runtime.sendMessage(
        { type: CONSTANTS.TOGGLE_MOD, mod: mod },
        (response) => {
          if (response.type === CONSTANTS.MOD_TOGGLED) {
            // update message
            toggleModButton.title = !toggleModButton.classList.contains(
              "toggled-off"
            )
              ? extension.i18n.getMessage("click_to_disable")
              : extension.i18n.getMessage("click_to_enable");
            // update class
            document.getElementById("reloadMods").classList.add("danger");
          }
        }
      );
    } catch (err) {
      // if there is an error, remove the styling
      toggleModButton.classList.toggle("toggled-off");
      if (toggleSlider.classList.contains("middle-state"))
        toggleSlider.classList.remove("middle-state");
    }
  });

  return toggleModButton;
};

/**
 * Reloads the mod rules and, if no game iframes are present, reloads the page
 * entirely. Otherwise, reloads the game on the current tab. The function
 * returns a promise that resolves when the mod rules have been reloaded.
 * @returns {Promise<void>}
 */
const reloadMods = () => {

  // get the active tab
  const run = () =>
    new Promise((resolve) => extension.tabs.query({ active: true }, async (activeTabs) => {
      try {
        // Wait for all window queries to resolve
        const windows = await Promise.all(
          activeTabs.map((tab) => extension.windows.get(tab.windowId))
        );
        // Filter only normal windows
        const tabs = activeTabs.filter(
          (_, index) => windows[index].type === "normal"
        );
        // send a message to be picked up by content.js
        await extension.tabs.sendMessage(
          tabs[0].id,
          { type: CONSTANTS.CHECK_GAME_IFRAME },
          (response) => {
            if (chrome.runtime.lastError) {
              resolve();
              alert(chrome.i18n.getMessage("reload_mods_error"));
              return;
            }
            // reload the page entirely if there are no iframes
            if (response === false) {
              extension.storage.session.set({
                surpressPopup: true,
                hardRefreshHint: true,
              });
              extension.runtime.sendMessage(
                { type: CONSTANTS.RELOAD_MODS },
                () => {
                  resolve();
                  if (window.devmode) return;
                  extension.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: () => location.reload(true), // Forces a full reload, bypassing cache
                  });
                  window.close();
                }
              );
              return;
            }
            // otherwise reload the mod rules
            extension.runtime.sendMessage(
              { type: CONSTANTS.RELOAD_MODS },
              (response) => {
                if (response.type === CONSTANTS.MODS_RELOADED) {
                  // update display
                  displayMods();
                  resolve();
                  const reloadModsElement =
                    document.getElementsByClassName("reload_mods");
                  // update message/tooltip
                  reloadModsElement[0].innerHTML = extension.i18n.getMessage(
                    "reload_mods_reminder"
                  );
                  reloadModsElement[0].title = extension.i18n.getMessage(
                    "reload_mods_tooltip"
                  );
                  // remove red color if applicable
                  if (reloadModsElement[0].classList.contains("danger"))
                    reloadModsElement[0].classList.remove("danger");
                }
                // reload the game on the current tab
                extension.tabs.sendMessage(tabs[0].id, {
                  type: CONSTANTS.RELOAD_GAME,
                });
              }
            );
          }
        );
      } catch (err) {
        alert(chrome.i18n.getMessage("reload_mods_error"));
        resolve();
        console.error(err);
      }
    }));

  const loadingMessage = document.getElementById("loading");
  loadingMessage.classList.remove("hidden");
  run().finally(() => loadingMessage.classList.add("hidden"));
};

/**
 * Opens the mod browser page in a new tab.
 * @function
 * @memberof module:chromium/helpers/utils
 */
const findMods = () => {
  extension.tabs.create({
    url: chrome.runtime.getURL("pages/main/page.html"),
    active: true
  });
};

if (reloadModsButton) reloadModsButton.addEventListener("click", reloadMods);
if (findModsButton) findModsButton.addEventListener("click", findMods);

// listen for messages from background.js
extension.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // process images for mod rule reloading
  if (message.type === CONSTANTS.PROCESS_IMAGES) {
    const images = message.images;
    //loop through the images
    const imageProcessingPromises = images.map(async (image) => {
      // get all base64 images
      const base64Arrays = Object.entries(image)
        .filter(([key, _]) => !isNaN(key)) // Only numeric keys
        .map(([_, value]) => value[0]); // Get base64 string

      try {
        // draw new image
        const modifiedImage = await loadAndModifyImage(
          image.originalFile,
          base64Arrays
        );
        // successfully return an object with the data and path
        return {
          data: modifiedImage,
          path: `${image.name}`,
        };
      } catch (error) {
        console.error("Error processing image:", error);
        return null; // Skip failed images
      }
    });
    // use Promise.all to wait for all image processing to complete
    Promise.all(imageProcessingPromises).then((base64Arrays) => {
      // Filter out failed (null) images
      const validImages = base64Arrays.filter((img) => img !== null);
      sendResponse({ newImages: validImages }); // Send the processed images
    });
    return true;
  }
});

/**
 * Loads an original image and overlays it with a set of modified images.
 *
 * The function creates a canvas element, draws the original image onto it,
 * and then processes each modified image as an overlay. For each overlay,
 * it clears 16x16 pixel blocks on the canvas wherever the overlay has non-transparent
 * pixels, then draws the overlay image onto the main canvas. Once all overlays
 * are processed, it returns the final image as a Base64 string in a lossless format.
 *
 * @param {string} original - The original image in Base64 format.
 * @param {Array<string>} modified - An array of modified images in Base64 format to overlay.
 * @returns {Promise<string>} A promise that resolves to the final image as a Base64 string.
 */

const loadAndModifyImage = (original, modified) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = original;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Set canvas size to match the original image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw the original image onto the canvas
      ctx.drawImage(img, 0, 0);

      // Process all overlays
      const overlayPromises = modified.map((base64Overlay) => {
        return new Promise((resolveOverlay, rejectOverlay) => {
          const overlayImg = new Image();
          overlayImg.src = base64Overlay;

          overlayImg.onload = () => {
            const offCanvas = document.createElement("canvas");
            const offCtx = offCanvas.getContext("2d");

            // Match overlay size
            offCanvas.width = overlayImg.width;
            offCanvas.height = overlayImg.height;

            // Draw overlay to an offscreen canvas
            offCtx.drawImage(overlayImg, 0, 0);

            // Get pixel data
            const imageData = offCtx.getImageData(
              0,
              0,
              overlayImg.width,
              overlayImg.height
            );
            const pixels = imageData.data;

            // Iterate through pixels and clear corresponding 16x16 areas on the main canvas
            for (let y = 0; y < overlayImg.height; y++) {
              for (let x = 0; x < overlayImg.width; x++) {
                const index = (y * overlayImg.width + x) * 4;
                const alpha = pixels[index + 3]; // Alpha channel

                if (alpha > 0) {
                  // If pixel is not fully transparent
                  // Get the top-left corner of the 16x16 block
                  let blockX = Math.floor(x / 16) * 16;
                  let blockY = Math.floor(y / 16) * 16;

                  // Ensure we don't go outside the canvas bounds
                  let clearWidth = Math.min(16, canvas.width - blockX);
                  let clearHeight = Math.min(16, canvas.height - blockY);

                  ctx.clearRect(blockX, blockY, clearWidth, clearHeight);
                }
              }
            }

            // Draw the overlay image onto the main canvas
            ctx.drawImage(
              overlayImg,
              0,
              0,
              overlayImg.width,
              overlayImg.height
            );
            resolveOverlay();
          };

          overlayImg.onerror = rejectOverlay;
        });
      });

      // Wait for all overlays to finish
      Promise.all(overlayPromises)
        .then(() => {
          // Get original file extension from base64 string
          const fileType = original.split(";")[0].split(":")[1];

          // Once overlays are done, get the final image as Base64 in lossless format
          const finalImage = canvas.toDataURL(fileType, 1);
          resolve(finalImage);
        })
        .catch(reject);
    };

    img.onerror = reject;
  });
};


/**
 * Handles loading a mod by taking a folder input from the user, 
 * finding the loader.json file, parsing it, and storing the data in local storage.
 * @returns {Promise<void>}
 */
const handleModLoad = async (input) => {
  return new Promise((resolve, reject) => {
    try {
      let fileInput = input;
      if (input.target)
        fileInput = document.getElementById("uploadModFolder");

      console.log(fileInput, fileInput.files);

      if (!fileInput.files.length) {
        resolve();
        alert(extension.i18n.getMessage("empty_folder_error"));
        return
      }

      const loaderFile = Array.from(fileInput.files).find(
        (file) => file.name === "loader.json"
      );
      if (!loaderFile) {
        resolve();
        alert(extension.i18n.getMessage("missing_json_error"));
        return
      }

      const reader = new FileReader();

      reader.addEventListener("load", async () => {
        let result;
        try {
          // load the json loader file
          result = await JSON.parse(
            window
              .atob(reader.result.split(",")[1])
              .replaceAll(">", "")
              .replaceAll("<", "")
          );
        } catch (error) {
          resolve();
          alert(extension.i18n.getMessage("invalid_json_error", [error.message]));
          return
        }
        // get its contents
        const {
          GameVersion,
          Version,
          Name,
          RootFolder,
          BaseURL,
          GameAbbreviation,
        } = result;

        const requiredFields = { Version, Name, RootFolder, BaseURL };
        const missingFields = Object.keys(requiredFields).filter(
          (key) => !requiredFields[key]
        );

        if (missingFields.length > 0) {
          // format the message with commas and "and"
          const formattedFields =
            missingFields.length > 1
              ? missingFields.slice(0, -1).join(", ") +
              " and " +
              missingFields.at(-1)
              : missingFields[0];

          resolve();
          alert(
            extension.i18n.getMessage("missing_fields_error", formattedFields)
          );
          return
        }

        let proceed = true;
        // check if the version is the same
        const game = currentGameVersions.find(
          (game) => game.acronym === GameAbbreviation
        );
        const gv = game?.version || undefined;
        // check if the game version is the same
        if (GameVersion !== gv || !gv) {
          // confirmation
          proceed = confirm(
            !gv
              ? extension.i18n.getMessage("unknown_game_warning")
              : extension.i18n.getMessage("outdated_mod_warning", [
                game?.version,
                result?.GameVersion,
              ])
          );
        }

        // if not, abort
        if (!proceed) {
          resolve();
          return;
        }

        // Get the folder name
        const folderName = fileInput.files[0].webkitRelativePath.split("/")[0];

        // get all RootFolder keys
        const rootFolderValues = Object.keys(RootFolder);

        let images = [],
          jsons = [],
          other = [];

        for (const key of rootFolderValues) {
          const normalizedImageRoot = `${folderName}/${key}`.replace(/\/$/, "");
          const type = RootFolder?.[key]?.[1] || null;

          //! enforce image type
          if (type === null || !["img", "json", "any"].includes(type)) {
            resolve()
            alert(extension.i18n.getMessage("invalid_folder_tag_error", "img, json & any"));
            return;
          }

          // Get all images in the folder
          if (type === "img")
            images = Array.from(fileInput.files)
              .map((file) => ({ file, key })) // convert to array of objects
              .filter(
                ({ file }) =>
                  // filter out non-images
                  file.webkitRelativePath.startsWith(normalizedImageRoot) &&
                  /\.(png|jpg|jpeg|webp)$/i.test(file.name)
              );

          // get all jsons in the folder
          if (type === "json")
            jsons = Array.from(fileInput.files)
              .map((file) => ({ file, key })) // convert to array of objects
              .filter(
                ({ file }) =>
                  // filter out non-images
                  file.webkitRelativePath.startsWith(normalizedImageRoot) &&
                  /\.json$/i.test(file.name)
              );

          // get any file in the folder
          if (type === "any")
            other = Array.from(fileInput.files)
              .map((file) => ({ file, key })) // convert to array of objects
              .filter(
                ({ file }) =>
                  // filter out non-images
                  file.webkitRelativePath.startsWith(normalizedImageRoot)
              );
        }

        // return if nothing was found
        if (images.length === 0 && jsons.length === 0 && other.length === 0) {
          resolve()
          alert(extension.i18n.getMessage("imageroot_warning"));
          return;
        }

        const rootFolderPaths = // path becomes key for empty object
          Object.keys(RootFolder).map((key) => ({ [RootFolder[key][0]]: {} })) ||
          [];
        if (
          // disallow duplicate keys
          rootFolderPaths.some((path) =>
            [
              "version",
              "gameVersion",
              "gameAbbreviation",
              "targetPath",
              "enabled",
            ].includes(path)
          )
        ) {
          resolve();
          alert(extension.i18n.getMessage("duplicate_key_warning"));
          return;
        }

        // Create new mod object (overwrites existing data)
        const newMod = {
          version: Version,
          gameVersion: GameVersion,
          gameAbbreviation: GameAbbreviation,
          targetPath: BaseURL,
          ...Object.assign({}, ...rootFolderPaths), // define the root folder keys
          enabled: true,
        };
        // merge
        const allFiles = [...images, ...jsons, ...other];
        // Process each file
        for (const key of rootFolderValues) {
          for (const fileObj of allFiles) {
            // may sure key belongs to the file
            if (fileObj.key !== key) continue;
            const normalizedImageRoot = `${folderName}/${key}`.replace(/\/$/, "");
            // set file path
            const file = fileObj.file;
            const fileReader = new FileReader();
            const filePath = file.webkitRelativePath.replace(
              normalizedImageRoot + "/",
              ""
            );

            // Convert image to base64
            const base64 = await new Promise((resolve) => {
              fileReader.onload = () => {
                resolve(fileReader.result.replace(/^.+,/, ""));
              };
              fileReader.readAsDataURL(file);
            });

            const folderTarget = RootFolder[key][0];
            const fileType = RootFolder[key][1];
            const dataType = fileType === "img" ? "image" : "application";
            const mimeType = fileType === "any" ? fileObj.file.type : `${dataType}/${file.type.split("/")[1]}`;
            // Overwrite files completely
            newMod[folderTarget][filePath] = [
              `data:${mimeType};base64,${base64}`,
              true, // Enabled
              fileType, // folder tag
            ];
          }
        }
        // Store new mod data (overwrites existing)
        extension.storage.local.set({ [Name]: newMod }, () => {
          // stop early
          if (window.modBrowser) {
            alert(extension.i18n.getMessage("browser_load_success"));
            return resolve();
          }
          // Reload mods after saving
          extension.runtime.sendMessage(
            { type: CONSTANTS.RELOAD_MODS },
            (response) => {
              // upon receiving a response, update the list
              if (response.type === CONSTANTS.MODS_RELOADED) {
                displayMods();
                document.getElementById("uploadModFolder").value = "";
                document.getElementById("submitButton").disabled = true;
              }

              if (response.type === CONSTANTS.ERROR) {
                alert(response.message);
              }
              resolve()
            }
          );
        });

      });

      reader.readAsDataURL(loaderFile);
    } catch (error) {
      return reject()
    }
  })
}