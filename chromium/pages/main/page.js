window.modBrowser = true;
let currentQuery =
    new URLSearchParams(window.location.search).get("search") || "";
let inputEnabled = false,
    searchEnabled = false;

/**
 * Updates the UI to display an error message when no mods are found or a connection error occurs.
 *
 * @param {boolean} connectionError - Indicates if the error is due to a connection failure.
 * If true, displays a connection error message; otherwise, displays a no mods found message.
 */
const handleEmptyResponse = (connectionError) => {
    // set error message
    const noMods = document.getElementById("empty");
    noMods.style.fontSize = "1.5em";
    noMods.textContent = connectionError
        ? extension.i18n.getMessage("connection_error")
        : extension.i18n.getMessage("no_mods_for_query");
    // show the message
    if (noMods.classList.contains("hidden")) noMods.classList.remove("hidden");
    // remove loading message
    document.getElementById("loading").classList.add("hidden");
    // get elements
    const input = document.getElementById("search-input");
    const button = document.getElementById("search-button");
    const icon = document.getElementById("search-icon");
    // update state
    input.disabled = false;
    button.disabled = false;
    icon.textContent = "refresh";
    button.title = extension.i18n.getMessage("reset_button_tooltip");
    // button event listener
    if (!searchEnabled) button.addEventListener("click", searchAndRefreshHandler);
    if (!inputEnabled) input.addEventListener("input", inputHandler);
    // update corresponding variables
    inputEnabled = true;
    searchEnabled = true;
};

window.addEventListener("DOMContentLoaded", async () => {
    // load the game version
    await getGameVer();
    // set input default values
    const input = document.getElementById("search-input");
    input.placeholder = extension.i18n.getMessage("search_input_placeholder");
    input.value = new URLSearchParams(window.location.search).get("search") || "";
    // set button default title
    const button = document.getElementById("search-button");
    const icon = document.getElementById("search-icon");
    const message =
        icon.textContent === "refresh"
            ? extension.i18n.getMessage("reset_button_tooltip")
            : extension.i18n.getMessage("search_button_tooltip");
    button.title = message;
    // get the empty element
    const noMods = document.getElementById("empty");
    if (!noMods.classList.contains("hidden")) noMods.classList.add("hidden");
    // change the title
    document.getElementById("header-browser").textContent =
        "Level Share Square - " + extension.i18n.getMessage("mod_browser_title");
    document.title =
        extension.i18n.getMessage("mod_browser_title") + " - Level Share Square";
    // fetch list
    const urlParams = new URLSearchParams(window.location.search);
    const page = parseInt(urlParams.get("page")) || 1;
    const search = urlParams.get("search") || "";
    handleModListFetch({ page, search });
});

/**
 * Handles changes to the search bar input field.
 *
 * @param {Event} e - The input event.
 *
 * If the query is empty and the current query is also empty, disables the search button.
 * If the new query matches the current query, sets the search button to the "refresh" state
 * and enables it; otherwise, sets the search button to the "search" state and enables it.
 */
const inputHandler = (e) => {
    e.preventDefault();
    const searchButton = document.getElementById("search-button");
    const searchIcon = document.getElementById("search-icon");
    // disable if query is empty and already in use
    if (currentQuery === "" && e.target.value === "")
        return (searchButton.disabled = true);
    // set to reset state if query matches current query
    if (currentQuery === e.target.value || e.target.value === "") {
        searchIcon.textContent = "refresh";
        searchButton.title = extension.i18n.getMessage("reset_button_tooltip");
        return (searchButton.disabled = false);
    }
    // set to search state otherwise
    searchButton.title = extension.i18n.getMessage("search_button_tooltip");
    searchIcon.textContent = "search";
    searchButton.disabled = false;
};

/**
 * Handles search button clicks by updating the URL query parameter and refreshing
 * the mod list. If the button is in the "refresh" state, removes the query parameter;
 * otherwise, sets it to the current search input value.
 *
 * @param {Event} e - The click event.
 */
const searchAndRefreshHandler = (e) => {
    e.preventDefault();
    const inputField = document.getElementById("search-input");
    const searchIcon = document.getElementById("search-icon");
    const urlParams = new URLSearchParams(window.location.search);
    // handle refresh
    if (searchIcon.textContent === "refresh") {
        searchIcon.textContent = "search";
        inputField.value = "";
        e.target.title = extension.i18n.getMessage("search_button_tooltip");
        // handle update
    } else {
        e.target.title = extension.i18n.getMessage("reset_button_tooltip");
        searchIcon.textContent = "refresh";
    }
    // update elements
    e.target.disabled = true;
    inputField.disabled = true;
    document.getElementById("loading").classList.add("hidden");
    // get page
    const page = parseInt(urlParams.get("page")) || 1;
    // refresh
    handleModListFetch({ page, search: inputField.value });
};

/**
 * Updates the search button and input field state based on the enabled parameter.
 * If enabled is true, the fields are unlocked and the event listeners are added;
 * otherwise, the fields are locked and the event listeners are removed.
 * The button is also disabled if the current query matches the input field value.
 * @param {boolean} enabled - Whether to enable or disable the search button and input field.
 */
const updateSearchButton = (enabled) => {
    // get elements
    const searchButton = document.getElementById("search-button");
    const inputField = document.getElementById("search-input");
    // lock/unlock fields
    inputField.disabled = !enabled;
    searchButton.disabled = !enabled || inputField.value === currentQuery;
    // update event listeners
    if (!inputEnabled) {
        inputEnabled = true;
        inputField.addEventListener("input", inputHandler);
    }
    // enable button
    if (!searchEnabled) {
        searchEnabled = true;
        searchButton.addEventListener("click", searchAndRefreshHandler);
    }
};

/**
 * Handles the mod list fetch request.
 *
 * It fetches the list of mods from the api and displays them on the page.
 * If the response is empty, it calls handleEmptyResponse to show an error message.
 * If the api call fails, it calls handleEmptyResponse with a connection error message.
 *
 * This function is called on page load and when the user navigates to a new page.
 */
const handleModListFetch = (queryObj) => {
    // get query parameters
    const urlParams = new URLSearchParams(queryObj);
    const query = `?${urlParams.toString()}`;
    history.pushState({}, "", query);

    // before making the call, remove the mod list list if applicable and enable loading message
    const modListContainer = document.getElementById("mod-browser-container");
    !modListContainer.classList.contains("hidden") &&
        modListContainer.classList.add("hidden");
    document.getElementById("loading").classList.remove("hidden");
    document.getElementById("empty").classList.add("hidden");

    // api call
    fetch(window.apiBaseUrl + "mods/" + "get" + query)
        .then((response) => response.json())
        .then((data) => {
            const mods = data.mods;
            const pages = data.pages;
            // handle empty response
            if (mods.length === 0) return handleEmptyResponse(false);
            displayMods(mods);
            updatePagination(pages, queryObj.page);
            updateSearchButton(true);
            // update query
            currentQuery = urlParams.get("search") || "";
        }) // fallback
        .catch(() => handleEmptyResponse(true));
};

/**
 * Updates the pagination buttons based on the number of pages and current page.
 *
 * Removes all previous pagination buttons and creates new ones for each page.
 * The buttons are disabled if they are not the current page.
 *
 * @param {number} pages The total number of pages.
 * @param {number} page The current page.
 */
const updatePagination = (pages, page) => {
    const pagination = document.getElementById("pagination");
    // remove all children
    while (pagination.firstChild) pagination.removeChild(pagination.firstChild);
    // create buttons for each page
    for (let i = 1; i <= pages; i++) {
        // create button
        const button = document.createElement("button");
        button.classList.add("btn");
        button.textContent = i;
        button.disabled = isNaN(page) ? i === 1 : i === page;
        // click event
        button.addEventListener("click", (e) => {
            e.preventDefault();
            const searchParams = new URLSearchParams(window.location.search);
            const search = searchParams.get("search");
            // reload list
            handleModListFetch({ page: i, search });
        });
        // add to list
        pagination.appendChild(button);
    }
};

/**
 * Fetches a mod by its ID from the API, retrieves its data as a zipped file,
 * extracts the contents, and resolves with an array of File objects.
 *
 * @param {Object} mod - The mod object containing the ID (_id) of the mod to fetch.
 * @return {Promise<File[]>} A promise that resolves with an array of File objects
 * representing the files contained within the mod's zip, or resolves with an empty
 * array in case of an error.
 */

const handleModFetch = (mod) =>
    new Promise((resolve) => {
        try {
            fetch(window.apiBaseUrl + "mods/" + mod?._id + "/get")
                .then((response) => response.arrayBuffer())
                .then((zipBuffer) => JSZip.loadAsync(zipBuffer))
                .then(async (zip) => {
                    const extractedFiles = {};
                    const extractPromises = [];

                    // Create an array of promises for all file extractions
                    zip.forEach((relativePath, zipEntry) => {
                        if (!zipEntry.dir) {
                            const promise = zipEntry.async("blob").then((content) => {
                                extractedFiles[relativePath] = content;
                            });
                            extractPromises.push(promise);
                        }
                    });

                    // Wait for all extractions to complete
                    await Promise.all(extractPromises);
                    return extractedFiles;
                })
                .then((extractedFiles) => {
                    // Create a DataTransfer object
                    const dataTransfer = new DataTransfer();

                    // Convert your extracted files to File objects and add them
                    Object.entries(extractedFiles).forEach(([path, blob]) => {
                        const folderPath = path.split("/").pop();
                        // Create a File object from the Blob
                        const file = new File([blob], folderPath, { type: blob.type });
                        Object.defineProperty(file, "webkitRelativePath", {
                            value: path,
                        });
                        dataTransfer.items.add(file);
                    });

                    // Create your input element
                    const fileInput = document.createElement("input");
                    fileInput.type = "file";
                    fileInput.id = "uploadModFolder";
                    fileInput.webkitdirectory = true;

                    // Set the files from DataTransfer
                    fileInput.files = dataTransfer.files;
                    // Call your handler
                    resolve(fileInput);
                })
                .catch((error) => {
                    console.error(error);
                    resolve([]);
                });
        } catch (error) {
            console.error(error);
            resolve([]);
        }
    });
