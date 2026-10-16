// Cómo se nombra a otra persona en la API sin exponer su identificador: cada quien ve una referencia
// distinta para la misma persona (HMAC de quien mira + a quien mira), así no se puede seguir a nadie entre cuentas.
// También: bloqueos y la pausa por reportes (src/lib/moai.ts).
import { createHmac } from 'node:crypto';
import { DIAS_REPORTES, REPORTES_PARA_PAUSA } from '../src/lib/moai';
import type { Consulta, Db } from './db';

export type Refs = { ref: (quien: string, aQuien: string) => string; resolver: (db: Db, quien: string, ref: string) => Promise<string | null> };

export function crearRefs(secreto: string): Refs {
  const ref = (quien: string, aQuien: string) => createHmac('sha256', secreto).update(`persona:${quien}:${aQuien}`).digest('base64url').slice(0, 22);
  // Solo se puede nombrar a alguien con quien hay algún contexto: un plan compartido o visible, un Moai o una invitación.
  const resolver = async (db: Db, quien: string, buscada: string) => {
    if (typeof buscada !== 'string' || buscada.length !== 22) return null;
    const candidatas = await db.query<{ id: string }>(
      `select distinct x as id from (
         select p.autor_id as x from planes p join asistencias a on a.plan_id = p.id where a.cuenta_id = $1
         union select a.cuenta_id from asistencias a join planes p on p.id = a.plan_id where p.autor_id = $1
         union select a2.cuenta_id from asistencias a1 join asistencias a2 on a1.plan_id = a2.plan_id and a1.ocurrencia = a2.ocurrencia where a1.cuenta_id = $1
         union select m2.cuenta_id from moai_miembros m1 join moai_miembros m2 on m1.moai_id = m2.moai_id where m1.cuenta_id = $1
         union select de from moai_invitaciones where a = $1
         union select a from moai_invitaciones where de = $1
         union select p.autor_id from planes p join lugares l on l.ciudad = p.ciudad and l.cuenta_id = $1 where p.cancelado_en is null
       ) t where x <> $1`, [quien]);
    return candidatas.find(c => ref(quien, c.id) === buscada)?.id ?? null;
  };
  return { ref, resolver };
}

export async function hayBloqueo(db: Consulta, a: string, b: string): Promise<boolean> {
  const [fila] = await db.query('select 1 from bloqueos where (de = $1 and a = $2) or (de = $2 and a = $1)', [a, b]);
  return !!fila;
}

// Pausa: reportes de al menos dos personas distintas en 90 días, todavía sin revisar.
export async function enPausa(db: Db, cuenta: string, ahora: Date): Promise<boolean> {
  const [{ personas }] = await db.query<{ personas: number }>(
    `select count(distinct de)::int as personas from reportes
     where a = $1 and revisado_en is null and creado_en > $2::timestamptz - make_interval(days => $3)`, [cuenta, ahora, DIAS_REPORTES]);
  return personas >= REPORTES_PARA_PAUSA;
}
