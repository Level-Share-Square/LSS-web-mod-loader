window.modBrowser = true;
const apiBaseUrl = "http://localhost:5000/api/accesspoint/mods/";

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
    document.getElementById("loading").style.display = "none";
};

window.addEventListener("DOMContentLoaded", () => {
    // load the game version
    getGameVer();
    document.getElementById("search-input").placeholder =
        extension.i18n.getMessage("search_input_placeholder");
    const noMods = document.getElementById("empty");
    if (!noMods.classList.contains("hidden")) noMods.classList.add("hidden");
    // change the title
    document.getElementById("header-browser").textContent =
        "Level Share Square - " + extension.i18n.getMessage("mod_browser_title");
    document.title =
        extension.i18n.getMessage("mod_browser_title") + " - Level Share Square";
    // fetch list
    handleModListFetch();
});


const updateSearchButton = (enabled) => {
    const searchButton = document.getElementById("search-button");
    const inputField = document.getElementById("search-input");
    searchButton.disabled = !enabled;
    inputField.disabled = !enabled;
}

/**
 * Handles the mod list fetch request.
 * 
 * It fetches the list of mods from the api and displays them on the page.
 * If the response is empty, it calls handleEmptyResponse to show an error message.
 * If the api call fails, it calls handleEmptyResponse with a connection error message.
 * 
 * This function is called on page load and when the user navigates to a new page.
 */
const handleModListFetch = () => {
    // get query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const page = parseInt(urlParams.get("page")) || 1;
    const search = urlParams.get("search") || "";
    const query = `?page=${page}&search=${search}`;

    // api call
    fetch(apiBaseUrl + "get" + query)
        .then((response) => response.json())
        .then((data) => {
            const mods = data.mods;
            const pages = data.pages;
            // handle empty response
            if (mods.length === 0) return handleEmptyResponse(false);
            displayMods(mods);
            updatePagination(pages, page);
            updateSearchButton(true);
        })// fallback
        .catch(() => handleEmptyResponse(true));
};

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
            e.preventDefault()
            const searchParams = new URLSearchParams(window.location.search);
            searchParams.set("page", i);
            window.location.search = searchParams.toString();
            // reload list
            handleModListFetch();
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
            fetch(apiBaseUrl + mod?._id + "/get")
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

