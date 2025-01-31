document.title = chrome.i18n.getMessage("extension_name");
const targets = [
  "header_main",
  "header_manager",
  "open_manager",
  "close_popup",
  "reload_mods",
  "no_mods",
  "load_modpack",
];

// load the text content from the locale to match the target
window.addEventListener("DOMContentLoaded", () => {
  targets.forEach((target) => {
    const elements = document.getElementsByClassName(target);
    for (element of elements) {
      element.innerHTML = chrome.i18n.getMessage(target);
    }
  });
});
