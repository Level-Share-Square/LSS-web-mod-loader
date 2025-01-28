let currentGameVer = ""

const getGameVer = async () => {
    const response = await fetch("https://levelsharesquare.com/api/accesspoint/gameversion/SMC");
    currentGameVer = (await response.json())?.version;
    const gameVerSpan = document.getElementById("SMC-ver-display");
    gameVerSpan.textContent = `${currentGameVer}`
}

window.addEventListener("DOMContentLoaded", getGameVer);

// close button
document.getElementById('closePopupBtn').addEventListener('click', function () {
    window.close();
});

// enable button when a file is provided
document.getElementById("fileUploadId").addEventListener("change", function () {
    document.getElementById("submitButton").disabled = false;
});

// parsing ini files
const parseIniFile = (base64Content) => {
    const decodedContent = window.atob(base64Content.split(',')[1]);
    const lines = decodedContent.split('\n');
    const parsedData = {};

    lines.forEach(line => {
        // Ignore empty lines or comments (lines starting with `;` or `#`)
        if (line.trim() && !line.startsWith(';') && !line.startsWith('#')) {
            const [key, value] = line.split('=').map(str => str.trim());

            if (key && value !== undefined) {
                parsedData[key] = value;
            }
        }
    });

    return parsedData;
}

// submit the form to load a new mod
document.getElementById("replacementForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const fileInput = document.getElementById("fileUploadId");

    if (!fileInput.files.length) {
        alert("Please upload the mod folder!");
        return;
    }

    // Check for the .ini file
    const iniFile = Array.from(fileInput.files).find(file => file.name.endsWith('.ini'));
    const reader = new FileReader();

    if (!iniFile) {
        alert("This isn't a valid modpack folder, make sure it has a .ini file at the root of the folder!");
        return;
    }

    reader.addEventListener("load", async () => {
        const fileContent = reader.result;
        const result = await parseIniFile(fileContent); // Your custom function to parse .ini files
        const { GameVersion, Version, Name, ImageRoot } = result;

        let proceed = true;

        // Validate game version
        if (GameVersion !== currentGameVer) {
            proceed = await new Promise(resolve => {
                const userResponse = confirm(
                    `The latest game version is ${currentGameVer} while this modpack is for ${GameVersion}. Do you want to proceed?`
                );
                resolve(userResponse);
            });
        }

        if (!proceed) return;

        // Find the ImageRoot folder
        const imageFolder = Array.from(fileInput.files).filter(file =>
            file.webkitRelativePath.startsWith(ImageRoot)
        );

        if (!imageFolder.length) {
            alert(`The folder "${ImageRoot}" specified in the .ini file was not found.`);
            return;
        }

        // Filter images and encode them in Base64
        const imageFiles = imageFolder.filter(file => /\.(png|jpe?g|gif|webp)$/i.test(file.name));
        await storeImageFiles(imageFiles, Version, Name);

    });

    reader.readAsText(iniFile); // Read the .ini file as text
});

const storeImageFiles = async (images, version, name) => {
    const encodedImages = await Promise.all(
        images.map(file => new Promise((resolve, reject) => {
            const imgReader = new FileReader();
            imgReader.onload = () => {
                resolve({
                    fileName: file.name,
                    base64: imgReader.result // Base64-encoded image
                });
            };
            imgReader.onerror = () => reject(`Failed to read file: ${file.name}`);
            imgReader.readAsDataURL(file);
        }))
    );

    // Store the encoded images in `chrome.storage` or any other storage
    const imageStorageKey = `${name}-${version}`; // Key to store images
    const imageData = encodedImages.reduce((acc, { fileName, base64 }) => {
        acc[fileName] = base64;
        return acc;
    }, {});

    // Example: Store images in `chrome.storage.local`
    chrome.storage.local.set({ [imageStorageKey]: imageData }, () => {
        console.log("Images stored successfully:", imageData);
    });
}

