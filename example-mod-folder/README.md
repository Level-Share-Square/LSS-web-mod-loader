# example header

Place your images in your images folder and make sure the file names match that of the target image. **(file name must be exactly the same, the extension can be different)**\
The images folder can be named anything as long as it is specified in RootFolder
```json
// Example loader.json
{
	"Version": "1.0", // Version of the mod
	"GameAbbreviation": "SMC", // Abbreviation of the game the mod is for
	"Name": "<YOUR MOD NAME HERE>", // Mod name
	"GameVersion": "v8.beta29.4", // Version of the game the mod is for
	"BaseURL": "https://levelsharesquare.com/html5/supermarioconstruct/", // URL for the fullscreen page of the game. It should have the "/" at the end
	"RootFolder": {
		"Images": "assets/" // Name of the folder the images are in
	}
}
```
**Images must be the same size AND the replaced sprites must be on the same location in the image.**
Make sure to remove anything that is left unchanged from the spritesheet to prevent conflicts with other mods.
Images can be any of the following extensions:
- png
- jpg
- jpeg
- gif (we do not support animated sprites)
- webp

To load your modpack, use the extension to load the folder and make sure you configured `loader.json`
Keep in mind mods are *NOT* guaranteed to be compatible with future versions of the game you made it for, or with other mods in general.
Mods may not work perfectly due to limitations put by the game on modding for the sake of optimization

You should also include a "readme" file, whether it be .txt or .md or whatever, with info about your modpack here for the player to read (authors, what it changes, etc.)