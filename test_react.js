import fs from 'fs';
const app = fs.readFileSync('frontend/src/App.jsx', 'utf8');
console.log("App imports:", app.match(/^import.*$/gm));
