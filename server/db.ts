// Acceso a PostgreSQL. Con DATABASE_URL se usa un servidor real (pg); sin ella, PGlite
// (PostgreSQL embebido) para desarrollo local y pruebas, sin Docker.
// Regla 1: ninguna tabla guarda coordenadas; la ciudad es el código DIVIPOLA del municipio.
import { mkdirSync } from 'node:fs';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';

export type Db = {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  close(): Promise<void>;
};

const esquema = `
create table if not exists cuentas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  canal text not null check (canal in ('correo', 'whatsapp')),
  destino text not null unique,
  ciudad char(5),
  fecha_nacimiento date,
  verificada_en timestamptz,
  creada_en timestamptz not null default now()
);
alter table cuentas alter column ciudad drop not null;
alter table cuentas alter column fecha_nacimiento drop not null;
alter table cuentas add column if not exists barrio text;
alter table cuentas add column if not exists comunidad_estado text not null default 'pending';
update cuentas set comunidad_estado = 'completed' where ciudad is not null and comunidad_estado = 'pending';
alter table cuentas add column if not exists recordatorios int not null default 0;
alter table cuentas add column if not exists ultimo_recordatorio timestamptz;
create table if not exists lugares (
  id uuid primary key default gen_random_uuid(),
  cuenta_id uuid not null references cuentas(id) on delete cascade,
  nombre text not null,
  ciudad char(5) not null,
  barrio text,
  celda text,
  activo boolean not null default false,
  creado_en timestamptz not null default now()
);
create unique index if not exists lugares_un_activo on lugares (cuenta_id) where activo;
insert into lugares (cuenta_id, nombre, ciudad, activo) select c.id, 'Casa', c.ciudad, true from cuentas c where c.ciudad is not null and not exists (select 1 from lugares l where l.cuenta_id = c.id);
create table if not exists planes (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid not null references cuentas(id) on delete cascade,
  titulo text not null,
  descripcion text not null default '',
  cuando timestamptz not null,
  lugar_publico text not null,
  ciudad char(5) not null,
  barrio text,
  celda text,
  alcance text not null check (alcance in ('cerca', 'zona', 'ciudad')),
  cupo int,
  cancelado_en timestamptz,
  creado_en timestamptz not null default now()
);
create index if not exists planes_ciudad_cuando on planes (ciudad, cuando);
create table if not exists plan_asistentes (
  plan_id uuid not null references planes(id) on delete cascade,
  cuenta_id uuid not null references cuentas(id) on delete cascade,
  unido_en timestamptz not null default now(),
  primary key (plan_id, cuenta_id)
);
create table if not exists consentimientos (
  id bigserial primary key,
  cuenta_id uuid not null references cuentas(id) on delete cascade,
  tipo text not null check (tipo in ('terminos', 'datos')),
  version text not null,
  aceptado_en timestamptz not null default now()
);
create table if not exists verificaciones (
  id bigserial primary key,
  destino text not null,
  proposito text not null check (proposito in ('registro', 'acceso')),
  codigo_hash text,
  intentos int not null default 0,
  vence_en timestamptz not null,
  usada_en timestamptz,
  creada_en timestamptz not null default now()
);
create index if not exists verificaciones_destino on verificaciones (destino, creada_en desc);
create table if not exists sesiones (
  token_hash text primary key,
  cuenta_id uuid not null references cuentas(id) on delete cascade,
  vence_en timestamptz not null,
  creada_en timestamptz not null default now()
);
`;

export async function abrirDb(opciones: { url?: string; carpeta?: string } = {}): Promise<Db> {
  let db: Db;
  if (opciones.url) {
    const pool = new pg.Pool({ connectionString: opciones.url });
    db = { query: async (sql, params) => (await pool.query(sql, params)).rows, close: () => pool.end() };
  } else {
    if (opciones.carpeta) mkdirSync(opciones.carpeta, { recursive: true });
    const lite = new PGlite(opciones.carpeta);
    db = { query: async <T>(sql: string, params?: unknown[]) => (await lite.query<T>(sql, params)).rows, close: () => lite.close() };
  }
  for (const sentencia of esquema.split(';').map(s => s.trim()).filter(Boolean)) await db.query(sentencia);
  return db;
}
