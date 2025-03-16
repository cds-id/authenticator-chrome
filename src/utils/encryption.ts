import CryptoJS from 'crypto-js';

/**
 * Encrypts data using AES encryption with the provided password as the key
 * @param data - The data to encrypt (object or string)
 * @param password - The password to use as the encryption key
 * @returns The encrypted string
 */
export const encryptData = (data: any, password: string): string => {
  // Convert object to string if needed
  const dataString = typeof data === 'string' ? data : JSON.stringify(data);
  return CryptoJS.AES.encrypt(dataString, password).toString();
};

/**
 * Decrypts an encrypted string using the provided password
 * @param encryptedData - The encrypted string to decrypt
 * @param password - The password used as the decryption key
 * @returns The decrypted data (parsed as JSON if it was an object)
 */
export const decryptData = (encryptedData: string, password: string): any => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, password);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

    // Try to parse as JSON, return as string if it fails
    try {
      return JSON.parse(decryptedString);
    } catch (e) {
      return decryptedString;
    }
  } catch (error) {
    // Log error but don't expose details
    throw new Error('Invalid password or corrupted data');
  }
};

/**
 * Validates if a password can successfully decrypt the test data
 * @param encryptedTestData - Encrypted test data
 * @param password - Password to validate
 * @returns True if the password can decrypt the data, false otherwise
 */
export const validatePassword = (encryptedTestData: string, password: string): boolean => {
  try {
    decryptData(encryptedTestData, password);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Creates a test string that can be used to validate the password later
 * @param password - The password to test
 * @returns Encrypted test string
 */
export const createPasswordTest = (password: string): string => {
  return encryptData('VALID_PASSWORD_TEST', password);
};
