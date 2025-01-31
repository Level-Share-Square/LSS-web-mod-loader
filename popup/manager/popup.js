// close button
document.getElementById("closePopupBtn").addEventListener("click", function () {
  window.close();
});

// enable button when a file is provided
document
  .getElementById("uploadModFolder")
  .addEventListener("change", function () {
    document.getElementById("submitButton").disabled = false;
  });

// domcontent loaded callback to display the mods
document.addEventListener("DOMContentLoaded", () => {
  getGameVer().then(() => displayMods());
});

// submit the form to load a new mod
document
  .getElementById("replacementForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const fileInput = document.getElementById("uploadModFolder");

    if (!fileInput.files.length) {
      alert("Please upload the mod folder!");
      return;
    }

    const loaderFile = Array.from(fileInput.files).find(
      (file) => file.name === "loader.json"
    );
    if (!loaderFile) {
      alert(
        "This isn't a valid modpack folder. Make sure it has a loader.json file at the root!"
      );
      return;
    }

    const reader = new FileReader();

    reader.addEventListener("load", async () => {
      let result;
      try {
        // load the json loader file
        result = await JSON.parse(window.atob(reader.result.split(",")[1]));
      } catch (error) {
        alert(`Invalid JSON file: ${error.message}`);
        return;
      }
      // get its contents
      const {
        GameVersion,
        Version,
        Name,
        RootFolder,
        ReferenceRoot,
        GameAbbreviation,
      } = result;

      let proceed = true;
      // check if the version is the same
      const game = currentGameVersions.find(
        (game) => game.acronym === GameAbbreviation
      );
      // check if the game version is the same
      if (GameVersion !== game?.version || !game?.version) {
        // confirmation
        proceed = confirm(
          !game?.version
            ? "This modpack is for an unkwnown game, do you wish to proceed?"
            : `The latest game version is ${game?.version}, but this modpack is for ${GameVersion}. Do you want to proceed?`
        );
      }

      // if not, abort
      if (!proceed) {
        alert("Operation aborted.");
        return;
      }

      // Get the folder name
      const folderName = fileInput.files[0].webkitRelativePath.split("/")[0];
      const normalizedImageRoot = `${folderName}/${RootFolder?.Images}`.replace(
        /\/$/,
        ""
      );

      // Get all images in the folder
      const images = Array.from(fileInput.files).filter((file) => {
        return (
          file.webkitRelativePath.startsWith(normalizedImageRoot) &&
          /\.(png|jpg|jpeg|gif|webp)$/i.test(file.name)
        );
      });

      // Check if there are any images
      if (images.length === 0) {
        alert(chrome.i18n.getMessage("imageroot_warning"));
        return;
      }

      // Create new mod object (overwrites existing data)
      const newMod = {
        version: Version,
        gameVersion: GameVersion,
        gameAbbreviation: GameAbbreviation,
        targetPath: ReferenceRoot,
        images: {}, // define the images object
        enabled: true,
      };

      // Process each image
      for (const image of images) {
        const imageReader = new FileReader();
        const imagePath = image.webkitRelativePath.replace(
          normalizedImageRoot + "/",
          ""
        );

        // Convert image to base64
        const base64 = await new Promise((resolve) => {
          imageReader.onload = () => {
            resolve(imageReader.result.replace(/^.+,/, ""));
          };
          imageReader.readAsDataURL(image);
        });

        // Overwrite images completely
        newMod.images[imagePath] = [
          `data:image/${image.type.split("/")[1]};base64,${base64}`,
          true, // Enabled
        ];
      }
      // Store new mod data (overwrites existing)
      chrome.storage.local.set({ [Name]: newMod }, () => {
        // Reload mods after saving
        chrome.runtime.sendMessage(
          { type: CONSTANTS.RELOAD_MODS },
          (response) => {
            // upon receiving a response, update the list
            if (response.type === CONSTANTS.MODS_RELOADED) {
              displayMods();
              document.getElementById("uploadModFolder").value = "";
              document.getElementById("submitButton").disabled = true;
            }
          }
        );
      });
    });

    reader.readAsDataURL(loaderFile);
  });
