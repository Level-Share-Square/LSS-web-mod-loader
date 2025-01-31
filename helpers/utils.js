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
    const newChild = document.createElement("span");
    newChild.textContent = `${game.acronym} - ${game.version}`;
    gameVerSpan.appendChild(newChild);
  });
  // if no children were created...
  if (gameVerSpan.children.length === 0) {
    gameVerSpan.textContent = "Couldn't retrieve game versions";
  }
};

chrome.runtime.sendMessage({ type: "GET_CONSTANTS" }, (response) => {
  CONSTANTS = response.CONSTANTS;
});

const displayMods = () => {
  chrome.storage.local.get(null, (result) => {
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
      const game = currentGameVersions.find(
        (game) => game.acronym === mod.gameAbbreviation
      );
      // if its outdated/unknown
      if (mod.gameVersion !== game?.version || !mod.gameAbbreviation) {
        if (!mod.gameVersion || !mod.gameAbbreviation) {
          // handle unknown
          itemVersion.innerHTML = `[Unknown game/version]`;
          itemVersion.classList.add("unknown");
          // known but outdated
        } else {
          itemVersion.classList.add("outdated");
          itemVersion.title = chrome.i18n.getMessage("incompatible_mod");
        }
      }

      // text content
      itemText.classList.add("list-item-text");
      itemText.innerHTML = `${mod.name} ${mod.version} `;

      // append the version
      itemText.appendChild(itemVersion);

      // Add a remove button
      const removeButton = document.createElement("button");
      removeButton.classList.add("action-button");
      removeButton.title = chrome.i18n.getMessage("remove_mod");
      removeButton.classList.add("material-symbols-outlined");
      removeButton.textContent = "delete";
      // onclick event handler
      removeButton.addEventListener("click", async () => {
        // confirmation
        const proceed = await confirm(
          chrome.i18n.getMessage("remove_mod_confirm")
        );
        if (!proceed) return;
        // make a call to the background to remove the mod
        chrome.runtime.sendMessage(
          { type: CONSTANTS.REMOVE_MOD, name: mod.name },
          (response) => {
            if (response.type === CONSTANTS.MOD_REMOVED) {
              listItem.remove();
              if (modList.children.length === 0) {
                document.getElementById("empty").style.display = "block";
              }
            }
          }
        );
      });

      listItem.appendChild(itemText);
      listItem.appendChild(removeButton);
      modList.appendChild(listItem);
    });
  });
};

const reloadMods = () => {
  // get the active tab
  chrome.tabs.query({ active: true }, async (activeTabs) => {
    // Wait for all window queries to resolve
    const windows = await Promise.all(
      activeTabs.map((tab) => chrome.windows.get(tab.windowId))
    );
    // Filter only normal windows
    const tabs = activeTabs.filter(
      (_, index) => windows[index].type === "normal"
    );
    // send a message to be picked up by content.js
    await chrome.tabs.sendMessage(
      tabs[0].id,
      { type: CONSTANTS.CHECK_GAME_IFRAME },
      (response) => {
        // reload the page entirely if there are no iframes
        if (response === false) {
          chrome.storage.session.set({ surpressPopup: true });
          return chrome.runtime.sendMessage(
            { type: CONSTANTS.RELOAD_MODS },
            () => {
              if (window.devMode) return;
              chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: () => location.reload(true), // Forces a full reload, bypassing cache
              });
              window.close();
            }
          );
        }
        // otherwise reload the mod rules
        chrome.runtime.sendMessage(
          { type: CONSTANTS.RELOAD_MODS },
          (response) => {
            if (response.type === CONSTANTS.MODS_RELOADED) {
              // update display
              displayMods();
            }
            // reload the game on the current tab
            chrome.tabs.sendMessage(tabs[0].id, {
              type: CONSTANTS.RELOAD_GAME,
            });
          }
        );
      }
    );
  });
};

if (reloadModsButton) reloadModsButton.addEventListener("click", reloadMods);
