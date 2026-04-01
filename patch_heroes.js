const fs = require('fs');
let content = fs.readFileSync('/home/yash/Projects/Code_City/frontend/src/widgets/city-viewport/ui/HeroLandmarks.jsx', 'utf8');

content = content.replace('import React, { useMemo, useEffect } from \'react\'', 'import React, { useMemo, useEffect, useRef } from \'react\';\nimport { useFrame } from \'@react-three/fiber\';\nimport useStore from \'../../../store/useStore\'');
content = content.replace('if (!bodyGeo) return null', 'const groupRef = useRef();\nuseFrame((state, delta) => {\n  if (!groupRef.current) return;\n  const t = useStore.getState().genesisTime !== undefined ? useStore.getState().genesisTime : 1.0;\n  const s = Math.max(0.001, t > 0.8 ? (t - 0.8) * 5.0 : 0.0); // pops in only at the very end\n  groupRef.current.scale.set(s, s, s);\n});\nif (!bodyGeo) return null;\n');
content = content.replace('<group>', '<group ref={groupRef}>');
fs.writeFileSync('/home/yash/Projects/Code_City/frontend/src/widgets/city-viewport/ui/HeroLandmarks.jsx', content);

