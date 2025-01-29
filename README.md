# Super Mario Construct Mod Loader v1.0

This extension serves as a method of loading mods for the Super Mario Construct web version, don't use it for the desktop version.
This version was last updated during SMC b29.3 and may no longer work properly in future versions of Super Mario Construct.

## Loading mods

To load your mod, simply open the extension, then click "manager". After that, you can upload the mod folder and click "Load Modpack", which will automatically load it. Modpacks will only work if they have a properly configured `loader.json` file inside.

## Making your own mods

Simply copy the `example-folder` into your own project, then change the following values in `loader.json`:
- `Version`: The version of your modpack, used as an identifier to make users know they have the latest patch.
- `GameVersion`: The version of Super Mario Construct your mod was made for, latest SMC version can be found in the mod manager menu.
- `Name`: The name of your mod, set it when you start your project. Don't change it when releasing updates for your mod.
- `ImageRoot`: The folder in which the extension will look for to replace the `/images/`path used by SMC.

## Credits

### Programming

MrGerund (The Flying Dutchman)\
WINRARisyou
