const fs = require('fs');
const path = require('path');

const stylesPath = path.join(__dirname, 'frontend/src/styles.css');
const configPath = path.join(__dirname, 'frontend/tailwind.config.js');

const stylesContent = `@tailwind base;
@tailwind components;
@tailwind utilities;

/* Estilos globales */
body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}
`;

const configContent = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
`;

try {
    fs.writeFileSync(stylesPath, stylesContent, { encoding: 'utf8' });
    console.log('styles.css written successfully in UTF-8');

    fs.writeFileSync(configPath, configContent, { encoding: 'utf8' });
    console.log('tailwind.config.js written successfully in UTF-8');
} catch (err) {
    console.error('Error writing files:', err);
    process.exit(1);
}
