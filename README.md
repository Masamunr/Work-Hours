# FlexWeek

A small, local-first personal web app for planning flexible working hours and keeping a simple weekly history.

## Core rules

- Contracted hours: **40 hours per week**
- Normal working days: **Monday to Friday**
- Initial default lunch: **60 minutes**
- Initial default day: **08:00 to 17:00**
- Default start, finish and lunch can be changed in the app and are then used for new weeks
- Working time = finish time − start time − lunch
- Start, finish and lunch can be changed independently for each day
- The app warns when the 40-hour weekly allowance is reached or exceeded
- Absence can be logged as a number of hours and can optionally count toward the weekly contractual total
- Historical weeks are stored automatically in the browser

## Privacy

FlexWeek has no account, backend, analytics, advertising or remote data storage.

Data is stored only in the browser's `localStorage`. Clearing browser/site data will remove saved history.


## Backup and restore

- **Back up now** downloads a single JSON file containing all saved weeks, absences, defaults and app settings.
- **Restore backup** opens the device file picker; selecting a valid FlexWeek backup restores the records.
- A visible reminder appears after 15 days without a backup.
- At 30+ days, or when records have never been backed up, the warning becomes prominent.
- Backup reminders never block use of the app.

## Data persistence

FlexWeek stores its records in browser `localStorage`.

- Clearing ordinary browsing history alone will usually **not** delete FlexWeek records.
- Clearing site data, cookies/storage, app data, or using a browser cleanup option that removes site storage **can delete the records**.
- Private/incognito browsing should not be used for permanent records.
- Use the built-in backup/restore feature if you want durable history without adding an account or cloud database.

## GitHub Pages

This project is intentionally plain HTML/CSS/JavaScript, so it can be hosted directly with GitHub Pages.

1. Create a GitHub repository.
2. Add `index.html`, `styles.css` and `app.js` to the repository root.
3. In GitHub, open **Settings → Pages**.
4. Set the deployment source to the `main` branch and `/ (root)`.
5. Save.

GitHub will then provide the Pages URL.

## Files

- `index.html` — app structure
- `styles.css` — responsive light/dark styling
- `app.js` — calculations, week storage, history and absence logic

## Current limitations

Because history is browser-local, it does not automatically sync between a phone and computer. A future version could add manual JSON export/import without introducing accounts or cloud storage.


## Install as an app

FlexWeek includes a web-app manifest, app icons and an offline service worker.

After publishing with GitHub Pages:

1. Open FlexWeek in Chrome on Android.
2. Open the browser menu.
3. Choose **Add to Home screen** or **Install app**.
4. Confirm.

FlexWeek will then use its own icon and open in a standalone app-style window. After the first successful load it can also open offline.


## v5 reliability change

FlexWeek v5 deliberately removes the service-worker/offline cache used in the previous build.
That cache could leave the browser displaying a mixture of old and new files after a GitHub Pages update.
The app remains installable as a home-screen web app, but now prioritises reliable updates over offline caching.
The v5 page also unregisters and clears old FlexWeek caches on first load.
