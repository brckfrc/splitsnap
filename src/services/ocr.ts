/**
 * On-device OCR service — wraps expo-text-extractor (Apple Vision on iOS).
 * extractReceiptText returns the full recognised text as a single string
 * (lines joined by \n) ready to feed into receipt-parse.ts.
 *
 * The package is installed but the native module is only available in a
 * development build (not Expo Go). In the simulator, Apple Vision works
 * for images captured from the photo library.
 */

import * as TextExtractor from 'expo-text-extractor';

/**
 * Runs on-device OCR on the image at `imageUri` and returns the recognised
 * text. Throws if OCR is not supported on this device or extraction fails.
 */
export async function extractReceiptText(imageUri: string): Promise<string> {
  if (!TextExtractor.isSupported) {
    throw new Error('OCR bu cihazda desteklenmiyor.');
  }
  const lines = await TextExtractor.extractTextFromImage(imageUri);
  return lines.join('\n');
}
