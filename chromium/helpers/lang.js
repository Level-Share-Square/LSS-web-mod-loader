const extension = typeof browser !== "undefined" ? browser : chrome;
document.title = extension.i18n.getMessage("extension_name");

const targets = [
  "header_main",
  "header_manager",
  "open_manager",
  "close_popup",
  "reload_mods",
  "no_mods",
  "load_modpack",
  "game_versions_header",
  "upload_modpack_description",
  "loading",
  "find_mods",
];

// load the text content from the locale to match the target
window.addEventListener("DOMContentLoaded", () => {
  // get the hardrefresh hint
  extension.storage.session.get("hardRefreshHint", (data) => {
    const hardRefreshHint = data.hardRefreshHint;
    // loop through the targets
    targets.forEach((target) => {
      // load all locales
      const elements = document.getElementsByClassName(target);
      for (element of elements) {
        // use a reminder if needed
        if (target === "reload_mods" && hardRefreshHint) {
          target = "reload_mods_reminder";
          extension.storage.session.set({ hardRefreshHint: false });
        }
        // display version number next to header_main
        if (target === "header_main") {
          const version = chrome.runtime.getManifest().version;
          const titleName = extension.i18n.getMessage(target);
          element.innerHTML = `${titleName} (${version})`;
          return
        }
        // update contents
        element.innerHTML = extension.i18n.getMessage(target);
      }
    });
  });
});
