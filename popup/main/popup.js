const DYNAMIC_RULESET_ID = "dynamic_rules";

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
    height: Math.round(screen.availHeight * 0.8),
    top: Math.round(screen.availHeight * 0.1), // Center vertically
    left: Math.round(screen.availWidth * 0.2), // Center horizontally
    focused: true,
  });
  window.close();
});

// custom message if game is detected and the window pops up
document.addEventListener("DOMContentLoaded", async () => {
  chrome.storage.session.get("gameDetected", (data) => {
    // modify the popup
    if (data.gameDetected) {
      const header = document.getElementById("header");
      header.innerHTML = "Manage your mods!";
      // prevent fullscreen
      window.addEventListener("blur", () => {
        if (window.devMode) return;
        window.close();
      });
      chrome.storage.session.set({ gameDetected: false });
    }
  });
  // map the mods
  getGameVer().then(() => displayMods());
});
