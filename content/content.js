// Look for all iframes on the page
const docTitle = document?.title;
let loaded = false;

const checkForGame = () => {

    // Loop through iframes to find the target game
    const observer = new MutationObserver(() => {
        const iframe = document.getElementById("game") || null;
        if (iframe === null) return;
        const iframeSrc = iframe?.src || null;
        if (iframe !== null && iframeSrc?.includes("/html5/supermarioconstruct") && !loaded) {
            try {
                loaded = true;
                chrome.runtime.sendMessage({
                    type: 'GAME_DETECTED',
                    iframeSrc: iframe.src,  // Make sure to use iframe.src, not iframe itself
                });
            } catch (error) {
                console.error("Error sending message to background:", error);
            }
        }
    });

    console.log("test", docTitle, docTitle === 'Super Mario Construct')
    observer.observe(document.body, { childList: true, subtree: true });

    // detect the HTML page
    if (docTitle === 'Super Mario Construct') {
        chrome.runtime.sendMessage({
            type: 'GAME_DETECTED',
        });
        return
    }
}


// Run the functions
checkForGame()
