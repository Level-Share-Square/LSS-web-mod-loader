# Modpacks

Place your images in your images folder and make sure the file names match that of the target image **(file name must be exactly the same, the extension can be different)**. The images folder can be named anything as long as it is specified in RootFolder

Example `loader.json` file:

```json
{
  "Version": "1.0", // mod version
  "GameAbbreviation": "<ACRONYM_HERE>", // game acronym
  "Name": "Spaghbettle", // name of your mod (naming must remain consistent)
  "GameVersion": "<GAME_VERSION_HERE>>", // gameversion your mod was built under
  "BaseURL": "https://levelsharesquare.com/<GAME_PATH_HERE>/", // game host URL
  "RootFolder": { "images": ["images/", "img"] } // folder (key) to look into to replace a sub directory (value1) and contents (value2)
}
```
# Modding info
## Modding images
- Folder type for images is "img"
- Images must be the same width and height
- The replaced sprites must be on the same location in the image.
- Make sure to remove anything that is left unchanged from the spritesheet to prevent conflicts with other mods.
- In case the original sprites contain unused portions/stretched bits, you can often safely remove these. Though these kind of structures are often involved with artifact removal within the game.
- Images can be any of the following extensions:
	- png
	- jpg
	- jpeg
	- webp

## Modding JSON
- Folder type for JSON is "json"
- JSON keys can target ANY key in the file, granted the highest keys (most to the left) will be targetted first.
- JSON have a structure of `{"key":"value"}`, keys can contain deeper JSON structures with more keys

## Modding any other file
- The "any" folder type is used for any filetypes without special support
- Assets will be repaced completely instead of merged with other mods & the original
- Only use if you want to target files such as vectors, music, binary data, etc.

## RootFolders example
```json
{
	"BaseURL": "https://example.com/",
	"RootFolder": {
		"assets":["images/", "img"],
		"palettes":["Palettes/", "json"],
		"media": ["", "any"]
	}
}
```
This will target:
- `https://example.com/images/<assets_folder_contents_of_your_mod>` and expect images in the folder
- `https://example.com/Palettes/<palettes_folder_contents_of_your_mod>` and expect JSON files in the folder

To load your modpack, use the extension to load the folder and make sure you configured `loader.json`
Keep in mind mods are *NOT* guaranteed to be compatible with future versions of the game you made it for, or with other mods in general.
Mods may not work perfectly due to limitations put by the game on modding for the sake of optimization

You should also include a "readme" file, whether it be .txt or .md, with info about your modpack here for the player to read (authors, what it changes, etc.)
