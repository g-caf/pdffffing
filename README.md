# PDF Editor

A free, client-side PDF editor that runs entirely in your browser. No files are uploaded to any server - all processing happens locally on your device.

## Features

- Combine multiple PDFs into one document
- Add text to PDF pages
- Navigate through PDF pages
- Download edited PDFs
- Clean, minimal black and white interface

## Tech Stack

- **Frontend**: Svelte + Vite
- **Backend**: Express (static file serving only)
- **PDF Libraries**:
  - pdf-lib (PDF manipulation)
  - PDF.js (PDF rendering)

## Privacy

All PDF processing happens client-side in your browser. Files are never uploaded to a server and are not stored anywhere.

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run production server
npm start
```

## Deployment

This application can be deployed to any static hosting service or with the included Express server on platforms like Render, Heroku, or Railway.

## License

MIT
