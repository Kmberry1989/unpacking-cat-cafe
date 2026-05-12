# Cat Cafe: Unpacking Prototype

A meditative, score-free mobile web game about unpacking boxes and setting up cozy spaces for cats. Built with Three.js and Vite.

## Development Setup

1. Clone the repository:
   \`\`\`bash
   git clone <your-repo-url>
   \`\`\`
2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`
3. Start the local development server:
   \`\`\`bash
   npm run dev
   \`\`\`

## Asset Pipeline
Place `.glb` files in `public/assets/models/`. Audio goes into `public/assets/audio/`. The `levelData` JSON config in `src/index.js` handles all placement logic and asset loading.