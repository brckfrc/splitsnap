/**
 * Receipt image upload / signed-URL helpers.
 * Upload happens at expense-save time (not at capture), so no orphan objects
 * accumulate if the user cancels.
 *
 * Storage path: receipts/{groupId}/{timestamp}_{random}.jpg
 * Bucket: private → reads always via createSignedUrl.
 */

import { decode as decodeBase64 } from 'base64-arraybuffer';
import * as ImageManipulator from 'expo-image-manipulator';

import { supabase } from '@/lib/supabase';

const BUCKET = 'receipts';
/** Maximum longest dimension before upload (keeps files small, OCR resolution fine). */
const MAX_DIMENSION = 1600;
/** JPEG quality for the resized image. */
const JPEG_QUALITY = 0.7;
/** Signed URL validity in seconds (1 hour). */
const SIGNED_URL_TTL = 60 * 60;

/** Generates a short unique filename safe for storage paths. */
function generateFilename(): string {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).substring(2, 8);
  return `${ts}_${rnd}.jpg`;
}

/**
 * Resize the image to MAX_DIMENSION × JPEG_QUALITY, upload to the receipts
 * bucket, and return the storage path (not a public URL).
 *
 * The body must be an ArrayBuffer, not a Blob: supabase-js wraps a Blob in a
 * FormData, and React Native's FormData can only serialise `{ uri, name, type }`
 * parts — a Blob is spread into a plain object, so the request goes out without
 * the actual image bytes and the stored object ends up unusable.
 *
 * Throws if the upload fails — caller should catch and decide whether to
 * proceed without a receipt or surface the error.
 */
export async function uploadReceipt(localUri: string, groupId: string): Promise<string> {
  // Resize to reduce storage size while preserving OCR-readable quality
  const resized = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );

  if (!resized.base64) throw new Error('receipt_encode_failed');
  const bytes = decodeBase64(resized.base64);
  if (bytes.byteLength === 0) throw new Error('receipt_empty');

  const storagePath = `${groupId}/${generateFilename()}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, bytes, { contentType: 'image/jpeg', upsert: false });

  if (error) throw new Error(error.message);
  return storagePath;
}

/**
 * Returns a temporary signed URL for the given storage path, or null if the
 * path is missing / the call fails. Used to display receipt thumbnails.
 */
export async function getReceiptSignedUrl(storagePath: string | null | undefined): Promise<string | null> {
  if (!storagePath) return null;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
