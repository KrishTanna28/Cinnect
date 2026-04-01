#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const dirPath = String.raw`I:\Projects\Cinnect\my-app\src\app\api\auth\socket-token`;
const filePath = path.join(dirPath, 'route.js');

try {
  fs.mkdirSync(dirPath, { recursive: true });
  console.log(`Created directory: ${dirPath}`);
} catch (err) {
  console.error(`Error creating directory: ${err.message}`);
}
