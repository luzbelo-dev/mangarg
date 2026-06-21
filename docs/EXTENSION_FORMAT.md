# Mi Manga Dinamita — Extension Repository Format

## How to create an extension repository

Anyone can create and share manga source extensions for Mi Manga Dinamita. 
Host a `manifest.json` file at a public URL and users can add your repo.

## Manifest format

```json
{
  "name": "My Manga Sources",
  "description": "Community-curated manga sources",
  "extensions": [
    {
      "id": "my-source",
      "name": "My Source",
      "lang": "EN",
      "version": "1.0",
      "icon": "MS",
      "iconColor": "#4a90d9",
      "baseUrl": "https://example.com",
      "description": "English description",
      "descriptionEs": "Descripción en español",
      "features": ["Free", "No ads"],
      "nsfw": false
    }
  ]
}
```

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique kebab-case identifier |
| `name` | string | Yes | Display name |
| `lang` | string | Yes | Language code: EN, ES, JP, KO, ZH, FR, PT, ID, or Multi |
| `version` | string | Yes | Semantic version (e.g., "1.0", "2.1") |
| `icon` | string | Yes | 2-3 letter abbreviation for the icon badge |
| `iconColor` | string | Yes | Hex color for the icon badge background |
| `baseUrl` | string | Yes | Base URL of the manga source website |
| `description` | string | Yes | English description (1 line) |
| `descriptionEs` | string | Yes | Spanish description (1 line) |
| `features` | string[] | Yes | List of features (2-4 items) |
| `nsfw` | boolean | Yes | Whether the source has adult content |

## How users add your repo

In the app: **Explore > Extensions > Add Repository**

Enter the URL where your `manifest.json` is hosted. The app will fetch it and display your extensions in the Available tab.

## Example repo URLs

- `https://raw.githubusercontent.com/username/my-manga-sources/main/manifest.json`
- `https://mysite.com/manga-extensions/manifest.json`

## Hosting on GitHub

1. Create a new GitHub repo
2. Add `manifest.json` at the root
3. Users add: `https://raw.githubusercontent.com/YOUR_USER/YOUR_REPO/main/manifest.json`
