# mungmunggames.com

GitHub Pages site for Mungmung Games.

- `app-ads.txt` is shared by every game (one line per ad network account).
- Each game has its own folder: `<game>/index.html` (store Support URL) and `<game>/privacy.html` (store Privacy Policy URL).
- New game: copy `stackbloom/`, edit the text and the data the game handles, add it to the list in `index.html`.
- Per-game theme: add a class on <body> (e.g. `neon` for TapShield) and override the color tokens in `style.css`.
