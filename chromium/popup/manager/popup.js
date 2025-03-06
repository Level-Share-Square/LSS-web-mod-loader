window.isManager = true;
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
  .addEventListener("submit", (event) => {
    event.preventDefault();
    const loadingMessage = document.getElementById("loading");
    loadingMessage.classList.remove("hidden");
    handleModLoad(event).then(() =>
      loadingMessage.classList
        .add("hidden"))
      .catch(() => loadingMessage.classList.add("hidden"));
  })
