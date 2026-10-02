# PAX Pinny Companion

I'll come up with a non-trademark-infringing name 'soon'.

The original intent of this tool was to enable offline managing and sharing your Pinny Arcade pin collections with friends.  The idea is that in environments where you can't get mobile reception (such as when there's 20,000 people all fighting for timeslots at PAX), you can run this offline or in airplane mode, and share lists you've created with others by having them scan a generated QR code which contains all the required data.

More broadly though it's intended to help facilitate social interactions.  Future features are planned for trade request broadcast and to help introduce traders to each other.

## Running the app

First, `npm install`. You will need Node.js 22.18 or later and npm 11.5 or later.

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
