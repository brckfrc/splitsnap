/**
 * Per-icon deep imports (`lucide-react-native/icons/<name>`) aren't declared in
 * the package's `exports` map, so TypeScript can't resolve their types on its
 * own. The runtime resolution is handled by the resolver in `metro.config.js`;
 * this ambient declaration gives those subpaths their proper icon type.
 */
declare module 'lucide-react-native/icons/*' {
  import type { LucideIcon } from 'lucide-react-native';

  const icon: LucideIcon;
  export default icon;
}
