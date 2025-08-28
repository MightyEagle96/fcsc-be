#!/bin/bash

# build.sh
echo "Running build..."
npm run build


echo "Staging changes..."
git add .

echo "Committing changes..."
git commit -m "$1"

echo "Pushing to remote..."
git push origin main

# echo "Running copy build..."
# npm run copy-build
 

echo "✅ Build and Git push completed."