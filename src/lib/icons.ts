/**
 * Centralized lucide-react-native icon re-exports.
 *
 * Importing icons from the package barrel (`lucide-react-native`) pulls *all*
 * ~1700 icons into the bundle because Metro does not tree-shake the barrel.
 * Re-exporting only the icons we actually use — via per-icon deep imports —
 * keeps the bundle to just these. The `lucide-react-native/icons/*` subpath is
 * mapped to the individual icon module by the resolver in `metro.config.js`.
 *
 * To add an icon: add a line here and import it from `@/lib/icons`.
 */
export { default as ArrowLeft } from 'lucide-react-native/icons/arrow-left';
export { default as ArrowRight } from 'lucide-react-native/icons/arrow-right';
export { default as ArrowUpRight } from 'lucide-react-native/icons/arrow-up-right';
export { default as Camera } from 'lucide-react-native/icons/camera';
export { default as Check } from 'lucide-react-native/icons/check';
export { default as ChevronDown } from 'lucide-react-native/icons/chevron-down';
export { default as ChevronRight } from 'lucide-react-native/icons/chevron-right';
export { default as Image } from 'lucide-react-native/icons/image';
export { default as Key } from 'lucide-react-native/icons/key';
export { default as LogOut } from 'lucide-react-native/icons/log-out';
export { default as Monitor } from 'lucide-react-native/icons/monitor';
export { default as Moon } from 'lucide-react-native/icons/moon';
export { default as Receipt } from 'lucide-react-native/icons/receipt';
export { default as Sun } from 'lucide-react-native/icons/sun';
export { default as Trash2 } from 'lucide-react-native/icons/trash-2';
export { default as TrendingUp } from 'lucide-react-native/icons/trending-up';
export { default as User } from 'lucide-react-native/icons/user';
export { default as UserPlus } from 'lucide-react-native/icons/user-plus';
export { default as Users } from 'lucide-react-native/icons/users';
