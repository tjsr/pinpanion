# PAX Pinny Companion

I'll come up with a non-trademark-infringing name 'soon'.

This project is an offline tool for managing and sharing your Pinny Arcade pin collections with friends.  The idea is that in environments where you can't get mobile reception (such as when there's 20,000 people all fighting for timeslots at PAX), you can run this offline or in airplane mode, and share lists you've created with others by having them scan a generated QR code which contains all the required data.

## Running the app

You'll need assets pin data and image assets to run the app - `npm run build` will pull down the latest data from pinnypals and store it cached locally.

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Contact

This is a free app developed by Tim Rowe <tim@tjsr.id.au>.  It is designed to work in conjunction with pinnypals.com and pulls pin data from that as a source.

Want to make a donation?  Maybe just find me at PAX and donate a fodder pin.

## Known bugs and known 'things that need to change'

- Due to the app re-rendering ~1400 pin elements every time you modify the lanyard, and no memoization implemented just yet, there can be small delays (~5 seconds?) where it feels like nothing has happened.
- Req:  Add collection/lanyard functionality (ie, not wanted/available).  To-do - intent would actually be for a 'collection' to be a separate lanyard object but this might need some usability thinking, or ability to change A/W button to a single C for that lanyard?
- Planned: personal pin values to enable filting list to 'high' wants.
- TODO: Changing the search criteria needs to disable to 'selected' lanyard display, otherwise it's not obvious that the search has updated.
- TODO (in progress): Lanyards visited as an entrypoint need to be read-only, with info that the user needs to create a new lanyard to modify it, if they are not the creator.
- TODO: Cloud-synced data/lanyards (currently, data is stored in localstorage only, by design, and only shared via URL or QR code)
- Pin width needs to scale by device width/resolution.
- Output QR code when in print mode.
- Hide menu when in print mode.
- Future plans:  Push notifications of for searching for or pins that someone present has available/wants; curated using a special algo to make it relevant and not spammy.

## Contributing

This project is intended that if you're a pin community member you can contribute to the development if you wish.  In particular, junior developers are encouraged to get involved, using this as a good project to help learn and prove skills in a project you can actually point to for a resume, while having PRs supervised by other experienced developers.  PRs are welcome.