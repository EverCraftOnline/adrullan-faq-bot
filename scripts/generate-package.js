#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const configLoader = require('../lib/configLoader');

function generatePackageJson() {
  const project = configLoader.getProjectInfo();
  const branding = configLoader.getBranding();

  const packageJson = {
    "name": branding.botName,
    "version": project.version,
    "description": `${project.description}`,
    "main": "bot.js",
    "scripts": {
      "start": "node bot.js",
      "dev": "node bot.js",
      "generate-package": "node scripts/generate-package.js"
    },
    "dependencies": {
      "@anthropic-ai/sdk": "^0.62.0",
      "discord.js": "^14.14.1",
      "dotenv": "^16.6.1",
      "express": "^4.18.2",
      "form-data": "^4.0.4"
    },
    "keywords": [
      "discord",
      "bot",
      "faq",
      "ai",
      ...(branding.botName.includes('-') ? branding.botName.split('-') : [branding.botName.replace('-', '')])
    ],
    "author": project.author,
    "license": "MIT",
    "repository": {
      "type": "git",
      "url": project.repository
    },
    "homepage": project.website
  };

  // Write to package.json
  const packagePath = path.join(__dirname, '..', 'package.json');
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
  
  console.log(`✅ Generated package.json for: ${project.name}`);
  console.log(`📦 Package name: ${packageJson.name}`);
  console.log(`🔗 Repository: ${packageJson.repository.url}`);
}

if (require.main === module) {
  generatePackageJson();
}

module.exports = generatePackageJson;


