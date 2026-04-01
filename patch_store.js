const fs = require('fs');
let content = fs.readFileSync('/home/yash/Projects/Code_City/frontend/src/store/slices/createTimeSlice.js', 'utf8');

// Adding the Genesis Protocol state
content = content.replace(
    'showTimeline: false,',
    \`showTimeline: false,
    
    // Genesis Protocol (Cinematic Mode)
    isGenesisPlaying: false,
    genesisTime: 1.0,
    setGenesisPlay: (playing) => set({ isGenesisPlaying: playing }),
    setGenesisTime: (time) => set({ genesisTime: time }),
\`
);
fs.writeFileSync('/home/yash/Projects/Code_City/frontend/src/store/slices/createTimeSlice.js', content);
