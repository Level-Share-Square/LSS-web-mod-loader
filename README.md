# Level Share Square Web Mod Loader v1.0

This extension serves as a method of loading mods for the Super Mario Construct web version, don't use it for the desktop version.
Mods may no longer works in versions they weren't made for, keep in mind to only load mods of the same version or versions without major changes.

## Loading mods

To load your mod, simply open the extension, then click "manager". After that, you can upload the mod folder and click "Load Modpack", which will automatically load it. Modpacks will only work if they have a properly configured `loader.json` file inside.

## Making your own mods

Simply copy the `example-folder` into your own project, then change the following values in `loader.json`:
- `Version`: The version of your modpack, used as an identifier to make users know they have the latest patch.
- `GameVersion`: The version of Super Mario Construct your mod was made for, latest game version can be found in the mod manager menu.
- `Name`: The name of your mod, set it when you start your project. Don't change it when releasing updates for your mod.
- `ImageRoot`: The folder in which the extension will look for to replace the `/images/`path used by the game.

## Credits
### Programming
MrGerund (AKA The Flying Dutchman)
WINRARisyou (Assistant Developer)

### Translations
Dutch - MrGerund
Spanish, French & Japanese - Edwrin (AKA Skopler)
