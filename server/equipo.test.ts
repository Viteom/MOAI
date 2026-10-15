// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { abrirDb, type Db } from './db';
import { crearApp, COOKIE_SESION } from './app';
import type { Propio } from './envios';

const hoy = new Date('2026-10-12T12:00:00Z');
const manana = '2026-10-13T15:00:00.000Z';
let reloj = hoy;
let db: Db;
let app: Awaited<ReturnType<typeof crearApp>>;
let codigos: Record<string, string>;
const correo: Propio = { tipo: 'propio', async enviar(destino, codigo) { codigos[destino] = codigo; } };

beforeAll(async () => { db = await abrirDb(); }, 60_000);
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.query('truncate cuentas, verificaciones, moais, organizaciones restart identity cascade');
  codigos = {};
  reloj = hoy;
  app = await crearApp({ db, vias: { correo }, secreto: 'prueba', ahora: () => reloj, equipo: ['mateo@ejemplo.co'] });
});
afterEach(async () => { await app.close(); });

const entrar = async (destino: string) => {
  await app.inject({ method: 'POST', url: '/api/acceso', payload: { canal: 'correo', destino } });
  return app.inject({ method: 'POST', url: '/api/verificar', payload: { canal: 'correo', destino, codigo: codigos[destino] } });
};
async function persona(nombre: string) {
  const destino = `${nombre.toLowerCase()}@ejemplo.co`;
  await app.inject({ method: 'POST', url: '/api/registro', payload: { nombre, canal: 'correo', destino, aceptaTerminos: true, aceptaDatos: true } });
  const r = await app.inject({ method: 'POST', url: '/api/verificar', payload: { canal: 'correo', destino, codigo: codigos[destino] } });
  const cookie = `${COOKIE_SESION}=${r.cookies.find(x => x.name === COOKIE_SESION)!.value}`;
  const pedir = (method: 'GET' | 'POST', url: string, payload?: object) => app.inject({ method, url, payload, headers: { cookie } });
  await pedir('POST', '/api/perfil/nacimiento', { fechaNacimiento: '1960-05-02' }); // cuenta adulta validada (regla 8)
  await pedir('POST', '/api/lugares', { nombre: 'Casa', ciudad: '05001' });
  return { destino, pedir, json: async (method: 'GET' | 'POST', url: string, payload?: object) => (await pedir(method, url, payload)).json() };
}
const plan = (titulo: string, extra: object = {}) => ({ titulo, cuando: manana, lugarPublico: 'Parque de los Deseos', ciudad: '05001', alcance: 'ciudad', ...extra });

describe('Revisar reportes', () => {
  it('solo el equipo entra; la persona reportada ve la pausa hasta que el equipo cierra el caso', async () => {
    const mateo = await persona('Mateo'), juan = await persona('Juan'), ana = await persona('Ana'), luis = await persona('Luis');
    expect((await mateo.json('GET', '/api/sesion')).equipo).toBe(true);
    expect((await juan.json('GET', '/api/sesion')).equipo).toBeUndefined();
    expect((await juan.pedir('GET', '/api/equipo/casos')).statusCode).toBe(403);

    await juan.pedir('POST', '/api/planes', plan('Caminata'));
    for (const q of [ana, luis]) await q.pedir('POST', '/api/personas/reportar', { ref: (await q.json('GET', '/api/planes'))[0].autorRef, motivo: 'trato', detalle: 'Fue grosero.' });
    expect((await juan.json('GET', '/api/gente')).pausa).toBe(true);

    const [caso] = await mateo.json('GET', '/api/equipo/casos');
    expect(caso).toMatchObject({ nombre: 'Juan', correo: 'juan@ejemplo.co', pausa: true, suspendida: false, pendientes: 2 });
    expect(caso.reportes.map((r: { de: string }) => r.de).sort()).toEqual(['Ana', 'Luis']);
    const [cerrado] = await mateo.json('POST', `/api/equipo/casos/${caso.cuenta}`, { decision: 'sin_medidas' });
    expect(cerrado).toMatchObject({ pausa: false, pendientes: 0 });
    expect((await juan.json('GET', '/api/gente')).pausa).toBe(false);
  });

  it('suspender cierra la sesión, impide entrar y oculta sus planes; reactivar lo deshace', async () => {
    const mateo = await persona('Mateo'), juan = await persona('Juan'), ana = await persona('Ana');
    await juan.pedir('POST', '/api/planes', plan('Caminata'));
    await ana.pedir('POST', '/api/personas/reportar', { ref: (await ana.json('GET', '/api/planes'))[0].autorRef, motivo: 'dinero' });
    const [caso] = await mateo.json('GET', '/api/equipo/casos');
    await mateo.pedir('POST', `/api/equipo/casos/${caso.cuenta}`, { decision: 'suspender' });
    expect((await juan.pedir('GET', '/api/sesion')).statusCode).toBe(401);
    const intento = await entrar(juan.destino);
    expect(intento.statusCode).toBe(403);
    expect(intento.json().error).toMatch(/suspendida/);
    expect(await ana.json('GET', '/api/planes')).toEqual([]);
    await mateo.pedir('POST', `/api/equipo/casos/${caso.cuenta}`, { decision: 'reactivar' });
    expect((await entrar(juan.destino)).statusCode).toBe(200);
    expect((await ana.json('GET', '/api/planes')).map((p: { titulo: string }) => p.titulo)).toEqual(['Caminata']);
  });
});

describe('Entidades que convocan', () => {
  it('el equipo da de alta la entidad; su responsable convoca a su nombre, con cupo de hasta 200', async () => {
    const mateo = await persona('Mateo'), sara = await persona('Sara'), ana = await persona('Ana');
    const sinCuenta = await mateo.pedir('POST', '/api/equipo/organizaciones', { nombre: 'Secretaría de Medio Ambiente', tipo: 'publica', responsable: 'nadie@ejemplo.co' });
    expect(sinCuenta.json().errores.responsable).toMatch(/no tiene una cuenta/);
    const [org] = await mateo.json('POST', '/api/equipo/organizaciones', { nombre: 'Secretaría de Medio Ambiente', tipo: 'publica', responsable: 'SARA@ejemplo.co' });
    expect(org).toMatchObject({ nombre: 'Secretaría de Medio Ambiente', activa: true, responsables: ['sara@ejemplo.co'] });
    expect((await sara.json('GET', '/api/sesion')).organizaciones).toEqual([{ id: org.id, nombre: 'Secretaría de Medio Ambiente', tipo: 'publica' }]);

    // Nadie más puede publicar a su nombre.
    expect((await ana.pedir('POST', '/api/planes', plan('Siembra', { organizacion: org.id }))).statusCode).toBe(403);
    expect((await sara.pedir('POST', '/api/planes', plan('Siembra', { cupo: 31 }))).statusCode).toBe(400); // a nombre propio, máximo 30
    const ok = await sara.pedir('POST', '/api/planes', plan('Buscamos 5 personas para sembrar árboles', { organizacion: org.id, cupo: 150, tipo: 'voluntariado' }));
    expect(ok.statusCode).toBe(200);
    const [visto] = await ana.json('GET', '/api/planes');
    expect(visto).toMatchObject({ titulo: 'Buscamos 5 personas para sembrar árboles', autor: 'Secretaría de Medio Ambiente', organizacion: { nombre: 'Secretaría de Medio Ambiente', tipo: 'publica' }, tipo: 'voluntariado' });

    // Si el equipo pausa la entidad, sus convocatorias desaparecen.
    await mateo.pedir('POST', `/api/equipo/organizaciones/${org.id}/activa`, { activa: false });
    expect(await ana.json('GET', '/api/planes')).toEqual([]);
    expect((await sara.json('GET', '/api/sesion')).organizaciones).toBeUndefined();
  });

  it('en «¿Te viste con…?» de una convocatoria aparecen las otras personas voluntarias, no la entidad', async () => {
    const mateo = await persona('Mateo'), sara = await persona('Sara'), ana = await persona('Ana'), luis = await persona('Luis');
    const [org] = await mateo.json('POST', '/api/equipo/organizaciones', { nombre: 'Corporación Siembra', tipo: 'comunitaria', responsable: 'sara@ejemplo.co' });
    const [conv] = await sara.json('POST', '/api/planes', plan('Siembra en la quebrada', { organizacion: org.id }));
    for (const q of [ana, luis]) await q.pedir('POST', `/api/planes/${conv.id}/ir`);
    reloj = new Date('2026-10-13T18:00:00Z');
    const g = await ana.json('GET', '/api/gente');
    expect(g.encuentros[0].personas.map((p: { nombre: string }) => p.nombre)).toEqual(['Luis']);
  });
});
