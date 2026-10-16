// Acceso a PostgreSQL. Con DATABASE_URL se usa un servidor real (pg); sin ella, PGlite
// (PostgreSQL embebido) para desarrollo local y pruebas, sin Docker.
// Regla 1: ninguna tabla guarda coordenadas; la ciudad es el código DIVIPOLA del municipio.
import { mkdirSync } from 'node:fs';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';

export type Consulta = { query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> };
// `transaccion`: para lo que debe ocurrir todo o nada y sin carreras entre solicitudes simultáneas
// (límites de códigos, cupos de planes). Dentro se puede usar pg_advisory_xact_lock.
export type Db = Consulta & {
  transaccion<T>(fn: (tx: Consulta) => Promise<T>): Promise<T>;
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
alter table planes add column if not exists tipo text not null default 'otro';
alter table planes add column if not exists repite text;
drop table if exists plan_asistentes;
create table if not exists asistencias (
  plan_id uuid not null references planes(id) on delete cascade,
  cuenta_id uuid not null references cuentas(id) on delete cascade,
  ocurrencia timestamptz not null,
  unido_en timestamptz not null default now(),
  primary key (plan_id, cuenta_id, ocurrencia)
);
create table if not exists plan_mensajes (
  id bigserial primary key,
  plan_id uuid not null references planes(id) on delete cascade,
  autor_id uuid not null references cuentas(id) on delete cascade,
  texto text not null,
  creado_en timestamptz not null default now()
);
create table if not exists avisos_vistos (
  cuenta_id uuid not null references cuentas(id) on delete cascade,
  clave text not null,
  visto_en timestamptz not null default now(),
  primary key (cuenta_id, clave)
);
alter table cuentas add column if not exists sugerencias boolean not null default false;
alter table cuentas add column if not exists gustos text[] not null default '{}';
alter table cuentas add column if not exists resumen_semanal boolean not null default false;
alter table cuentas add column if not exists ultimo_resumen timestamptz;
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
create table if not exists nos_vimos (
  de uuid not null references cuentas(id) on delete cascade,
  a uuid not null references cuentas(id) on delete cascade,
  plan_id uuid not null references planes(id) on delete cascade,
  ocurrencia timestamptz not null,
  si boolean not null,
  creado_en timestamptz not null default now(),
  primary key (de, a, plan_id, ocurrencia)
);
create table if not exists moais (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  creado_en timestamptz not null default now()
);
create table if not exists moai_miembros (
  moai_id uuid not null references moais(id) on delete cascade,
  cuenta_id uuid not null references cuentas(id) on delete cascade,
  unido_en timestamptz not null default now(),
  primary key (moai_id, cuenta_id)
);
create table if not exists moai_invitaciones (
  id uuid primary key default gen_random_uuid(),
  moai_id uuid references moais(id) on delete cascade,
  de uuid not null references cuentas(id) on delete cascade,
  a uuid not null references cuentas(id) on delete cascade,
  nombre text,
  estado text not null default 'abierta' check (estado in ('abierta', 'aceptada', 'cerrada')),
  creada_en timestamptz not null default now()
);
create table if not exists moai_votos (
  invitacion_id uuid not null references moai_invitaciones(id) on delete cascade,
  cuenta_id uuid not null references cuentas(id) on delete cascade,
  acepta boolean not null,
  primary key (invitacion_id, cuenta_id)
);
create table if not exists moai_mensajes (
  id bigserial primary key,
  moai_id uuid not null references moais(id) on delete cascade,
  autor_id uuid not null references cuentas(id) on delete cascade,
  texto text not null,
  creado_en timestamptz not null default now()
);
create table if not exists bloqueos (
  de uuid not null references cuentas(id) on delete cascade,
  a uuid not null references cuentas(id) on delete cascade,
  creado_en timestamptz not null default now(),
  primary key (de, a)
);
create table if not exists reportes (
  id bigserial primary key,
  de uuid not null references cuentas(id) on delete cascade,
  a uuid not null references cuentas(id) on delete cascade,
  motivo text not null,
  detalle text not null default '',
  creado_en timestamptz not null default now(),
  revisado_en timestamptz
);
alter table reportes add column if not exists decision text;
alter table reportes add column if not exists mensaje text;
alter table cuentas add column if not exists suspendida_en timestamptz;
create table if not exists organizaciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null check (tipo in ('publica', 'privada', 'comunitaria')),
  activa boolean not null default true,
  creada_en timestamptz not null default now()
);
create table if not exists organizacion_responsables (
  organizacion_id uuid not null references organizaciones(id) on delete cascade,
  cuenta_id uuid not null references cuentas(id) on delete cascade,
  primary key (organizacion_id, cuenta_id)
);
alter table planes add column if not exists organizacion_id uuid references organizaciones(id) on delete cascade;
create table if not exists cuidado (
  cuenta_id uuid primary key references cuentas(id) on delete cascade,
  respuestas text not null,
  autorizado_en timestamptz not null,
  actualizado_en timestamptz not null
);
create table if not exists perfiles (
  cuenta_id uuid primary key references cuentas(id) on delete cascade,
  frase text not null default '',
  gustos text[] not null default '{}',
  comparte text not null default '',
  aprender text not null default '',
  visible boolean not null default false,
  actualizado_en timestamptz not null
);
create table if not exists estados (
  cuenta_id uuid primary key references cuentas(id) on delete cascade,
  invierno text not null,
  puerta_hasta timestamptz,
  actualizado_en timestamptz not null
);
drop table if exists invierno_avisos;
create table if not exists inviernos_contados (
  de_ciego text not null,
  a_ciego text not null,
  datos text not null,
  primary key (de_ciego, a_ciego)
);
create table if not exists saludos (
  id bigserial primary key,
  de uuid not null references cuentas(id) on delete cascade,
  a uuid not null references cuentas(id) on delete cascade,
  saludo text not null,
  creado_en timestamptz not null
);
create table if not exists moai_interno (
  id uuid primary key default gen_random_uuid(),
  cuenta_id uuid not null references cuentas(id) on delete cascade,
  nombre text not null,
  relacion text not null,
  ultimo_contacto timestamptz,
  creado_en timestamptz not null
);
alter table moai_interno add column if not exists familia boolean not null default false;
`;

export async function abrirDb(opciones: { url?: string; carpeta?: string } = {}): Promise<Db> {
  let db: Db;
  if (opciones.url) {
    const pool = new pg.Pool({ connectionString: opciones.url });
    db = {
      query: async (sql, params) => (await pool.query(sql, params)).rows,
      async transaccion(fn) {
        const cliente = await pool.connect();
        try {
          await cliente.query('begin');
          const r = await fn({ query: async <T>(sql: string, params?: unknown[]) => (await cliente.query(sql, params)).rows as T[] });
          await cliente.query('commit');
          return r;
        } catch (error) {
          await cliente.query('rollback');
          throw error;
        } finally {
          cliente.release();
        }
      },
      close: () => pool.end(),
    };
  } else {
    if (opciones.carpeta) mkdirSync(opciones.carpeta, { recursive: true });
    const lite = new PGlite(opciones.carpeta);
    db = {
      query: async <T>(sql: string, params?: unknown[]) => (await lite.query<T>(sql, params)).rows,
      transaccion: fn => lite.transaction(tx => fn({ query: async <T>(sql: string, params?: unknown[]) => (await tx.query<T>(sql, params)).rows })),
      close: () => lite.close(),
    };
  }
  for (const sentencia of esquema.split(';').map(s => s.trim()).filter(Boolean)) await db.query(sentencia);
  return db;
}
