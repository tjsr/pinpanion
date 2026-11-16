# PAX Aus 2026 portal

Static landing page for `https://aus.pinpanion.com/`. The published files are in `dist/`. It has no build step or runtime dependencies.

## Hosting

The source and static assets live in this `pinnysets` repository. Pushes to `main` deploy the site to the `pinpanion-aus` Cloudflare Pages project after the repository checks pass. From the repository root, run `npm run deploy:aus` to publish the contents of `aus_portal/dist` manually. The Cloudflare staging address is `https://pinpanion-aus.pages.dev/`.

The custom domain `aus.pinpanion.com` is attached to that Pages project. Its Cloudflare DNS record should be a CNAME named `aus` pointing to `pinpanion-aus.pages.dev`, replacing the former `custom-domains.chatgpt.site` target. Keep the record DNS-only until Pages reports the custom domain as active. The old `_openai-site-verification.aus` and `_cf-custom-hostname.aus` TXT records belonged to ChatGPT Sites and are not required by this Pages deployment.

The opening contains only “Welcome to PAX Aus 2026” and “Let's play some *games*... for pins!” before the destination cards.

The first two cards feature local copies of artwork from `lionet.au`: the collection image from `/artwork/collection-preview.png` and the Bouquet preview from `/accents/special-bonus.png`. CSS crops the Bouquet preview to the square card while keeping its flower heads visible on narrow screens.

The QR code in `dist/portal-qr.svg` encodes `https://aus.pinpanion.com/` and is generated with OpenCV from the project virtual environment. Regenerate it if the domain changes.

The Bouquet card has an `Info` button that opens a native modal dialog with the owner's pin-earning instructions. The Pingo Scavenger Hunt card and the dialog link directly to the event game at `https://pingo.pinpanion.com/scavenger/33XR4T`. Pingo resolves that six-character game prefix to its registered options. Pinpare and My wishlist still need destination URLs; their cards remain marked `LINK SOON`. Do not replace them with guessed domains.
