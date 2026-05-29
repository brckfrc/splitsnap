/**
 * Receipt image upload / signed-URL helpers.
 * Upload happens at expense-save time (not at capture), so no orphan objects
 * accumulate if the user cancels.
 *
 * Storage path: receipts/{groupId}/{timestamp}_{random}.jpg
 * Bucket: private → reads always via createSignedUrl.
 */

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
 * Throws if the upload fails — caller should catch and decide whether to
 * proceed without a receipt or surface the error.
 */
export async function uploadReceipt(localUri: string, groupId: string): Promise<string> {
  // Resize to reduce storage size while preserving OCR-readable quality
  const resized = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
  );

  // Fetch the local file as a Blob (works with Expo development builds)
  const response = await fetch(resized.uri);
  const blob = await response.blob();

  const storagePath = `${groupId}/${generateFilename()}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, blob, { contentType: 'image/jpeg', upsert: false });

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
