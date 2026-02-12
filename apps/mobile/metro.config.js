const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace root
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Force Metro to resolve same-named packages to a single instance
// This is critical for React and other hooks-heavy libraries
config.resolver.extraNodeModules = {
  react: path.resolve(workspaceRoot, 'node_modules/react'),
  'react-native': path.resolve(workspaceRoot, 'node_modules/react-native'),
};

// 4. Block resolution of local react to prevent duplicates
config.resolver.blockList = [
  // Block apps/mobile/node_modules/react
  new RegExp(`^${path.resolve(projectRoot, 'node_modules/react').replace(/[/\\]/g, '[/\\\\]')}`),
];

module.exports = config;
