const DYNAMIC_RULESET_ID = "dynamic_rules";
let CONSTANTS;

chrome.runtime.sendMessage({ type: "GET_CONSTANTS" }, (response) => {
  CONSTANTS = response.CONSTANTS;
});

// get initial size
const initialHeight = window.outerHeight;
const initialWidth = window.outerWidth;

// prevent resizing
window.onresize = () => {
  if (
    window.outerWidth !== initialWidth ||
    window.outerHeight !== initialHeight
  ) {
    window.resizeTo(initialWidth, initialHeight); // Reset to the desired size
  }
};

// close button
document.getElementById("closePopupBtn").addEventListener("click", () => {
  window.close();
});

// open manager button
document.getElementById("openManagerButton").addEventListener("click", () => {
  chrome.windows.create({
    url: "popup/manager/popup.html",
    type: "popup",
    width: Math.round(screen.availWidth * 0.6),
    height: Math.round(screen.availHeight * 0.6),
    top: Math.round(screen.availHeight * 0.2), // Center vertically
    left: Math.round(screen.availWidth * 0.2), // Center horizontally
    focused: true,
  });
  window.close();
});

// custom message if SMC is detected and the window pops up
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.session.get("smcDetected", (data) => {
    // modify the popup
    if (data.smcDetected) {
      const header = document.getElementById("header");
      header.textContent = "Manage your mods!";
      // prevent fullscreen
      window.addEventListener("blur", () => {
        window.close();
      });
      chrome.storage.session.set({ smcDetected: false });
    }
  });
  // map the mods
  displayMods();
});
