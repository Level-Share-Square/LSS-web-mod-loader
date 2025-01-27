// Look for all iframes on the page
const docTitle = document.title;

const checkForGame = () => {

    // Loop through iframes to find the target game
    const observer = new MutationObserver(() => {
        const iframeWrapper = document.getElementById("game-wrapper");
        const iframe = iframeWrapper?.firstChild;
        console.log(iframe)
        chrome.runtime.sendMessage({
            type: 'GAME_DETECTED',
            iframeSrc: iframe,
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // detect the HTML page
    if (docTitle === 'Super Mario Construct')
        return console.log('On SMC page');
}


// Run the functions
checkForGame()
