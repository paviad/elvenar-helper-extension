#!/bin/zsh

set -e

# Check if env.sh exists before sourcing
if [ -f "./env.sh" ]; then
    source "./env.sh"
else
    echo "⚠️  Error: 'env.sh' not found!"
    echo "Please create it with your secrets to continue."
    exit 1
fi

# Unlock Keychain
# We expect the password to be in the $KEYCHAIN_PWD variable
if [ -n "$KEYCHAIN_PWD" ]; then
    echo "🔓 Unlocking keychain..."
    security unlock-keychain -p "$KEYCHAIN_PWD" login.keychain
fi

./build.sh
./package.sh

