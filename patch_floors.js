const fs = require('fs');
let content = fs.readFileSync('/home/yash/Projects/Code_City/frontend/src/widgets/city-viewport/ui/DistrictFloors.jsx', 'utf8');

content = content.replace('import React, { useMemo } from \'react\'', 'import React, { useMemo, useRef } from \'react\';\nimport { useFrame } from \'@react-three/fiber\';\nimport useStore from \'../../../store/useStore\'');
content = content.replace('export default function DistrictFloors({ districts }) {', 'export default function DistrictFloors({ districts }) {\n    const groupRef = useRef();\n    useFrame(() => {\n        if (!groupRef.current) return;\n        const t = useStore.getState().genesisTime !== undefined ? useStore.getState().genesisTime : 1.0;\n        const s = Math.max(0.001, t > 0.05 ? (t - 0.05) * 1.5 : 0.0);\n        groupRef.current.scale.set(1.0, Math.min(1.0, s), 1.0);\n    });');

content = content.replace('<group>', '<group ref={groupRef}>');
fs.writeFileSync('/home/yash/Projects/Code_City/frontend/src/widgets/city-viewport/ui/DistrictFloors.jsx', content);

