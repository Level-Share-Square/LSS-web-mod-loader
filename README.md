# Level Share Square Web Mod Loader v1.1

This extension serves as a method of loading mods for web/html5 games which host their files in an accessible manner. 
Mods may no longer work in versions which they weren't made for, keep in mind to only load mods of the same version or versions without major changes.
This tool was made with games hosted on Level Share Square kept in mind, but it will work for most other non-web assembly based games.

## Setup & Loading mods

Watch the setup guide on how to get the extension working and resolve issues:
https://youtu.be/bUdqeRQhTFc

To load your mod, simply open the extension, then click "manager". After that, you can upload the mod folder and click "Load Modpack", which will automatically load it. Modpacks will only work if they have a properly configured `loader.json` file inside.

## Making your own mods

Simply copy the `example-mod-folder` into your own project, then change the following values in `loader.json`:
- `Name`: The name of your mod, set it when you start your project. DON'T change it when releasing updates for your mod.
- `Version`: The version of your modpack, used as an identifier to make users know they have the latest patch.
- `GameAbbreviation`: The acronym of the game your mod was made for, supported games can be found in the mod manager menu.
- `GameVersion`: The version of the game your mod was made for, latest game versions can be found in the mod manager menu.
- `BaseURL`: The original URL of where the game is located. Used to retrieve the old assets.
- `RootFolder`: The folder in which the extension will look for, used in combination with `BaseURL` to find the original assets:
    - `"key":["value/",type]`: This will request `BaseURL/value/` for the original image, then replace it with the contents of mod folder `key`.
    - `type`: The expected file type within the folder, which is the "folder tag". Scroll down for all supported tags.
                
RootFolders example:
```json
{
	"BaseURL": "https://example.com/",
	"RootFolder": {
		"assets":["images/", "img"],
		"palettes":["Palettes/", "json"]
	}
}
```
This will target:
- `https://example.com/images/<assets_folder_contents_of_your_mod>` and expect images in the folder
- `https://example.com/Palettes/<palettes_folder_contents_of_your_mod>` and expect JSON files in the folder

### Supported folder tags

The second value in your key within `RootFolder` contains the expected filetype in the folder:
- `img` looks for images such as `.png`, `.jpg`, `.webp`, etc.
- `json` looks for json files and replace matching keys, files often used for palettes/layouts/etc.

## Credits
### Programming
- MrGerund (AKA The Flying Dutchman)
- WINRARisyou (Assistant Developer)

### Translations
- MrGerund: Dutch
- Edwrin (AKA Skopler): Spanish, French & Japanese

### Testing
- Popthatcorn14
- Bluseven
- AnonymousEpitaph
- Edwrin

