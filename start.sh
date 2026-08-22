#!/bin/bash

# Run backend first
cd src/api && python create_bulletin.py &
cd ../..

# Run frontend second
npm start