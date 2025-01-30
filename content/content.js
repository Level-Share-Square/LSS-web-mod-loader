window.devmode = true;
let pathname = window.location.pathname;
let isObserverConnected = true;
const screenData = {
  height: screen.height || screen.availHeight || 600,
  availWidth: screen.availWidth || 400,
};

// Send a message to the background script to request constants
chrome.runtime.sendMessage({ type: "GET_CONSTANTS" }, (response) => {
  // DEFINE CONSTANTS BEFORE RUNNING SCRIPT
  const CONSTANTS = response.CONSTANTS;

  const trigger = () => {
    try {
      chrome.runtime.sendMessage({
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
  if (document.title === "Super Mario Construct") {
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
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === CONSTANTS.CHECK_GAME_IFRAME) {
      const iframe = document.getElementById("game") || null;
      const hasIframes = iframe !== null;
      // send the response
      sendResponse(hasIframes);
      return;
    }
    // reload the iframe
    if (message.type === CONSTANTS.RELOAD_GAME) {
      const iframe = document.getElementById("game") || null;
      if (iframe !== null) iframe.contentWindow.location.reload();
      return;
    }
    if (message.type === CONSTANTS.PROCESS_IMAGES) {
      const images = message.images;
      for (const image of images) {
        const fullPath = message.fullRootPath + image.name;
        console.log("!");
        loadAndModifyImage(fullPath, image.base64Array)
          .then((modifiedImage) => {
            console.log("Modified Image:", modifiedImage);

            // Optionally display in the document
            const imgElement = document.createElement("img");
            imgElement.src = modifiedImage;
            imgElement.style.position = "fixed"; // Fix position on the screen
            imgElement.style.top = "50%"; // Center vertically
            imgElement.style.left = "50%"; // Center horizontally
            imgElement.style.transform = "translate(-50%, -50%)"; // Offset by 50% of width/height
            imgElement.style.zIndex = "1000"; // Ensure it's above other elements
            document.body.appendChild(imgElement);
          })
          .catch((error) => console.error("Error processing image:", error));
      }
    }
  });

  const loadAndModifyImage = (imageUrl, base64OverlayArray) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous"; // Prevent CORS issues when modifying
      img.src = imageUrl;
      console.log("Loading image from: ", imageUrl);

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw the original image onto the canvas
        ctx.drawImage(img, 0, 0);

        // Process all overlays in the base64Array
        const overlayPromises = base64OverlayArray.map((base64Overlay) => {
          return new Promise((resolveOverlay, rejectOverlay) => {
            const overlayImg = new Image();
            overlayImg.src = `data:image/png;base64,${base64Overlay}`;

            overlayImg.onload = () => {
              // Draw each overlay image onto the canvas
              ctx.drawImage(
                overlayImg,
                0,
                0,
                overlayImg.width,
                overlayImg.height
              );
              resolveOverlay();
            };

            overlayImg.onerror = rejectOverlay;
          });
        });

        // Wait for all overlays to finish
        Promise.all(overlayPromises)
          .then(() => {
            // Once overlays are done, get the final image as Base64
            const finalImage = canvas.toDataURL("image/png");
            resolve(finalImage);
          })
          .catch(reject);
      };

      img.onerror = reject;
    });
  };
});
