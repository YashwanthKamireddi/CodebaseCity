const fs = require('fs');
let content = fs.readFileSync('/home/yash/Projects/Code_City/frontend/src/widgets/city-viewport/shaders/PulseMaterial.js', 'utf8');

content = content.replace('uTime: 0,', 'uTime: 0, uGenesisTime: 1.0,');
content = content.replace('attribute float aChurn;', 'attribute float aChurn; attribute float aGenesisStart;');
content = content.replace('vColor = instanceColor;', 'vColor = instanceColor; float progress = clamp((uGenesisTime - aGenesisStart) * 10.0, 0.0, 1.0); vec3 animatedPosition = position; animatedPosition.y = (position.y + 0.5) * progress - 0.5; vGenesisProgress = progress;');
content = content.replace('vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);', 'vec4 worldPos = modelMatrix * instanceMatrix * vec4(animatedPosition, 1.0);');
content = content.replace('varying float vFresnel;', 'varying float vFresnel; varying float vGenesisProgress;');

let p2 = fs.readFileSync('/home/yash/Projects/Code_City/frontend/src/widgets/city-viewport/shaders/PulseMaterial.js', 'utf8');
let res = content.split('// ═══════════════════════ FRAGMENT SHADER ═══════════════════════');
let frag = res[1];
frag = frag.replace('varying float vFresnel;', 'varying float vFresnel; varying float vGenesisProgress;');
frag = frag.replace('gl_FragColor = vec4(finalColor, 1.0);', 'float flash = smoothstep(1.0, 0.9, vGenesisProgress) * smoothstep(0.0, 0.2, vGenesisProgress); finalColor += vec3(0.0, 1.0, 0.8) * flash * 2.0; if (vGenesisProgress < 0.01 && uGenesisTime < 0.99) discard; gl_FragColor = vec4(finalColor, 1.0);');
res[1] = frag;
fs.writeFileSync('/home/yash/Projects/Code_City/frontend/src/widgets/city-viewport/shaders/PulseMaterial.js', res.join('// ═══════════════════════ FRAGMENT SHADER ═══════════════════════'));

