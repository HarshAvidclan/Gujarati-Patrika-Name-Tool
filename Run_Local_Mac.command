#!/bin/bash
cd "$(dirname "$0")"
echo ""
echo "Patrika Name Generator"
echo "Open http://localhost:8080"
echo "From another device on the same Wi-Fi use your computer's LAN IP, e.g. http://192.168.1.20:8080"
echo ""
python3 -m http.server 8080 --bind 0.0.0.0
