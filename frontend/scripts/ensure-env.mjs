import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '..');

const envPath = path.join(frontendDir, '.env');
const rootEnvPath = path.resolve(frontendDir, '../.env');
const rootExamplePath = path.resolve(frontendDir, '../.env.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(rootEnvPath)) {
    fs.copyFileSync(rootEnvPath, envPath);
    console.log('[frontend ensure-env] .env criado a partir do .env raiz');
  } else if (fs.existsSync(rootExamplePath)) {
    fs.copyFileSync(rootExamplePath, envPath);
    console.log('[frontend ensure-env] .env criado a partir do .env.example raiz');
  }
}
