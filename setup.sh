#!/bin/bash
set -e

echo "🛠️ Setting up Python sandbox..."

# Check Python 3.12
if ! command -v python3.12 &> /dev/null; then
    echo "❌ Python 3.12 required. Install via pyenv or system package manager."
    exit 1
fi

python3.12 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
echo "✅ Sandbox ready! Run 'source venv/bin/activate' to use."