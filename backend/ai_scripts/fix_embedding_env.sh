#!/bin/bash
# Fix script for embedding environment issues
# This script fixes numpy/sentence-transformers compatibility issues

echo "🔧 Fixing embedding environment..."

# Check if we're in conda environment
if [ -n "$CONDA_DEFAULT_ENV" ]; then
    echo "📦 Current conda environment: $CONDA_DEFAULT_ENV"
fi

# Option 1: Reinstall numpy and sentence-transformers
echo "📥 Reinstalling numpy and sentence-transformers..."
pip install --upgrade --force-reinstall numpy
pip install --upgrade --force-reinstall sentence-transformers

# Option 2: Install specific compatible versions
# Uncomment if above doesn't work:
# pip install numpy==1.24.3
# pip install sentence-transformers==2.2.2

echo "✅ Done! Try running the script again."

