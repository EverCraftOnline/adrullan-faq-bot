#!/bin/bash

echo "🚀 Setting up Nexus FAQ Bot..."

# Copy the Nexus configuration
cp config/nexus-example.json config/project.json

echo "✅ Copied Nexus configuration"

# Generate package.json
node scripts/generate-package.js

echo "✅ Generated package.json"

# Generate default profiles
node scripts/generate-profile.js

echo "✅ Generated default profiles"

# Create data directories
mkdir -p data profiles

echo "✅ Created data directories"

# Create sample data files for Nexus
cat > data/nexus_faq.json << 'EOF'
[
  {
    "id": "nexus_overview",
    "title": "What is Nexus?",
    "content": "Nexus is your all-in-one platform for blockchain-powered apps, games, and digital experiences. Effortlessly manage NFTs, smart calls, analytics, and more—no blockchain expertise required.",
    "category": "nexus_faq",
    "tags": ["nexus", "platform", "blockchain", "overview"],
    "source_url": "https://www.buildnexus.io/",
    "last_updated": "2025-01-15",
    "priority": "high"
  },
  {
    "id": "scrapt_game",
    "title": "What is SCRAPT?",
    "content": "SCRAPT is Nexus's flagship game featuring the XRP Junkies universe. It combines blockchain technology with engaging gameplay mechanics.",
    "category": "scrapt_game",
    "tags": ["scrapt", "game", "xrp-junkies", "flagship"],
    "source_url": "https://www.buildnexus.io/",
    "last_updated": "2025-01-15",
    "priority": "high"
  }
]
EOF

cat > data/blockchain_guides.json << 'EOF'
[
  {
    "id": "xrpl_integration",
    "title": "XRPL Integration Guide",
    "content": "Learn how to integrate with the XRP Ledger for NFT management, smart calls, and blockchain interactions through Nexus.",
    "category": "blockchain_guides",
    "tags": ["xrpl", "integration", "nft", "blockchain"],
    "source_url": "https://www.buildnexus.io/",
    "last_updated": "2025-01-15",
    "priority": "medium"
  }
]
EOF

echo "✅ Created sample data files"

echo ""
echo "🎉 Nexus FAQ Bot setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Add your Discord token and Anthropic API key to .env"
echo "2. Customize the data files in the data/ directory"
echo "3. Update profiles in the profiles/ directory if needed"
echo "4. Run: npm start"
echo ""
echo "🔗 For more information, visit: https://www.buildnexus.io/"



