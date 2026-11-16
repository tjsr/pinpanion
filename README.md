# PAX Pinny Companion

I'll come up with a non-trademark-infringing name 'soon'.

The original intent of this tool was to enable offline managing and sharing your Pinny Arcade pin collections with friends.  The idea is that in environments where you can't get mobile reception (such as when there's 20,000 people all fighting for timeslots at PAX), you can run this offline or in airplane mode, and share lists you've created with others by having them scan a generated QR code which contains all the required data.

More broadly though it's intended to help facilitate social interactions.  Future features are planned for trade request broadcast and to help introduce traders to each other.

## Running the app

First, `npm install`. You will need Node.js 24 or later and npm 11.5 or later.

You'll need pin data and image assets to run the app. `npm run build` retrieves the latest data from Pinnypals and stores the generated assets locally before building the site.

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

## Deployment

Pinpanion is deployed as a static site with AWS Amplify. Connect Amplify to the repository and use the committed [`amplify.yml`](amplify.yml) build specification. Configure an `IMAGES_CACHE_DIR` environment variable in the Amplify app (for example, `images`) so image downloads have a writable cache directory.

On each deployment, Amplify runs the following workflow:

1. Installs the locked dependencies with `npm ci`.
2. Runs `npm run download -- $IMAGES_CACHE_DIR` to refresh the pin database and image cache.
3. Runs the test suite, copies the cached images into `public/imgs`, and runs the production build.
4. Uploads the resulting `build/` directory as the Amplify deployment artifact. The same directory is configured as the artifact source in `amplify.yml`.

The build requires outbound access to the Pinnypals API and image CDN. A failed download or test fails the deployment, preventing an incomplete asset set from being published.

### Refreshing and publishing pin data locally

To make a release outside Amplify, run:

```sh
npm ci
npm run build
```

Upload the contents of `build/` to any static hosting provider. Do not upload `public/` directly: Vite produces the deployable, optimized site in `build/`.

## Pin database and image refresh

The refresh script, `src/utils/pindownload.ts`, is invoked by `npm run download` and as part of `npm run build`. It does the following:

- Fetches the current item-data response from the Pinnypals v3 API (`https://api.pinnypals.com/api/item-data`).
- Saves the unmodified upstream response to `public/pinnypalpins.json` for troubleshooting and converts it to Pinpanion's browser data format at `public/pins.json`.
- Downloads every referenced pin image to the requested cache directory. It first attempts Pinpanion's image host, then falls back to the Pinnypals CDN when an image is unavailable there.
- Reuses files already present in the image cache, then copies that cache into `public/imgs` for inclusion in the final build.

At runtime the app loads the deployed `pins.json` from the same static site. It does not query Pinnypals from the browser, so visitors get the consistent, offline-capable database that was bundled into the deployed build. Run a new deployment whenever the database needs updating.

Useful refresh options:

- `IMAGE_DOWNLOAD_CONCURRENCY=<number>` caps parallel image downloads; without it, downloads are unrestricted.
- `SKIP_ALL_IMAGES=true` refreshes JSON data without downloading images. This is useful only for data-focused development or tests, not a complete production deployment.
- `PINNYPALS_VERSION` selects an upstream format; the production default is v3.

## Contact

This is a free app developed by Tim Rowe <tim@tjsr.id.au>.  It is designed to work in conjunction with pinnypals.com and pulls pin data from that as a source.

Want to make a donation?  Maybe just find me at PAX and donate a fodder pin.

## Known bugs and known 'things that need to change'

- Req:  Add collection/lanyard functionality (ie, not wanted/available).  To-do - intent would actually be for a 'collection' to be a separate lanyard object but this might need some usability thinking, or ability to change A/W button to a single C for that lanyard?
- Planned: personal pin values to enable filting list to 'high' wants.
- TODO: Changing the search criteria needs to disable to 'selected' lanyard display, otherwise it's not obvious that the search has updated.
- TODO (in progress): Lanyards visited as an entrypoint need to be read-only, with info that the user needs to create a new lanyard to modify it, if they are not the creator.
- TODO: Cloud-synced data/lanyards (currently, data is stored in localstorage only, by design, and only shared via URL or QR code)
- Pin width needs to scale by device width/resolution automatically.  Currently possible using display size option.
- Future plans:  Push notifications of for searching for or pins that someone present has available/wants; curated using a special algo to make it relevant and not spammy.

## Contributing

This project is intended that if you're a pin community member you can contribute to the development if you wish.  In particular, junior developers are encouraged to get involved, using this as a good project to help learn and prove skills in a project you can actually point to for a resume, while having PRs supervised by other experienced developers.  PRs are welcome.
## Guess Who game

Guess Who is a separate static Pages target in this repository. Its entry point is `guess/index.html`, the game code is in `src/guess`, and `vite.guess.config.ts` builds to `build/guess`. It uses the shared PinInfo component, pin CSS, and Material UI controls already used by the main app. Gameplay stays in browser memory; refreshing starts again.

- `npm run build:guess` builds the game and fetches the current `https://pinpanion.com/pins.json` into the deploy output. The pin feed does not permit cross-origin browser requests, so the deployed game reads its same-origin snapshot at `/pins.json`.
- `npm run deploy:guess:dev` deploys to the `pinpanion-guess-dev` Pages project at `https://pinpanion-guess-dev.pages.dev`.
- `npm run deploy:guess` deploys to the `pinpanion-guess` Pages project at `https://pinpanion-guess.pages.dev`.

Both deploy commands build first. Updating the pin feed can change the boards associated with an existing game code, which is acceptable for short live games.

Pushes to `main` run the GitHub Actions test and build workflow, then deploy Guess Who, the PAX Aus portal, and Pingo to their production Cloudflare Pages projects if every check passes. Configure the repository Actions secrets `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` for the deployment job. The `deploy:guess:dev` and `deploy:pingo:dev` scripts continue to target the dev Pages projects.

## PAX Aus portal

The PAX Aus landing page source and assets are tracked in [`aus_portal/`](aus_portal/). Its static deployment files are in `aus_portal/dist`; `npm run deploy:aus` publishes them to the `pinpanion-aus` Cloudflare Pages project. See [`aus_portal/README.md`](aus_portal/README.md) for the custom-domain DNS record.

## Pingo game

Pingo is a separate React/Cloudflare Pages target in this repository. `pingo/index.html` is the entry point, `src/pingo` owns the game, and `vite.pingo.config.ts` builds to `build/pingo`. It reuses the Guess Who pin card component and shared CSS.

- `/` lists games registered in D1. Choosing **Join game** or opening `/?game=GAME` asks the Worker to create and register a board for that game. The resulting `BOARD-YYY?game=GAME` URL reproduces its 5×5 pin layout; the game query is required. Both board creation and verification reject unregistered new-format boards. Players click a square to add or remove a red X. Marks, board ID, game code, player name, and a browser registration ID are saved locally. The game code is fixed for new-format boards. After editing their name, players wait three seconds before `PUT /player` saves their details.
- **Scavenger hunt Mode** on a player board starts a separate photo hunt after confirmation. Its heading reads `Pingo Board BOARD - Scavenger Hunt!` with **New board** beside it; regular boards read `Pingo Board BOARD`. The board's first-opened time is saved locally; the mode accepts only live camera captures taken afterward. Players drag and resize a square around a pin before saving its crop. Cropped photos are stored in that browser's IndexedDB per board and pin. Clicking a saved photo opens its full-size preview; **Cancel** closes it, while **OK** proceeds to the replacement warning before a new camera capture. Photos are not uploaded or shared with other devices; clearing browser storage removes them.
- `/scavenger/GAME` asks for a nickname and assigns a photo hunt board for that game. The browser keeps a random device identifier; D1 stores the game, device identifier, nickname, board code, assignment time, and local calendar day. One board is assigned per device and game until midnight in the device's local time zone. A repeat request returns the same board and shows the daily limit message. The first reported time zone is retained for that device and game. Clearing browser storage creates a new identifier, so this limit is per browser profile rather than a guaranteed physical-device identity.
- `/go` accepts the site admin password, a new game admin password, a candidate pool size in 25-pin increments (default 150), and an optional **Scavenger Hunt Only** checkbox. Ordinary games also choose a 10, 15, 20, or 30 second draw interval. The Worker registers the game and an HMAC verifier for its salted password proof in D1. A hunt-only game's join links lead to `/scavenger/GAME`; ordinary board creation is rejected by the Worker, and issued boards open in scavenger hunt mode. Hunt-only games open the admin page after creation and have no caller display, called pins, board verification against calls, or automatic rollover. Their admin page shows the join QR code, game information, and players. For ordinary games, the caller's draw sequence and every board use the first N usable catalog pins. Codes created by this browser are saved in local storage; **Switch to game** opens the caller or redirects hunt-only games to their admin page. The ordinary caller shows `Game GAME started at hh:mm`, the current pin, five recent pins, and a join QR code. **Next pin now** advances early. Missed draw intervals are caught up in one API request. After the last pin, the caller counts down for five draw intervals, then opens one successor game with the same options and a fresh join code. If an automatic draw fails, it pauses and shows **Retry draw** instead of repeatedly calling the API. A small **(admin)** link opens `/GAME/admin`.
- The browser limits caller requests to one per game every nine seconds and limits caller, verification, and player-list polling together to 5,000 attempts in a rolling 24-hour window per browser profile. An HTTP 429 or 5xx response opens a five-minute browser-wide cooldown. Verification polls at the game's draw interval; verification and player-list polling stop after an error and while their tab is hidden. These browser limits protect against client loops but cannot enforce an account-wide Cloudflare request budget across different browsers or clients. An edge rate limiting rule, if configured, must act before the Worker to prevent blocked requests from consuming Worker invocations.
- **Manage game** in the top navigation opens `/manage` (`/admin` also opens it). Enter the six-character prefix of a registered game (or its full code), the system admin password, and that game's admin password to open its admin page. The Worker looks up the saved suffix options from the prefix before checking the game password. Older games use the system admin password for both fields. Ordinary games show **Check a board**, **Players**, and the clickable **Call list**, with **Back to Caller page** at the top. Their player links open board verification in a new tab. Hunt-only games show the join QR code and players' hunt boards without caller controls or call verification.
- `/GAME/verify/BOARD` checks that board against calls from the encoded game start onward. Without an override, the displayed count comes from the game start time at the interval encoded in its game code. The caller and admin URLs record `?pin=N&at=...` so an early manual call and its countdown survive a reload; **Check board** opens a signed `?pin=N&at=...&sig=...` snapshot so the override cannot be forged.
- New game codes use `XXXXXX-YYY`. The six-character prefix identifies the registered game; the three-character base-28 suffix stores its pool size in units of 25 and its draw speed in two bits. D1 resolves a prefix to the full issued code before creating boards or checking its admin password. Game information is stored by prefix. New board codes use `XXXX-YYY` with the saved suffix. The D1 game and board records confirm that a supplied code was actually issued. Earlier six-, seven-, and eight-character games remain readable under their original rules when no registered game uses that prefix. The call order and early-count override signatures use a server-only signing secret.
- `npm run build:pingo` fetches the current Pinpanion catalog into the Pages output and bundles the Pages advanced-mode `_worker.js`. It also writes `_routes.json` so built JS/CSS, `pins.json`, and direct HTML asset requests bypass the Function and do not consume Worker requests. Dynamic pages and API routes still invoke the Worker. Catalog updates may change boards and calls for existing codes, including games in progress.
- Set Pages secrets `PINGO_ADMIN_PASSWORD` and `PINGO_SIGNING_SECRET` for each deployment. Use independent values for development and production. The site admin password authorizes game creation; each new game has a separate password chosen at creation. The browser derives its salted PBKDF2 proof so the Pages Worker stays within the free CPU limit. The Worker stores an HMAC verifier keyed with the signing secret, serves only the salt at `GET /api/pingo/salt?game=GAME`, and compares proofs for caller, admin, and `GET /player?game=GAME` access. Previously stored raw PBKDF2 hashes are converted to HMAC verifiers when read. Successful caller unlocks are remembered in that tab's session storage per game. The signing secret must never be shared or rotated without migrating these verifiers. `PUT /player` saves the request time and Cloudflare client IP with each registration in D1.
- Create separate D1 databases for the dev and production projects, apply `pingo/players.sql`, `pingo/scavenger-assignments.sql`, `pingo/games-and-boards.sql`, and `pingo/game-info.sql` to each with `wrangler d1 execute <database> --file <sql-file> --remote`. Set their IDs only in `PINGO_DEV_D1_DATABASE_ID` and `PINGO_PROD_D1_DATABASE_ID` environment variables (the production CI job receives the latter from the `PINGO_PROD_D1_DATABASE_ID` repository variable). Existing tables with a `(game_code, board_id)` primary key use `pingo/migrate-registration-id.sql` once. Existing `games` tables use `pingo/migrate-scavenger-hunt-only.sql` once before deploying the hunt-only setting; new databases already have the column in `pingo/games-and-boards.sql`. `npm run deploy:pingo:dev` deploys to the `pingo-dev` Pages project; `npm run deploy:pingo` targets `pingo`.

## Cloud lanyard storage

The main Cloudflare Worker stores lanyards in the `lanyards` D1 table. Create separate databases for dev and production with `wrangler d1 create pinpanion-lanyards-dev` and `wrangler d1 create pinpanion-lanyards`, then set the returned IDs only in `PINPANION_DEV_LANYARDS_D1_DATABASE_ID` and `PINPANION_PROD_LANYARDS_D1_DATABASE_ID` before `npm run deploy:dev` or `npm run deploy`. Apply `worker/migrations/0001_create_lanyards.sql` to each database with `wrangler d1 migrations apply <database-name> --remote`. The app continues to keep local copies and embeds a sparse pin-data snapshot in shared links; `?id=<lanyard-id>` lets the Worker provide the latest saved copy when available.
