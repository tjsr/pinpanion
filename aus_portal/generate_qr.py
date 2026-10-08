"""Regenerate the portal QR code with the repository's OpenCV environment."""

from pathlib import Path

import cv2
import numpy as np


URL = "https://aus.pinpanion.com/"
OUTPUT = Path(__file__).with_name("dist") / "portal-qr.svg"


def main() -> None:
    qr = cv2.QRCodeEncoder_create().encode(URL)
    # OpenCV includes the required quiet zone; keep every module in the SVG.
    size = qr.shape[0]
    if qr.shape != (size, size):
        raise ValueError("QR code must be square")
    rectangles: list[str] = []
    for y, row in enumerate(qr):
        start = None
        for x in range(size + 1):
            dark = x < size and row[x] < 128
            if dark and start is None:
                start = x
            elif not dark and start is not None:
                rectangles.append(f"M{start} {y}h{x - start}v1H{start}z")
                start = None
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" '
        'role="img" aria-label="QR code for aus.pinpanion.com">'
        f'<path fill="#000" d="{"".join(rectangles)}"/></svg>\n'
    )
    OUTPUT.write_text(svg, encoding="utf-8")

    # Validate the generated matrix independently of the markup.
    enlarged = cv2.resize(qr, (size * 12, size * 12), interpolation=cv2.INTER_NEAREST)
    decoded, _, _ = cv2.QRCodeDetector().detectAndDecode(np.asarray(enlarged))
    if decoded != URL:
        raise ValueError(f"QR validation failed: {decoded!r}")
    print(f"Wrote {OUTPUT.name}: {size}×{size} modules, decodes to {decoded}")


if __name__ == "__main__":
    main()
