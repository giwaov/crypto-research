#!/bin/bash
# Quick deploy script for AI Fact Checker

echo "=========================================="
echo "🚀 Deploying AI Fact Checker to Vercel"
echo "=========================================="
echo

# Check if vercel is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found"
    echo "   Install: npm install -g vercel"
    exit 1
fi

echo "✅ Vercel CLI found"
echo

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo "📝 Please login to Vercel..."
    vercel login
fi

echo "✅ Logged in to Vercel"
echo

# Deploy
echo "🚀 Deploying to Vercel..."
echo

vercel --prod

echo
echo "=========================================="
echo "✅ Deployment complete!"
echo "=========================================="
echo
echo "📝 Next steps:"
echo "1. Deploy API to Railway: railway up"
echo "2. Update apiUrl in web/index.html with your Railway URL"
echo "3. Redeploy: vercel --prod"
echo
echo "📚 See VERCEL_DEPLOY.md for full guide"
echo
