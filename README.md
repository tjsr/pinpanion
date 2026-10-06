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

- `/BOARD` generates a repeatable 5×5 board from a four-character code. `/` makes a random board code. A board may be created at any point in a game. Players click a square to add or remove a red X; their marks are saved in that browser for the board and, when entered, the game code. The board saves its ID, game code, player name, and a browser registration ID in local storage. The registration ID keeps players separate if a four-character board code repeats. Entering the game code shows `Game GAME started at hh:mm`. After the player edits either field, the board waits three seconds without further edits, then sends valid details to `PUT /player`.
- **Scavenger hunt Mode** on a player board starts a separate photo hunt after confirmation. Its heading reads `Pingo Board BOARD - Scavenger Hunt!` with **New board** beside it; regular boards read `Pingo Board BOARD`. The board's first-opened time is saved locally; the mode accepts only live camera captures taken afterward. Players drag and resize a square around a pin before saving its crop. Cropped photos are stored in that browser's IndexedDB per board and pin. Clicking a saved photo opens its full-size preview; **Cancel** closes it, while **OK** proceeds to the replacement warning before a new camera capture. Photos are not uploaded or shared with other devices; clearing browser storage removes them.
- `/scavenger/GAME` asks for a nickname and assigns a photo hunt board for that game. The browser keeps a random device identifier; D1 stores the game, device identifier, nickname, board code, assignment time, and local calendar day. One board is assigned per device and game until midnight in the device's local time zone. A repeat request returns the same board and shows the daily limit message. The first reported time zone is retained for that device and game. Clearing browser storage creates a new identifier, so this limit is per browser profile rather than a guaranteed physical-device identity.
- `/go` accepts the admin password and creates a new timestamp-derived game code. Before creation, the admin chooses a fixed 10, 15, 20, or 30 second draw interval. Codes created by this browser are saved in local storage; when any exist, **Switch to game** appears beside **Run a game** in the top bar. Choosing one opens `/GAME/go`. `/GAME/go` is the caller. Its single heading shows `Game GAME started at hh:mm`; the current pin heading includes its position in the call list. The screen fits the viewport without page scrolling: the QR and current pin expand into the available space, with five uniformly sized recent pin cards along the bottom. Scanning the QR code opens `/?game=GAME`, which creates a timestamp-derived board code when the player loads the page, then shows that game's start time on the board. The current card, countdown, and **Next pin now** button occupy fixed grid rows so the button stays in place when pins change. **Next pin now** advances early. A small **(admin)** link opens `/GAME/admin` beside the attribution in the footer.
- `/GAME/admin` contains **Check a board**, **Players**, and the clickable **Call list**, with **Back to Caller page** at the top. `/admin` opens the latest game saved in this browser, or accepts a game code and admin password. Each player links to their board's verification page in a new tab. **Check board** opens a signed snapshot in a new tab.
- `/GAME/verify/BOARD` checks that board against calls from the encoded game start onward. Without an override, the displayed count comes from the game start time at the interval encoded in its game code. The caller and admin URLs record `?pin=N&at=...` so an early manual call and its countdown survive a reload; **Check board** opens a signed `?pin=N&at=...&sig=...` snapshot so the override cannot be forged.
- New six-character game codes contain the reversed low 26 bits of the epoch-second timestamp plus two draw-speed bits in base 28; the final character's low two bits select 10, 15, 20, or 30 seconds. Decoding restores the most recent matching timestamp at or before the current time, so a code identifies its original game for about 776 days. Seven-character codes from older games remain valid at 30 seconds, and earlier eight-character timed codes remain valid at their encoded speed. The call order and early-count override signatures use a server-only signing secret. Neither the password nor unrevealed calls are included in public assets.
- `npm run build:pingo` fetches the current Pinpanion catalog into the Pages output and bundles the Pages advanced-mode `_worker.js`. Catalog updates may change boards and calls for existing codes, including games in progress.
- Set Pages secrets `PINGO_ADMIN_PASSWORD` and `PINGO_SIGNING_SECRET` for each deployment. Use independent values for development and production. The admin password is needed to create a game or open its caller page; after a successful unlock, the caller keeps it in that tab's session storage so a refresh reopens the game without another prompt. The signing secret must never be shared. Admins may also `GET /player` with `Authorization: Bearer <admin password>` to list registered player names, game codes, board IDs, and update times. `PUT /player` saves the request time and Cloudflare client IP with each registration in D1.
- Create separate D1 databases for the dev and production projects, apply `pingo/players.sql` and `pingo/scavenger-assignments.sql` to each with `wrangler d1 execute <database> --file <sql-file> --remote`, and set the database IDs in `pingo/dev/wrangler.jsonc` and `pingo/prod/wrangler.jsonc`. Existing tables with a `(game_code, board_id)` primary key use `pingo/migrate-registration-id.sql` once before deploying this version. `npm run deploy:pingo:dev` deploys to the `pingo-dev` Pages project; `npm run deploy:pingo` targets `pingo`. The deploy helper uses an isolated Pages configuration so the repository's main Worker configuration is untouched.
