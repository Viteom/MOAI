// Ejecutar una vez por versión, contra la base del entorno correspondiente. Nunca durante vite build.
import { abrirDb } from './db';

try {
  if (!process.env.DATABASE_URL?.trim()) throw new Error('Falta DATABASE_URL.');
  const db = await abrirDb({ url: process.env.DATABASE_URL, maxConexiones: 1 });
  await db.close();
  console.log('Esquema de MOAI preparado.');
} catch {
  // Los errores de conexión pueden contener credenciales o direcciones de la base.
  console.error('No se pudo preparar la base de MOAI. Revisa DATABASE_URL y el acceso a PostgreSQL.');
  process.exitCode = 1;
}
