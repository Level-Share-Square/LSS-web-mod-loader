// Look for all iframes on the page
const docTitle = document.title;

const checkForGame = () => {

    // Loop through iframes to find the target game
    const observer = new MutationObserver(() => {
        const iframeWrapper = document.getElementById("game-wrapper");
        const iframeSrc = iframeWrapper?.firstChild?.src;
        console.log(iframeSrc)
        console.log('Game iframe detected:', iframeSrc);
        chrome.runtime.sendMessage({
            type: 'GAME_DETECTED',
            iframeSrc: iframeSrc,
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // detect the HTML page
    if (docTitle === 'Super Mario Construct')
        return console.log('On SMC page');
}


// Run the functions
checkForGame()
