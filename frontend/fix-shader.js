
const fs = require('fs');
const p = './src/widgets/city-viewport/shaders/PulseMaterial.js';
let v = fs.readFileSync(p, 'utf8');

const oldStr = 'if (faceScale.x > 30.0) winX = 3.0;\n          if (faceScale.y > 50.0) winY = 3.5;';

const replacements = \`
          bool isFinancial = faceScale.y > 15.0; 
          bool isIndustrial = faceScale.y < 8.0 && faceScale.x > 8.0;

          if (isFinancial) { winX = 4.0; winY = 8.0; }
          else if (isIndustrial) { winX = 6.0; winY = 3.0; }
          else {
              if (faceScale.x > 30.0) winX = 3.0;
              if (faceScale.y > 50.0) winY = 3.5;
          }
\`;

v = v.replace('if (faceScale.x > 30.0) winX = 3.0;\n          if (faceScale.y > 50.0) winY = 3.5;', replacements);

// Also patch the frameThickness
v = v.replace('float frameThickness = 0.15;', \`float frameThickness = 0.15;
          if (isFinancial) frameThickness = 0.08;
          if (isIndustrial) frameThickness = 0.3;\`);

fs.writeFileSync(p, v);
console.log('Shader patched successfully.');

