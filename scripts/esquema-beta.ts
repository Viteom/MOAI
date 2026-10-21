// Exportación sin conexión de red, lectura de secretos ni cambios en una base.
import { writeFileSync } from 'node:fs';
import { sqlInstalacionBeta } from '../server/esquema-beta';

writeFileSync(new URL('../docs/instalar-moai-beta.sql', import.meta.url), sqlInstalacionBeta());
console.log('Archivo preparado: docs/instalar-moai-beta.sql');
