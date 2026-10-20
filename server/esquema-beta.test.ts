// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { expect, it } from 'vitest';
import { sqlInstalacionBeta } from './esquema-beta';

it('instala desde SQL las tablas necesarias en una base vacía sin inventar cuentas ni planes', async () => {
  const db = new PGlite();
  try {
    await db.exec(sqlInstalacionBeta());
    const tablas = await db.query<{ table_name: string }>("select table_name from information_schema.tables where table_schema = 'public'");
    expect(tablas.rows.map(t => t.table_name)).toEqual(expect.arrayContaining(['cuentas', 'sesiones', 'planes', 'brisa_memoria', 'brisa_interpretaciones']));
    expect((await db.query('select * from cuentas')).rows).toHaveLength(0);
    expect((await db.query('select * from planes')).rows).toHaveLength(0);
    await db.exec("insert into cuentas (nombre, canal, destino) values ('Cuenta ficticia', 'correo', 'prueba@example.test')");
    await expect(db.exec(sqlInstalacionBeta())).rejects.toThrow('public ya contiene tablas');
    await db.exec('rollback');
    expect((await db.query('select * from cuentas')).rows).toHaveLength(1);
  } finally { await db.close(); }
}, 60_000);

it('se cancela antes de crear tablas de MOAI si la base contiene otras tablas', async () => {
  const db = new PGlite();
  try {
    await db.exec('create table existente (id int); insert into existente values (1)');
    await expect(db.exec(sqlInstalacionBeta())).rejects.toThrow('public ya contiene tablas');
    await db.exec('rollback');
    expect((await db.query('select * from existente')).rows).toEqual([{ id: 1 }]);
    expect((await db.query("select to_regclass('public.cuentas') as tabla")).rows).toEqual([{ tabla: null }]);
  } finally { await db.close(); }
}, 60_000);
