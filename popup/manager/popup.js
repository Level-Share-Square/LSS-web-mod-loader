let currentGameVer = "";
let CONSTANTS;

chrome.runtime.sendMessage({ type: "GET_CONSTANTS" }, (response) => {
  CONSTANTS = response.CONSTANTS;
});

const getGameVer = async () => {
  const response = await fetch(
    "https://levelsharesquare.com/api/accesspoint/gameversion/SMC"
  );
  currentGameVer = (await response.json())?.version;
  const gameVerSpan = document.getElementById("SMC-ver-display");
  gameVerSpan.textContent = `${currentGameVer}`;
};
getGameVer();

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
  displayMods();
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
    const reader = new FileReader();

    if (!loaderFile) {
      alert(
        "This isn't a valid modpack folder, make sure it has a loader.json file at the root of the folder!"
      );
      return;
    }

    reader.addEventListener("load", async () => {
      let result;
      try {
        const fileContent = reader.result;
        // Parse the content
        result = JSON.parse(window.atob(fileContent?.split(",")?.[1]));
      } catch (error) {
        alert(`The file provided is not a valid JSON file: ${error.message}`);
        return;
      }
      const { GameVersion, Version, Name, ImageRoot } = result;

      let proceed = true;

      if (GameVersion !== currentGameVer) {
        proceed = await new Promise((resolve) => {
          const userResponse = confirm(
            `The latest game version is ${currentGameVer} while this modpack is for ${GameVersion}. Do you want to proceed?`
          );
          resolve(userResponse);
        });
      }

      if (!proceed) {
        alert("abort");
        return;
      }
      // get the folder name
      const folderName = fileInput.files[0].webkitRelativePath.split("/")[0];
      const normalizedImageRoot = `${folderName}/${ImageRoot}`.replace(
        /\/$/,
        ""
      );

      // get all images in the folder
      const images = Array.from(fileInput.files).filter((file) => {
        const filePath = file.webkitRelativePath; //directories use webKitRealtivePath
        return (
          filePath.startsWith(normalizedImageRoot) &&
          /\.(png|jpg|jpeg|gif|webp)$/i.test(file.name)
        );
      });

      if (images.length === 0) {
        alert("No images found in the specified ImageRoot!");
        return;
      }

      await chrome.storage.local.set({
        [Name]: {
          version: Version,
          gameVersion: GameVersion,
          images: {},
          enabled: true,
        },
      });

      // Process each image
      for (const image of images) {
        const imageReader = new FileReader();
        const imagePath = image.webkitRelativePath.replace(
          normalizedImageRoot + "/",
          ""
        );

        // read the image and decode to base 64
        const base64 = await new Promise((resolve) => {
          imageReader.onload = () => {
            const base64String = imageReader.result.replace(/^.+,/, "");
            resolve(base64String);
          };
          imageReader.readAsDataURL(image);
        });

        // get the mod
        chrome.storage.local.get(Name, async (result) => {
          const newMod = result[Name] || {};
          // update the values
          newMod.images[imagePath] = [
            `data:image/${image.type.split("/")[1]};base64,${base64}`,
            true,
          ]; // add true to indicate it is enabled

          // update in storage
          chrome.storage.local.set({ [Name]: newMod });
        });
      }
      // when it is done looping, reload the mods
      chrome.runtime.sendMessage(
        {
          type: CONSTANTS.RELOAD_MODS,
        },
        (response) => {
          if (response.type === CONSTANTS.MODS_RELOADED) {
            // update list, clear files and disable button again
            displayMods();
            document.getElementById("uploadModFolder").value = "";
            document.getElementById("submitButton").disabled = true;
          }
        }
      );
    });

    reader.readAsDataURL(loaderFile);
  });
