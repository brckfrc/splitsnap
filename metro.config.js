// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Tree-shake lucide-react-native.
//
// Metro does not tree-shake the package barrel, so `import { X } from
// 'lucide-react-native'` bundles all ~1700 icons (~1.3 MB). We instead import
// from `@/lib/icons`, which re-exports each used icon via the
// `lucide-react-native/icons/<name>` subpath. That subpath isn't in the
// package's `exports` map, so we resolve it to the individual icon module here.
// Package exports stay enabled for every other package.
const lucideIconsDir = path.join(
  __dirname,
  'node_modules/lucide-react-native/dist/esm/icons',
);
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const match = moduleName.match(/^lucide-react-native\/icons\/(.+)$/);
  if (match) {
    const iconFile = match[1].endsWith('.js') ? match[1] : `${match[1]}.js`;
    return { type: 'sourceFile', filePath: path.join(lucideIconsDir, iconFile) };
  }
  return (upstreamResolveRequest ?? context.resolveRequest)(
    context,
    moduleName,
    platform,
  );
};

module.exports = config;
