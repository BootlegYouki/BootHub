const fs = require('fs');
const path = require('path');

// Get arguments: node rename-project.js <NewName> [custom-bundle-id]
const newName = process.argv[2];
const customBundleId = process.argv[3];

if (!newName) {
  console.error('\x1b[31mError: Please provide a new project name.\x1b[0m');
  console.log('\nUsage:');
  console.log('  node scripts/rename-project.js <NewDisplayName> [custom-bundle-id]');
  console.log('\nExample:');
  console.log('  node scripts/rename-project.js ClassScheduler');
  console.log('  node scripts/rename-project.js ClassScheduler com.myorg.scheduler\n');
  process.exit(1);
}

// Helper: Convert PascalCase/camelCase/Space Name into kebab-case slug
const toSlug = (str) => {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2') // Insert dash between lower and uppercase
    .replace(/[\s_]+/g, '-')                // Replace spaces/underscores with dashes
    .toLowerCase()
    .replace(/^-+|-+$/g, '');                // Trim leading/trailing dashes
};

// Helper: Convert PascalCase/Space Name into lowercase alphanumeric for default bundleId
const toCleanBundleId = (str) => {
  return str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
};

const displayName = newName;
const slug = toSlug(newName);
const bundleId = customBundleId || `com.bootlegyouki.${toCleanBundleId(newName)}`;

console.log(`\n\x1b[36mRenaming project to:\x1b[0m`);
console.log(`  Display Name:     \x1b[32m${displayName}\x1b[0m`);
console.log(`  App Slug:         \x1b[32m${slug}\x1b[0m`);
console.log(`  iOS Bundle ID:    \x1b[32m${bundleId}\x1b[0m`);
console.log(`  iOS Xcode Scheme: \x1b[32m${displayName}\x1b[0m\n`);

const rootDir = path.join(__dirname, '..');

// 1. Update app.json
const appJsonPath = path.join(rootDir, 'app.json');
if (fs.existsSync(appJsonPath)) {
  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    if (appJson.expo) {
      appJson.expo.name = displayName;
      appJson.expo.slug = slug;
      if (appJson.expo.ios) {
        appJson.expo.ios.bundleIdentifier = bundleId;
      }
      fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
      console.log('\x1b[32m✔ Updated app.json successfully.\x1b[0m');
    }
  } catch (err) {
    console.error('\x1b[31mError reading/writing app.json:\x1b[0m', err.message);
  }
}

// 2. Update package.json
const packageJsonPath = path.join(rootDir, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageJson.name = slug;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
    console.log('\x1b[32m✔ Updated package.json successfully.\x1b[0m');
  } catch (err) {
    console.error('\x1b[31mError reading/writing package.json:\x1b[0m', err.message);
  }
}

// 3. Update .github/workflows/build-ios-ipa.yml
const workflowPath = path.join(rootDir, '.github', 'workflows', 'build-ios-ipa.yml');
if (fs.existsSync(workflowPath)) {
  try {
    let workflowContent = fs.readFileSync(workflowPath, 'utf8');
    
    // Replace names, slugs, and bundle ID references
    workflowContent = workflowContent
      // Replace Display Name references (scheme/workspace targets)
      .replace(/TuiTemplateNative/g, displayName)
      // Replace bundle ID references
      .replace(/com\.bootlegyouki\.tuitemplatenative/g, bundleId)
      // Replace slug references if any
      .replace(/tui-template-native/g, slug);
      
    fs.writeFileSync(workflowPath, workflowContent, 'utf8');
    console.log('\x1b[32m✔ Updated build-ios-ipa.yml successfully.\x1b[0m');
  } catch (err) {
    console.error('\x1b[31mError reading/writing build-ios-ipa.yml:\x1b[0m', err.message);
  }
}

console.log('\n\x1b[32mProject successfully renamed! Run pnpm install or typecheck to verify.\x1b[0m\n');
