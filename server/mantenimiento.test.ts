// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { abrirDb, type Db } from './db';
import { mantener } from './mantenimiento';

let db: Db;
let recordados: { destino: string; diasRestantes: number }[];
const recordar = async (destino: string, _nombre: string, diasRestantes: number) => { recordados.push({ destino, diasRestantes }); };

beforeAll(async () => { db = await abrirDb(); }, 60_000);
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.query('truncate cuentas, consentimientos, verificaciones, sesiones restart identity cascade');
  recordados = [];
});

const cuenta = (destino: string, diasAtras: number, opciones: { verificada?: boolean; canal?: string; horasDesdeRecordatorio?: number } = {}) => db.query(
  `insert into cuentas (nombre, canal, destino, ciudad, fecha_nacimiento, creada_en, verificada_en, ultimo_recordatorio)
   values ('Rosa', $2, $1, '05001', '1950-01-01', now() - make_interval(days => $3), $4, $5)`,
  [destino, opciones.canal ?? 'correo', diasAtras, opciones.verificada ? new Date() : null,
    opciones.horasDesdeRecordatorio === undefined ? null : new Date(Date.now() - opciones.horasDesdeRecordatorio * 3600_000)]);

describe('Cuentas sin verificar', () => {
  it('se borran a los 20 días, con sus consentimientos y códigos', async () => {
    await cuenta('vieja@ejemplo.co', 21);
    await cuenta('verificada@ejemplo.co', 40, { verificada: true });
    await db.query(`insert into consentimientos (cuenta_id, tipo, version) select id, 'datos', 'v' from cuentas`);
    await db.query(`insert into verificaciones (destino, proposito, vence_en) values ('vieja@ejemplo.co', 'registro', now())`);
    const resultado = await mantener(db, recordar);
    expect(resultado.borradas).toBe(1);
    expect(await db.query('select destino from cuentas')).toEqual([{ destino: 'verificada@ejemplo.co' }]);
    expect(await db.query('select id from consentimientos')).toHaveLength(1);
    expect(await db.query('select id from verificaciones')).toEqual([]);
  });

  it('reciben un recordatorio cada 3,5 días con los días que les quedan', async () => {
    await cuenta('nueva@ejemplo.co', 1);
    await cuenta('cuatro@ejemplo.co', 4);
    await cuenta('recordada@ejemplo.co', 8, { horasDesdeRecordatorio: 24 });
    await cuenta('toca@ejemplo.co', 8, { horasDesdeRecordatorio: 90 });
    await mantener(db, recordar);
    expect(recordados.sort((a, b) => a.destino.localeCompare(b.destino))).toEqual([
      { destino: 'cuatro@ejemplo.co', diasRestantes: 16 },
      { destino: 'toca@ejemplo.co', diasRestantes: 12 },
    ]);
    await mantener(db, recordar);
    expect(recordados).toHaveLength(2);
  });

  it('no recuerda a cuentas verificadas ni a las de WhatsApp', async () => {
    await cuenta('lista@ejemplo.co', 5, { verificada: true });
    await cuenta('+573001234567', 5, { canal: 'whatsapp' });
    await mantener(db, recordar);
    expect(recordados).toEqual([]);
  });
});
