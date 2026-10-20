import { esquema } from './db';

// Solo para una base NUEVA de pruebas. Se cancela si public ya contiene cualquier tabla.
// Las bases existentes se actualizan mediante db:prepare, con revisión y copia de seguridad.
export function sqlInstalacionBeta() {
  return `-- MOAI: instalación inicial para una base vacía de pruebas.
-- Generado con npm run db:sql. No incluye cuentas, ejemplos, claves ni conexiones.
-- Ejecutar el archivo completo en el SQL Editor de la base moai-beta.
begin;
set local lock_timeout = '10s';
select pg_advisory_xact_lock(hashtext('moai:esquema'));
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE') then
    raise exception 'Instalación inicial cancelada: public ya contiene tablas. Usa el procedimiento de actualización para una base existente.';
  end if;
end
$$;
${esquema}
commit;
`;
}
