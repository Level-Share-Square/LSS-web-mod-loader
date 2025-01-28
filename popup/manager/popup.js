let currentGameVer = ""

const getGameVer = async () => {
    const response = await fetch("https://levelsharesquare.com/api/accesspoint/gameversion/SMC");
    currentGameVer = (await response.json())?.version;
}

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

    const iniFile = Array.from(fileInput.files).find(file => file.name.endsWith('.ini'));
    const filePath = iniFile ? iniFile.name : null;
    const reader = new FileReader();

    if (!iniFile) {
        alert("This isn't a valid modpack folder, make sure it has a .ini file at the root of the folder!");
        return;
    }

    reader.addEventListener("load", async () => {
        const fileContent = reader.result;
        // Parse the content
        const result = await parseIniFile(fileContent);
        const { GameVersion, Version, Name, ImageRoot } = result;

        let proceed = true;

        // validate game version
        if (GameVersion !== currentGameVer) {
            proceed = await new Promise(resolve => {
                const userResponse = confirm(`The latest game version is ${currentGameVer} while this modpack is for ${GameVersion}. Do you want to proceed?`);
                resolve(userResponse);
            });
        }

        if (!proceed)
            return;

        // get the filepath
        const imageFilePath = filePath.replace(".ini", ImageRoot);
        // get all images in the folder


    });

    reader.readAsDataURL(iniFile);
});

