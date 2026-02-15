import { existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const dest = resolve(process.cwd(), 'tsconfig.app.json');

if (existsSync(dest)) {
  console.log('tsconfig.app.json already exists');
  process.exit(0);
}

const defaultContent = `{
  "compilerOptions": {
    "types": ["vitest/globals"],
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noImplicitAny": false,
    "noFallthroughCasesInSwitch": false,

    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
`;

writeFileSync(dest, defaultContent, { encoding: 'utf8' });
console.log('Created tsconfig.app.json');
