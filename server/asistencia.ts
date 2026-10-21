// Un único mecanismo de cupos para la pantalla del plan y las propuestas de Brisa.
import type { Consulta } from './db.js';
import type { Plan } from '../src/lib/api.js';
import { planesVisibles } from './comunidad.js';

// Debe llamarse dentro de una transacción. El candado de cuenta se comparte con el selector de lugar.
export async function reservarAsistencia(tx: Consulta, cuenta: string, ahora: Date, esperado: { planId: string; lugarId?: string; huella?: string; cuando?: string }) {
  await tx.query('select id from cuentas where id = $1 for update', [cuenta]);
  await tx.query('select pg_advisory_xact_lock(hashtext($1))', [esperado.planId]);
  await tx.query('select id from planes where id = $1 for update', [esperado.planId]);
  const visibles = await planesVisibles(tx, cuenta, ahora);
  const plan = visibles?.planes.find(p => p.id === esperado.planId);
  if (!plan || plan.mio) return { ok: false as const, status: 404, error: 'Este plan ya no está disponible.' };
  if (esperado.lugarId && (visibles?.lugar.id !== esperado.lugarId || huellaPlan(plan) !== esperado.huella || plan.cuando !== esperado.cuando))
    return { ok: false as const, status: 409, error: 'Cambió el lugar o el plan. Busca de nuevo y revisa los detalles antes de confirmar.' };
  if (plan.lleno && !plan.voy) return { ok: false as const, status: 409, error: 'Este plan ya está completo.' };
  await tx.query('insert into asistencias (plan_id, cuenta_id, ocurrencia) values ($1, $2, $3) on conflict do nothing', [plan.id, cuenta, plan.cuando]);
  return { ok: true as const, planId: plan.id };
}
export const huellaPlan = (p: Plan) => JSON.stringify([p.id, p.titulo, p.descripcion, p.cuando, p.lugarPublico, p.zona, p.costo, p.tipo, p.repite, p.moai?.id]);
