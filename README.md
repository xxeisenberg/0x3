# 0x3 // hex editor

An in-browser hex viewer[only first 512 bytes tho] and image corrupter built for #3am.

You can pick one of the built-in samples or drop your own image to inspect and mess with the raw scanline bytes (after the `0xFFDA` marker). Press `Space` to randomly corrupt bytes or click individual hex values to nudge them by `+1` and watch the image fall apart in real time without breaking the file header.

## Demo
[Live Demo](https://3am-0x3.vercel.app/)

## Screenshot
<img width="1884" height="1002" alt="Screenshot" src="https://github.com/user-attachments/assets/8cb6301a-66b7-4b7e-bf4d-6985696a5d38" />

## Tools / Technologies Used
- HTML, CSS, Vanilla JavaScript
- `Uint8Array` / `ArrayBuffer` / `Blob` for editing the raw binary data in the browser
- HTML5 Canvas API (converts dropped PNG/WebP files into JPEGs first so they can be glitched)

## Controls

- `Space` - inject a batch of random bit-flips
- `R` - reset to the original file
- `Click` on any byte - increment value manually
- `Export` - download the corrupted binary

## Development Setup
No frameworks or dependencies needed. you just need to run it on a local server instead of opening `index.html` directly from your file explorer:

1. Clone the repo:
   ```bash
   git clone https://github.com/xxeisenberg/0x3
   cd 0x3
   ```
2. Start a local server (or use the Live Server extension in VS Code):
   ```bash
   npx serve .
   # or with python:
   python3 -m http.server 8000
   ```
3. Open `http://localhost:8000` in your browser.
