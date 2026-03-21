import type { Href } from 'expo-router';

/** Typed-route helper until Expo regenerates `.expo/types` after route changes. */
export function href(path: string): Href {
  return path as Href;
}
