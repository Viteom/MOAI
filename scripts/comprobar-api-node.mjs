// Comprueba la entrada desplegable con Node nativo, sin tsx ni Vitest y sin secretos del entorno.
// No conecta PostgreSQL ni proveedores: una configuración vacía debe producir nuestro JSON 503, nunca un fallo al importar.
import ts from 'typescript';
import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, symlinkSync, rmSync } from 'node:fs';
import { dirname, resolve, relative, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const temporal = mkdtempSync(resolve(tmpdir(), 'moai-api-node-'));
const visitados = new Set();
try {
  writeFileSync(resolve(temporal, 'package.json'), JSON.stringify({ type: 'module' }));
  symlinkSync(resolve(raiz, 'node_modules'), resolve(temporal, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');

  function emitir(origen) {
    if (visitados.has(origen)) return;
    visitados.add(origen);
    const ruta = relative(raiz, origen);
    if (ruta.startsWith('..')) throw new Error('Una importación sale del repositorio.');
    const destino = resolve(temporal, ruta.replace(/\.tsx?$/, '.js'));
    mkdirSync(dirname(destino), { recursive: true });
    if (origen.endsWith('.json')) { copyFileSync(origen, destino); return; }
    const codigo = ts.transpileModule(readFileSync(origen, 'utf8'), {
      fileName: origen,
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    writeFileSync(destino, codigo);
    // Leer el JavaScript emitido evita incluir imports que eran solo tipos.
    const ast = ts.createSourceFile(destino, codigo, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    for (const instruccion of ast.statements) {
      if (!ts.isImportDeclaration(instruccion) && !ts.isExportDeclaration(instruccion)) continue;
      const modulo = instruccion.moduleSpecifier;
      if (!modulo || !ts.isStringLiteral(modulo) || !modulo.text.startsWith('.')) continue;
      if (!['.js', '.mjs', '.cjs', '.json'].includes(extname(modulo.text))) {
        throw new Error(`Falta una extensión válida para Node: ${ruta} → ${modulo.text}`);
      }
      const objetivo = resolve(dirname(origen), modulo.text);
      const fuente = objetivo.endsWith('.js') && existsSync(objetivo.slice(0, -3) + '.ts')
        ? objetivo.slice(0, -3) + '.ts' : objetivo;
      emitir(fuente);
    }
  }

  emitir(resolve(raiz, 'api/index.ts'));
  const entrada = pathToFileURL(resolve(temporal, 'api/index.js')).href;
  const comprobacion = `
    import { createServer, request } from 'node:http';
    import { once } from 'node:events';
    const { default: handler } = await import(${JSON.stringify(entrada)});
    if (typeof handler !== 'function') throw new Error('La entrada no exporta una función.');
    const server = createServer(handler);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
      const resultado = await new Promise((resolve, reject) => {
        const req = request({ hostname: '127.0.0.1', port: server.address().port, path: '/api/health' }, res => {
          let body = '';
          res.setEncoding('utf8');
          res.on('data', parte => { body += parte; });
          res.on('end', () => resolve({ status: res.statusCode, tipo: res.headers['content-type'], body }));
        });
        req.on('error', reject); req.end();
      });
      if (resultado.status !== 503 || !resultado.tipo?.startsWith('application/json') || !JSON.parse(resultado.body).error) {
        throw new Error('La API no respondió con su error de configuración esperado.');
      }
      console.log('API cargada con Node nativo; respuesta JSON 503 esperada sin configuración.');
    } finally { await new Promise(resolve => server.close(resolve)); }
  `;
  const resultado = spawnSync(process.execPath, ['--input-type=module', '-e', comprobacion], {
    // No heredar ni NODE_OPTIONS/cargadores ni credenciales de Vercel/Google/correo/base.
    env: { PATH: process.env.PATH ?? '', ...(process.platform === 'win32' ? { SystemRoot: process.env.SystemRoot } : {}) },
    encoding: 'utf8', timeout: 20_000,
  });
  if (resultado.error) throw resultado.error;
  if (resultado.status !== 0) throw new Error(resultado.stderr || 'Falló el arranque nativo.');
  process.stdout.write(resultado.stdout);
  console.log(`Módulos emitidos: ${visitados.size}. Sin llamadas a servicios externos.`);
} finally {
  rmSync(temporal, { recursive: true, force: true });
}
