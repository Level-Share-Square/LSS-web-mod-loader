window.devMode = false;
const reloadModsButton = document.getElementById("reloadMods");
let CONSTANTS;
let currentGameVersions = [];

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

const displayMods = () => {
  extension.storage.local.get(null, (result) => {
    const mods =
      Object.entries(result).map(([name, mod]) => ({ name, ...mod })) || [];
    const modList = document.getElementById("mod-list");
    const hasMods = mods.length > 0;

    while (modList.firstChild) {
      modList.removeChild(modList.firstChild);
    }
    document.getElementById("empty").style.display = hasMods ? "none" : "block";

    mods.forEach((mod) => {
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

      // create a toggle button which is always visible
      const toggleModButton = createToggleButton(mod);

      // append elements before defining the remove button
      listItem.appendChild(itemText);
      listItem.appendChild(toggleModButton);

      const isManager =
        document.getElementsByClassName("header_manager").length > 0;

      // add a remove button
      if (isManager) {
        const removeButton = createRemoveButton(mod, listItem);
        listItem.appendChild(removeButton);
      }

      modList.appendChild(listItem);
    });
  });
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
  removeButton.classList.add("material-symbols-outlined");
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
      { type: CONSTANTS.REMOVE_MOD, name: mod.name },
      (response) => {
        if (response.type === CONSTANTS.MOD_REMOVED) {
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

const createToggleButton = (mod) => {
  //add a toggle mod button
  const toggleModButton = document.createElement("button");
  toggleModButton.classList.add("toggle");
  toggleModButton.id = "toggle-button";
  toggleModButton.title = mod.enabled
    ? extension.i18n.getMessage("click_to_disable")
    : extension.i18n.getMessage("click_to_enable");

  // initial state
  if (!mod.enabled) toggleModButton.classList.add("toggled-off");

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
        { type: CONSTANTS.TOGGLE_MOD, name: mod.name, mod: mod },
        (response) => {
          if (response.type === CONSTANTS.MOD_TOGGLED) {
            // update message
            toggleModButton.title == extension.i18n.getMessage("mod_disabled")
              ? extension.i18n.getMessage("mod_enabled")
              : extension.i18n.getMessage("mod_disabled");
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

const reloadMods = () => {
  // get the active tab
  extension.tabs.query({ active: true }, async (activeTabs) => {
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
        // reload the page entirely if there are no iframes
        if (response === false) {
          extension.storage.session.set({
            surpressPopup: true,
            hardRefreshHint: true,
          });
          extension.runtime.sendMessage({ type: CONSTANTS.RELOAD_MODS }, () => {
            if (window.devMode) return;
            extension.scripting.executeScript({
              target: { tabId: tabs[0].id },
              func: () => location.reload(true), // Forces a full reload, bypassing cache
            });
            window.close();
          });
          return;
        }
        // otherwise reload the mod rules
        extension.runtime.sendMessage(
          { type: CONSTANTS.RELOAD_MODS },
          (response) => {
            if (response.type === CONSTANTS.MODS_RELOADED) {
              // update display
              displayMods();
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
  });
};

if (reloadModsButton) reloadModsButton.addEventListener("click", reloadMods);
