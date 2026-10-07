# PAX Pinny Companion

I'll come up with a non-trademark-infringing name 'soon'.

The original intent of this tool was to enable offline managing and sharing your Pinny Arcade pin collections with friends.  The idea is that in environments where you can't get mobile reception (such as when there's 20,000 people all fighting for timeslots at PAX), you can run this offline or in airplane mode, and share lists you've created with others by having them scan a generated QR code which contains all the required data.

More broadly though it's intended to help facilitate social interactions.  Future features are planned for trade request broadcast and to help introduce traders to each other.

## Running the app

First, `npm install`.  You'll need node 18.19.1 or node 20.  Currently this is unspecific but I'll tighten up the restrictions some time soon.

You'll need assets pin data and image assets to run the app - `npm run build` will pull down the latest data from pinnypals and store it cached locally.

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

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

## Pingo game

Pingo is a separate React/Cloudflare Pages target in this repository. `pingo/index.html` is the entry point, `src/pingo` owns the game, and `vite.pingo.config.ts` builds to `build/pingo`. It reuses the Guess Who pin card component and shared CSS.

- `/` lists games registered in D1. Choosing **Join game** or opening `/?game=GAME` asks the Worker to create and register a board for that game. The resulting `BOARD-YYY?game=GAME` URL reproduces its 5×5 pin layout; the game query is required. Both board creation and verification reject unregistered new-format boards. Players click a square to add or remove a red X. Marks, board ID, game code, player name, and a browser registration ID are saved locally. The game code is fixed for new-format boards. After editing their name, players wait three seconds before `PUT /player` saves their details.
- **Scavenger hunt Mode** on a player board starts a separate photo hunt after confirmation. Its heading reads `Pingo Board BOARD - Scavenger Hunt!` with **New board** beside it; regular boards read `Pingo Board BOARD`. The board's first-opened time is saved locally; the mode accepts only live camera captures taken afterward. Players drag and resize a square around a pin before saving its crop. Cropped photos are stored in that browser's IndexedDB per board and pin. Clicking a saved photo opens its full-size preview; **Cancel** closes it, while **OK** proceeds to the replacement warning before a new camera capture. Photos are not uploaded or shared with other devices; clearing browser storage removes them.
- `/scavenger/GAME` asks for a nickname and assigns a photo hunt board for that game. The browser keeps a random device identifier; D1 stores the game, device identifier, nickname, board code, assignment time, and local calendar day. One board is assigned per device and game until midnight in the device's local time zone. A repeat request returns the same board and shows the daily limit message. The first reported time zone is retained for that device and game. Clearing browser storage creates a new identifier, so this limit is per browser profile rather than a guaranteed physical-device identity.
- `/go` accepts the site admin password, a new game admin password, a 10, 15, 20, or 30 second draw interval, and a candidate pool size in 25-pin increments (default 150). The Worker registers the game and an HMAC verifier for its salted password proof in D1. Its pin pool is the first N usable catalog pins. Both the caller's draw sequence and every board for that game use only this pool. Codes created by this browser are saved in local storage; **Switch to game** opens `/GAME/go`. The caller shows `Game GAME started at hh:mm`, the current pin, five recent pins, and a QR code for `/?game=GAME`. **Next pin now** advances early. Missed draw intervals are caught up in one API request. After the last pin, the caller counts down for five draw intervals, then opens one successor game with the same options and a fresh join code. If an automatic draw fails, it pauses and shows **Retry draw** instead of repeatedly calling the API. A small **(admin)** link opens `/GAME/admin`.
- The browser limits caller requests to one per game every nine seconds and limits caller, verification, and player-list polling together to 5,000 attempts in a rolling 24-hour window per browser profile. An HTTP 429 or 5xx response opens a five-minute browser-wide cooldown. Verification polls at the game's draw interval; verification and player-list polling stop after an error and while their tab is hidden. These browser limits protect against client loops but cannot enforce an account-wide Cloudflare request budget across different browsers or clients. An edge rate limiting rule, if configured, must act before the Worker to prevent blocked requests from consuming Worker invocations.
- `/GAME/admin` contains **Check a board**, **Players**, and the clickable **Call list**, with **Back to Caller page** at the top. `/admin` opens the latest game saved in this browser, or accepts a game code and admin password. Each player links to their board's verification page in a new tab. **Check board** opens a signed snapshot in a new tab.
- `/GAME/verify/BOARD` checks that board against calls from the encoded game start onward. Without an override, the displayed count comes from the game start time at the interval encoded in its game code. The caller and admin URLs record `?pin=N&at=...` so an early manual call and its countdown survive a reload; **Check board** opens a signed `?pin=N&at=...&sig=...` snapshot so the override cannot be forged.
- New game codes use `XXXXXX-YYY`. The six-character prefix contains the reversed low 26 bits of the epoch-second start time; the three-character base-28 suffix packs the pool size in units of 25 and the draw speed in two bits. New board codes use `XXXX-YYY` with the same suffix. The D1 game and board records confirm that a supplied code was actually issued. Earlier six-, seven-, and eight-character games remain readable under their original rules. The call order and early-count override signatures use a server-only signing secret.
- `npm run build:pingo` fetches the current Pinpanion catalog into the Pages output and bundles the Pages advanced-mode `_worker.js`. It also writes `_routes.json` so built JS/CSS, `pins.json`, and direct HTML asset requests bypass the Function and do not consume Worker requests. Dynamic pages and API routes still invoke the Worker. Catalog updates may change boards and calls for existing codes, including games in progress.
- Set Pages secrets `PINGO_ADMIN_PASSWORD` and `PINGO_SIGNING_SECRET` for each deployment. Use independent values for development and production. The site admin password authorizes game creation; each new game has a separate password chosen at creation. The browser derives its salted PBKDF2 proof so the Pages Worker stays within the free CPU limit. The Worker stores an HMAC verifier keyed with the signing secret, serves only the salt at `GET /api/pingo/salt?game=GAME`, and compares proofs for caller, admin, and `GET /player?game=GAME` access. Previously stored raw PBKDF2 hashes are converted to HMAC verifiers when read. Successful caller unlocks are remembered in that tab's session storage per game. The signing secret must never be shared or rotated without migrating these verifiers. `PUT /player` saves the request time and Cloudflare client IP with each registration in D1.
- Create separate D1 databases for the dev and production projects, apply `pingo/players.sql`, `pingo/scavenger-assignments.sql`, and `pingo/games-and-boards.sql` to each with `wrangler d1 execute <database> --file <sql-file> --remote`, and set the database IDs in `pingo/dev/wrangler.jsonc` and `pingo/prod/wrangler.jsonc`. Existing tables with a `(game_code, board_id)` primary key use `pingo/migrate-registration-id.sql` once before deploying this version. `npm run deploy:pingo:dev` deploys to the `pingo-dev` Pages project; `npm run deploy:pingo` targets `pingo`.
