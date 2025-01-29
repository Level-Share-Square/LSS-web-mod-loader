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
document.getElementById("fileUploadId").addEventListener("change", function () {
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

    const fileInput = document.getElementById("fileUploadId");

    if (!fileInput.files.length) {
      alert("Please upload the mod folder!");
      return;
    }

    const loaderFile = Array.from(fileInput.files).find(
      (file) => file.name === "loader.json"
    );
    const filePath = loaderFile ? loaderFile.name : null;
    const reader = new FileReader();

    if (!loaderFile) {
      alert(
        "This isn't a valid modpack folder, make sure it has a .ini file at the root of the folder!"
      );
      return;
    }

    reader.addEventListener("load", async () => {
      const fileContent = reader.result;
      // Parse the content
      const result = JSON.parse(fileContent);
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
      console.log(result);
      // get the folder name
      const folderName = fileInput.files[0].webkitRelativePath.split("/")[0];
      const normalizedImageRoot = `${folderName}/${ImageRoot}`.replace(
        /\/$/,
        ""
      );

      // get all images in the folder
      const images = Array.from(fileInput.files).filter((file) => {
        console.log(fileInput.files);
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

      // Output image files
      console.log("Images found:", images);
      //alert(`Found ${images.length} images in images folder: ${ImageRoot}`);

      //const mappings = {};
      const modpackPrefix = `${Name}-${Version}`;
      const baseUrl =
        "https://www.google.com/images/branding/googlelogo/1x/googlelogo_light_color_272x92dp.png";

      // Process each image
      for (const image of images) {
        const imageReader = new FileReader();
        const imagePath = image.webkitRelativePath.replace(
          normalizedImageRoot + "/",
          ""
        ); // Get the relative path
        const imageName = image.name;
        const storageKey = `${modpackPrefix}_${imageName}`;

        const base64 = await new Promise((resolve) => {
          imageReader.onload = () => {
            const base64String = imageReader.result.replace(/^.+,/, "");
            resolve(base64String);
          };
          imageReader.readAsDataURL(image);
        });

        await new Promise((resolve) => {
          chrome.storage.local.set(
            {
              [storageKey]: `data:image/${
                image.type.split("/")[1]
              };base64,${base64}`,
            },
            resolve
          );
        });
        // Save mappings to storage and update rules
        chrome.storage.local.get("urlMappings", async (result) => {
          const mappings = result.urlMappings || {};
          // Add to mappings
          mappings[baseUrl] = `data:image/${
            image.type.split("/")[1]
          };base64,${base64}`;
          chrome.storage.local.set({ urlMappings: mappings }, async () => {
            await updateRules(mappings);
            displayMods();
          });
        });
      }
      console.log(`Added ${images.length} images from the modpack!`);
    });

    reader.readAsDataURL(loaderFile);
  });
