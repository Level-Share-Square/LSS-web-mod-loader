window.devMode = true;
const reloadModsButton = document.getElementById("reloadMods");

const displayMods = () => {
  chrome.storage.local.get(null, (result) => {
    const mods =
      Object.entries(result).map(([name, mod]) => ({ name, ...mod })) || [];
    const modList = document.getElementById("modList");
    const hasMods = mods.length > 0;

    while (modList.firstChild) {
      modList.removeChild(modList.firstChild);
    }
    document.getElementById("empty").style.display = hasMods ? "none" : "block";

    mods.forEach((mod) => {
      const listItem = document.createElement("li");
      listItem.textContent = `${mod.name} ${mod.version} (for ${mod.gameVersion})`;

      // Add a remove button
      const removeButton = document.createElement("button");
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", () => {
        // make a call to the background to remove the mod
        chrome.runtime.sendMessage(
          { type: CONSTANTS.REMOVE_MOD, name: mod.name },
          (response) => {
            if (response.type === CONSTANTS.MOD_REMOVED) {
              listItem.remove();
            }
          }
        );
      });

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
    let tabs = activeTabs.filter(
      (_, index) => windows[index].type === "normal"
    );
    // send a message to be picked up by content.js
    await chrome.tabs.sendMessage(
      tabs[0].id,
      { type: CONSTANTS.CHECK_GAME_IFRAME },
      (response) => {
        console.log(response);
        // reload the page entirely if there are no iframes
        if (response === false) {
          chrome.storage.session.set({ surpressPopup: true });
          chrome.tabs.reload(tabs[0].id);
          window.close();
          return;
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
