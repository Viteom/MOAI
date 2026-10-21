// La integración de Neon de esta beta añadió su propio prefijo. No hace falta copiar otra vez el secreto.
// DATABASE_URL conserva prioridad: una configuración explícita nunca se sustituye por otra base.
export function urlDbDesdeEntorno(env: NodeJS.ProcessEnv): string | undefined {
  return env.DATABASE_URL?.trim() || env.DATABASE_URL_DATABASE_URL?.trim() || undefined;
}
