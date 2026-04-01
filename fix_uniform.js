const fs = require('fs');
let content = fs.readFileSync('/home/yash/Projects/Code_City/frontend/src/widgets/city-viewport/shaders/PulseMaterial.js', 'utf8');
content = content.replace('uniform float uTime;', 'uniform float uTime;\n    uniform float uGenesisTime;');
fs.writeFileSync('/home/yash/Projects/Code_City/frontend/src/widgets/city-viewport/shaders/PulseMaterial.js', content);
