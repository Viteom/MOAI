// Ejecutar una vez por versión, contra la base del entorno correspondiente. Nunca durante vite build.
import { abrirDb } from './db';
import { urlDbDesdeEntorno } from './entorno-db';

try {
  const url = urlDbDesdeEntorno(process.env);
  if (!url) throw new Error('Falta la conexión PostgreSQL.');
  const db = await abrirDb({ url, maxConexiones: 1 });
  await db.close();
  console.log('Esquema de MOAI preparado.');
} catch {
  // Los errores de conexión pueden contener credenciales o direcciones de la base.
  console.error('No se pudo preparar la base de MOAI. Revisa DATABASE_URL o DATABASE_URL_DATABASE_URL y el acceso a PostgreSQL.');
  process.exitCode = 1;
}
