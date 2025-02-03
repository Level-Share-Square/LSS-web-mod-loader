# Level Share Square Web Mod Loader v1.0

This extension serves as a method of loading mods for web/html5 games which host their files in an accessible manner. 
Mods may no longer work in versions which they weren't made for, keep in mind to only load mods of the same version or versions without major changes.
This tool was made with games hosted on Level Share Square kept in mind, but it will work for most other non-web assembly based games.

## Loading mods

To load your mod, simply open the extension, then click "manager". After that, you can upload the mod folder and click "Load Modpack", which will automatically load it. Modpacks will only work if they have a properly configured `loader.json` file inside.

## Making your own mods

Simply copy the `example-mod-folder` into your own project, then change the following values in `loader.json`:
- `Name`: The name of your mod, set it when you start your project. DON'T change it when releasing updates for your mod.
- `Version`: The version of your modpack, used as an identifier to make users know they have the latest patch.
- `GameAbbreviation`: The acronym of the game your mod was made for, supported games can be found in the mod manager menu.
- `GameVersion`: The version of the game your mod was made for, latest game versions can be found in the mod manager menu.
- `BaseURL`: The original URL of where the game is located. Used to retrieve the old assets.
- `RootFolder`: The folder in which the extension will look for, used in combination with `RootFolder` to find the original assets:
    - `images`: This will look for the _BaseURL/images/_ original images in the folder corresponding to its value.
                
RootFolder example:
```json
{
	"BaseURL": "https://example.com/",
	"RootFolder": {"assets":["images/", "img"]}
}
```
This will target __https://example.com/images/[assets_folder_contents_of_your_mod]__ and expect images in your folder

### Supported folder tags

The second value in your key within `RootFolder` MUST be of type **img**, none other are currently supported.

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

