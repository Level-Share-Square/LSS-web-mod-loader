window.devmode = false;
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
      //loop through the images
      const imageProcessingPromises = images.map(async (image) => {
        // get all base64 images
        const base64Arrays = Object.entries(image)
          .filter(([key, _]) => !isNaN(key)) // Only numeric keys
          .map(([_, value]) => value[0]); // Get base64 string

        try {
          // draw new image
          const modifiedImage = await loadAndModifyImage(
            image.originalImage,
            base64Arrays
          );
          // successfully return an object with the data and path
          return {
            data: modifiedImage,
            path: `${image.name}`,
          };
        } catch (error) {
          console.error("Error processing image:", error);
          return null; // Skip failed images
        }
      });
      // use Promise.all to wait for all image processing to complete
      Promise.all(imageProcessingPromises).then((base64Arrays) => {
        // Filter out failed (null) images
        const validImages = base64Arrays.filter((img) => img !== null);
        sendResponse({ newImages: validImages }); // Send the processed images
      });
      return true;
    }
  });

  const loadAndModifyImage = (original, modified) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = original;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw the original image onto the canvas
        ctx.drawImage(img, 0, 0);

        // Process all overlays in the base64Array
        const overlayPromises = modified.map((base64Overlay) => {
          return new Promise((resolveOverlay, rejectOverlay) => {
            const overlayImg = new Image();
            overlayImg.src = base64Overlay;

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
            // get original file extension from the base64 string
            const fileType = original.split(";")[0].split(":")[1];
            // Once overlays are done, get the final image as Base64 in lossless format
            const finalImage = canvas.toDataURL(fileType, 1);
            resolve(finalImage);
          })
          .catch(reject);
      };

      img.onerror = reject;
    });
  };
});
