# TOTP: Secure your TOTP in local

A Chrome extension for securely storing and generating Time-based One-Time Password (TOTP) authentication codes locally, built with React and TypeScript.

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
npm run build:extension
```

This will create a `build` directory with the compiled extension, ensuring that the runtime chunk is not inlined (which is required for Chrome extensions).

### Packaging the Extension

To create a distributable ZIP file of the extension:

```
npm run package
```

This will build the extension and create a `dist/authenticator-extension.zip` file that can be uploaded to the Chrome Web Store.

### Testing the Extension

To run all tests and code quality checks:

```
npm run test:extension
```

This will run linting, formatting checks, and unit tests to ensure the extension is ready for deployment.

### Loading the Extension in Chrome

1. Build the extension using `npm run build:extension`
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top right)
4. Click "Load unpacked" and select the `build` directory
5. The extension should now appear in your Chrome toolbar

## Available Scripts

- `npm start` - Start the development server
- `npm run build:extension` - Build the extension for Chrome
- `npm run package` - Build and package the extension as a ZIP file
- `npm run test:extension` - Run all tests and code quality checks
- `npm run lint` - Run ESLint to check for code issues
- `npm run lint:fix` - Run ESLint and automatically fix issues
- `npm run format` - Format code using Prettier
- `npm run format:check` - Check if code is properly formatted
- `npm run clean` - Remove build and dist directories

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
