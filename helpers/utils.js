const displayMods = () => {
  chrome.storage.local.get(null, (result) => {
    const mods =
      Object.entries(result).map(([name, mod]) => ({ name, ...mod })) || [];
    console.log(mods);
    const modList = document.getElementById("modList");
    const hasMods = mods.length > 0;

    while (modList.firstChild) {
      modList.removeChild(modList.firstChild);
    }
    document.getElementById("empty").style.display = hasMods ? "none" : "block";

    mods.forEach((mod) => {
      console.log(mod);
      const listItem = document.createElement("li");
      listItem.textContent = `${mod.name} ${mod.version} (for ${mod.gameVersion})`;

      // Add a remove button
      const removeButton = document.createElement("button");
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", () => {
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
