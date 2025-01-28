let pathname = window.location.pathname;
let isObserverConnected = true;
const screenData = {
    height: screen.height || screen.availHeight || 600,
    availWidth: screen.availWidth || 400,
}

const trigger = () => {
    console.log(screen)
    try {
        chrome.runtime.sendMessage({
            type: 'GAME_DETECTED', screen: screenData
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
if (document.title === 'Super Mario Construct') {
    observer.disconnect();
    trigger();
    pathname = window.location.pathname;

}

// Reset pathname every 5 seconds to handle React/SPA URL changes
const interval = setInterval(() => {
    if (pathname !== window?.location?.pathname && !isObserverConnected) {
        console.log('Resetting pathname');
        pathname = window.location.pathname;
        observer.observe(document.body, { childList: true, subtree: true });
    }
}, 5000);
