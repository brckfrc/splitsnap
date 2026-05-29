import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web.
 * Uses useSyncExternalStore with getServerSnapshot to avoid setState-in-effect for hydration.
 */
const subscribe = () => () => {};
export function useColorScheme() {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const colorScheme = useRNColorScheme();

  return hydrated ? colorScheme : 'light';
}
