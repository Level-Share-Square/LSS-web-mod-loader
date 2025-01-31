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
      alert(chrome.i18n.getMessage("empty_folder_error"));
      return;
    }

    const loaderFile = Array.from(fileInput.files).find(
      (file) => file.name === "loader.json"
    );
    if (!loaderFile) {
      alert(chrome.i18n.getMessage("missing_json_error"));
      return;
    }

    const reader = new FileReader();

    reader.addEventListener("load", async () => {
      let result;
      try {
        // load the json loader file
        result = await JSON.parse(
          window
            .atob(reader.result.split(",")[1])
            .replaceAll(">", "")
            .replaceAll("<", "")
        );
      } catch (error) {
        alert(chrome.i18n.getMessage("invalid_json_error", [error.message]));
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

      const requiredFields = { Version, Name, RootFolder, ReferenceRoot };
      const missingFields = Object.keys(requiredFields).filter(
        (key) => !requiredFields[key]
      );

      if (missingFields.length > 0) {
        // format the message with commas and "and"
        const formattedFields =
          missingFields.length > 1
            ? missingFields.slice(0, -1).join(", ") +
              " and " +
              missingFields.at(-1)
            : missingFields[0];

        alert(chrome.i18n.getMessage("missing_fields_error", formattedFields));
        return;
      }

      let proceed = true;
      // check if the version is the same
      const game = currentGameVersions.find(
        (game) => game.acronym === GameAbbreviation
      );
      const gv = game?.version || undefined;
      // check if the game version is the same
      if (GameVersion !== gv || !gv) {
        // confirmation
        proceed = confirm(
          !gv
            ? chrome.i18n.getMessage("unknown_game_warning")
            : chrome.i18n.getMessage("outdated_mod_warning", [
                game?.version,
                result?.GameVersion,
              ])
        );
      }

      // if not, abort
      if (!proceed) {
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
