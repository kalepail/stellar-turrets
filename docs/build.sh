#!/bin/bash

echo "Getting started"

# Bundle docs into zero-dependency HTML file
npx redoc-cli bundle -t template.hbs openapi/openapi.yml && \
mkdir -p dist
mv redoc-static.html dist/index.html && \
echo -e "\nDone!"
