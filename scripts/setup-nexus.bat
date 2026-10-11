@echo off
echo 🚀 Setting up Nexus FAQ Bot...

REM Copy the Nexus configuration
copy config\nexus-example.json config\project.json

echo ✅ Copied Nexus configuration

REM Generate package.json
node scripts\generate-package.js

echo ✅ Generated package.json

REM Generate default profiles
node scripts\generate-profile.js

echo ✅ Generated default profiles

REM Create data directories
if not exist data mkdir data
if not exist profiles mkdir profiles

echo ✅ Created data directories

echo.
echo 🎉 Nexus FAQ Bot setup complete!
echo.
echo 📋 Next steps:
echo 1. Add your Discord token and Anthropic API key to .env
echo 2. Customize the data files in the data\ directory
echo 3. Update profiles in the profiles\ directory if needed
echo 4. Run: npm start
echo.
echo 🔗 For more information, visit: https://www.buildnexus.io/
pause



