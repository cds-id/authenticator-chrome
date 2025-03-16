# Authenticator React Chrome Extension

A Chrome extension for generating and managing two-factor authentication (2FA) codes, built with React and TypeScript.

## Features

- Add and manage multiple authentication tokens
- Automatic code generation with countdown timer
- Clean, user-friendly interface
- Secure storage of authentication secrets using Chrome's sync storage

## Development

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app) and configured for Chrome extension development using CRACO.

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Chrome browser

### Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm start
   ```

### Building the Extension

To build the extension for production:

```
npm run build
```

This will create a `build` directory with the compiled extension.

### Loading the Extension in Chrome

1. Build the extension using `npm run build`
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top right)
4. Click "Load unpacked" and select the `build` directory
5. The extension should now appear in your Chrome toolbar

## Project Structure

- `public/manifest.json` - Chrome extension manifest file
- `src/App.tsx` - Main application component
- `src/types/chrome.d.ts` - TypeScript definitions for Chrome API

## Future Improvements

- Implement actual TOTP (Time-based One-Time Password) algorithm
- Add QR code scanning for easy token addition
- Support for backup and restore of tokens
- Dark mode support
- Custom token icons

## License

MIT
