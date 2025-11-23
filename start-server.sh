#!/bin/bash

# Simple HTTP server for audio visualization app
# This avoids CORS issues with AudioWorklets

echo "Starting local web server..."
echo "Open your browser and navigate to:"
echo ""
echo "    http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python3 -m http.server 8000
