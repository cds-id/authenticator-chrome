# TOTP: Secure your TOTP in local

<p align="center">
  <img src="public/base.png" alt="TOTP Authenticator Logo" width="128" height="128">
</p>

A Chrome extension for securely storing and generating Time-based One-Time Password (TOTP) authentication codes locally, built with React and TypeScript.

## Features

- Add and manage multiple authentication tokens
- Automatic code generation with countdown timer
- Smart filtering to show only relevant codes for the current website
- Import and export TOTP URIs for easy migration
- Clean, user-friendly interface
- Secure storage of authentication secrets using Chrome's sync storage
- All data stored locally - no external servers involved

## How to Use

### Adding TOTP Codes

1. Click the extension icon in your Chrome toolbar
2. Click the "Add Code" button
3. Enter the issuer name (e.g., "GitHub"), account name (e.g., "username"), and secret key
4. Click "Add" to save the TOTP code

### Importing TOTP URIs

1. Click the "Import TOTP URIs" button
2. Select a text file containing TOTP URIs (one per line)
3. The extension will validate and import all valid URIs

### Exporting TOTP URIs

1. Click the "Export TOTP URIs" button
2. A text file containing all your TOTP URIs will be downloaded

### Smart Filtering

When you visit a website, the extension will automatically:
- Show only TOTP codes that match the current website's domain
- Display all codes if no matches are found
- Allow you to toggle between filtered view and all codes view

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

## Security

This extension stores all your TOTP secrets locally in Chrome's sync storage. No data is ever sent to external servers. Your authentication codes are generated entirely within your browser.

## Contact

For questions, issues, or feature requests, please contact:
- Email: [info@ciptadusa.com](mailto:info@ciptadusa.com)
- GitHub: [https://github.com/cds-id/authenticator-chrome](https://github.com/cds-id/authenticator-chrome)

## License

MIT
