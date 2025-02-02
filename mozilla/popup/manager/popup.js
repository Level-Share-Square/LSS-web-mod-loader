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
      alert(extension.i18n.getMessage("empty_folder_error"));
      return;
    }

    const loaderFile = Array.from(fileInput.files).find(
      (file) => file.name === "loader.json"
    );
    if (!loaderFile) {
      alert(extension.i18n.getMessage("missing_json_error"));
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
        alert(extension.i18n.getMessage("invalid_json_error", [error.message]));
        return;
      }
      // get its contents
      const {
        GameVersion,
        Version,
        Name,
        RootFolder,
        BaseURL,
        GameAbbreviation,
      } = result;

      const requiredFields = { Version, Name, RootFolder, BaseURL };
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

        alert(
          extension.i18n.getMessage("missing_fields_error", formattedFields)
        );
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
            ? extension.i18n.getMessage("unknown_game_warning")
            : extension.i18n.getMessage("outdated_mod_warning", [
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

      // get all RootFolder keys
      const rootFolderValues = Object.keys(RootFolder);

      let images = [];
      for (const key of rootFolderValues) {
        const normalizedImageRoot = `${folderName}/${key}`.replace(/\/$/, "");

        //! enforce image type
        if (RootFolder?.[key]?.[1] !== "img" || !RootFolder?.[key]?.[1]) {
          alert("Type must be img");
          return;
        }

        // Get all images in the folder
        images = Array.from(fileInput.files)
          .map((file) => ({ file, key })) // convert to array of objects
          .filter(({ file }) => {
            return (
              // filter out non-images
              file.webkitRelativePath.startsWith(normalizedImageRoot) &&
              /\.(png|jpg|jpeg|webp)$/i.test(file.name)
            );
          });

        // Check if there are any images
        if (images.length === 0) {
          alert(extension.i18n.getMessage("imageroot_warning"));
          return;
        }
      }

      const rootFolderPaths = // path becomes key for empty object
        Object.keys(RootFolder).map((key) => ({ [RootFolder[key][0]]: {} })) ||
        [];
      if (
        // disallow duplicate keys
        rootFolderPaths.some((path) =>
          [
            "version",
            "gameVersion",
            "gameAbbreviation",
            "targetPath",
            "enabled",
          ].includes(path)
        )
      ) {
        alert(extension.i18n.getMessage("duplicate_key_warning"));
        return;
      }

      // Create new mod object (overwrites existing data)
      const newMod = {
        version: Version,
        gameVersion: GameVersion,
        gameAbbreviation: GameAbbreviation,
        targetPath: BaseURL,
        ...Object.assign({}, ...rootFolderPaths), // define the root folder keys
        enabled: true,
      };

      // Process each image
      for (const key of rootFolderValues) {
        for (const imageObj of images) {
          // may sure key belongs to the image
          if (imageObj.key !== key) continue;
          const normalizedImageRoot = `${folderName}/${key}`.replace(/\/$/, "");
          // set image path
          const image = imageObj.file;
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

          const folderTarget = RootFolder[key][0];
          const fileType = RootFolder[key][1];
          // Overwrite images completely
          newMod[folderTarget][imagePath] = [
            `data:image/${image.type.split("/")[1]};base64,${base64}`,
            true, // Enabled
            fileType, // img, (currently no other types)
          ];
        }
      }
      // Store new mod data (overwrites existing)
      extension.storage.local.set({ [Name]: newMod }, () => {
        // Reload mods after saving
        extension.runtime.sendMessage(
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
