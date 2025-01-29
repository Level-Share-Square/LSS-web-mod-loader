const displayMods = () => {
  chrome.storage.local.get("urlMappings", (result) => {
    const mappings = result.urlMappings || {};
    const mappingList = document.getElementById("mappingList");
    mappingList.innerHTML = "";

    Object.entries(mappings).forEach(([url, replacement]) => {
      const listItem = document.createElement("li");
      listItem.textContent = `${url} → [Custom Image]`;

      // Add a remove button
      const removeButton = document.createElement("button");
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", () => {
        chrome.runtime.sendMessage(
          { type: CONSTANTS.REMOVE_MOD, url: url },
          (response) => {
            if (response.type === CONSTANTS.MOD_REMOVED) {
              listItem.remove();
            }
          }
        );
      });

      listItem.appendChild(removeButton);
      mappingList.appendChild(listItem);
    });
  });
};
