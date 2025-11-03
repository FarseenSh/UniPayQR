#!/bin/bash
# UniPayQR - Push to GitHub Script

echo "🚀 UniPayQR - GitHub Push Helper"
echo "================================"
echo ""

# Navigate to project directory
cd /Users/farseenshaikh/Documents/UniPay

# Configure git user (update with your details)
echo "📝 Configuring Git..."
git config user.name "Farseen Shaikh"
git config user.email "your.email@example.com"

# Add all files (respects .gitignore)
echo "📦 Adding files..."
git add .

# Commit
echo "💾 Committing..."
git commit -m "🚀 Initial commit - UniPayQR: Pay Indian Merchants with Bitcoin-Backed mUSD"

# Add remote (REPLACE YOUR_USERNAME with your GitHub username)
echo "🔗 Adding remote..."
git remote add origin https://github.com/YOUR_USERNAME/UniPayQR.git

# Push to GitHub
echo "⬆️  Pushing to GitHub..."
git branch -M main
git push -u origin main

echo ""
echo "✅ Done! Your repository is live on GitHub!"
echo "Visit: https://github.com/YOUR_USERNAME/UniPayQR"

