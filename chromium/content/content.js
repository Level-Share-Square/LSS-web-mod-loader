window.devmode = false;
const extension = typeof browser !== "undefined" ? browser : chrome;

let pathname = window.location.pathname;
let isObserverConnected = true;
const screenData = {
  height: screen.height || screen.availHeight || 600,
  availWidth: screen.availWidth || 400,
};

// Send a message to the background script to request constants
extension.runtime.sendMessage({ type: "GET_CONSTANTS" }, (response) => {
  // DEFINE CONSTANTS BEFORE RUNNING SCRIPT
  const CONSTANTS = response.CONSTANTS;

  const trigger = () => {
    try {
      extension.runtime.sendMessage({
        type: CONSTANTS.GAME_DETECTED,
        screen: screenData,
      });
    } catch (e) {
      console.error(e);
    }
  };
  // Loop through iframes to find the target game
  const observer = new MutationObserver(() => {
    const iframe = document.getElementById("game") || null;
    if (iframe === null) return;
    const iframeSrc = iframe?.src || null;

    // Send message if the game is detected
    if (iframeSrc?.includes("/html5/supermarioconstruct")) {
      observer.disconnect();
      isObserverConnected = false;
      trigger();
      pathname = window.location.pathname;
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Dynamically check the page title
  if (
    document.title === "Super Mario Construct" ||
    document.title === "Yoshi's Fabrication Station"
  ) {
    observer.disconnect();
    trigger();
    pathname = window.location.pathname;
  }

  // Reset pathname every 5 seconds to handle React/SPA URL changes
  setInterval(() => {
    if (pathname !== window?.location?.pathname && !isObserverConnected) {
      pathname = window.location.pathname;
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }, 5000);

  // Listen for messages from the popup
  extension.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === CONSTANTS.CHECK_GAME_IFRAME) {
      const iframe = document.getElementById("game") || null;
      const hasIframes = iframe !== null;
      // send the response
      sendResponse(hasIframes);
      return;
    }
    // reload the iframe
    if (message.type === CONSTANTS.RELOAD_GAME && !window.devmode) {
      const iframe = document.getElementById("game") || null;
      if (iframe !== null) iframe.contentWindow.location.reload();
      return;
    }
  });
});
