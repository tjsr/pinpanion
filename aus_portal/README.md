# PAX Aus 2026 portal

Static landing page for `https://aus.pinpanion.com/`. The published files are in `dist/`. It has no build step or runtime dependencies.

The opening contains only “Welcome to PAX Aus 2026” and “Let's play some *games*... for pins!” before the destination cards.

The first two cards feature local copies of artwork from `lionet.au`: the collection image from `/artwork/collection-preview.png` and the Bouquet preview from `/accents/special-bonus.png`. CSS crops the Bouquet preview to the square card while keeping its flower heads visible on narrow screens.

The QR code in `dist/portal-qr.svg` encodes `https://aus.pinpanion.com/` and is generated with OpenCV from the project virtual environment. Regenerate it if the domain changes.

The Bouquet card has an `Info` button that opens a native modal dialog with the owner's pin-earning instructions. The Pingo Scavenger Hunt card and the dialog link directly to the event board at `https://pingo.pinpanion.com/scavenger/HT2KTD/`. Pinpare and My wishlist still need destination URLs; their cards remain marked `LINK SOON`. Do not replace them with guessed domains.
