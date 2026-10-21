# Mi gente · red orbital y fichas personales

Implementación del 20 de octubre de 2026, rama `codex/mi-gente-redesign`, basada en `rediseno/internas` (`5b77505`). Conserva el rediseño anterior de Mi barrio y la navegación inferior. El alcance visual es exclusivamente `/gente`; los cambios compartidos de servidor soportan sus datos y permisos.

## Diseño y referencia

La referencia orbital aportada guía la composición: centro pequeño, órbitas suaves y nombres horizontales. Se adapta a MOAI con azul `#11374A`, verde petróleo, lila `#C0B6EB`, menta `#8BE4D5` y selección lima `#CEFA63`. Usa Inter, los recursos existentes `cabecera-gente` y `luz-orbe`, SVG para curvas y botones HTML para nodos. No se añade ninguna dependencia.

El encabezado reúne título, selector, búsqueda, agregar y filtros. Red abre por defecto; `?vista=lista` / `?vista=red` conserva la elección al recargar la dirección, sin almacenamiento del navegador. Una persona seleccionada mantiene su ficha al alternar vistas. Lista tiene tarjetas por categoría y Mis Moais; Red distingue personas y grupos y solo dibuja pertenencias al seleccionar un Moai.

Diferencias deliberadas con la referencia: se omiten los paneles técnicos y textos diminutos, se conservan nombres de 18 px y controles de al menos 48 px. En móvil las órbitas se recorren verticalmente; en tableta y redes numerosas hay desplazamiento interno. Lista y los filtros permanecen accesibles. La navegación inferior tiene espacio reservado. Las fichas tienen desplazamiento propio y se presentan como hoja inferior en móvil; Escape cierra y devuelve el foco.

No hay fotos en el modelo existente: se usan iniciales. No falta un recurso gráfico imprescindible para esta propuesta.

## Modelo y permisos

- Categoría y pertenencia son independientes. Contactos personales conservan Raíz/Tronco según `moai_interno.familia`. Las cuentas conocidas y miembros visibles de grupos compartidos son Ramas; compartir un grupo no los promueve a Tronco.
- Una cuenta aparece una vez, con referencias HMAC distintas para cada observador y todos los Moais que realmente comparte con él. No se unen personas por nombre. Una invitación pendiente no da pertenencia. Solo se consultan grupos del observador; se excluyen cuentas suspendidas y bloqueos en ambos sentidos.
- `GET/POST /api/lazos/:persona/ficha` exige sesión y vínculo accesible. Las notas `comoNosConocemos`, `algoCompartimos`, `nota` son opcionales, con límites 160/160/500 y validación de tipos. Se guardan usando el cifrador existente en `fichas_vinculo`, con clave compuesta por cuenta autora y referencia del contacto. No aparecen en `/lazos`, perfiles o Vecinos. Guardar todos los campos vacíos borra la ficha. Se incluyen en la descarga propia; quitar el contacto personal o eliminar la cuenta elimina sus notas.
- `POST /api/lazos/:persona/categoria` permite Raíz/Tronco para contactos personales. Para cuentas devuelve 409 y explica que cambiar categoría necesita confirmación mutua: el proyecto aún no tiene ese flujo. No se simula una promoción unilateral.
- Mi presentación reutiliza `/api/perfil-publico`. Añade `nombrePreferido` y un permiso independiente `visibleEnRed`, apagado por defecto. El permiso existente `visible` de Vecinos no lo activa. Clientes anteriores que no envían los campos nuevos conservan la elección previa. La presentación de otra persona solo se devuelve si está autorizada; es de solo lectura.
- Conversar abre el Moai compartido; no se incorpora mensajería directa. Invitar usa el flujo existente de aprobación y aceptación, exige un encuentro confirmado, grupo propio con espacio y ausencia de pausa. La ficha explica las acciones que no están disponibles.
- Los estados existentes reflejan contacto registrado, nunca emociones o calidad afectiva. Se distinguen por forma y texto accesible además de color. Las órbitas no son puntuaciones de afecto y no se inventan conexiones entre terceros.

## Verificación

Capturas reales de Chromium, usando exclusivamente datos ficticios interceptados durante las pruebas. La aplicación no contiene datos de ejemplo ni cambia las consultas de producción. Permisos y persistencia se verifican además contra el servidor Fastify y una base PGlite real en las pruebas de integración.

| Tamaño | Red | Lista | Ficha |
| --- | --- | --- | --- |
| 390 × 844 | [Captura](capturas/mi-gente-orbital/390x844-red.png) | [Captura](capturas/mi-gente-orbital/390x844-lista.png) | [Captura](capturas/mi-gente-orbital/390x844-ficha.png) |
| 768 × 1024 | [Captura](capturas/mi-gente-orbital/768x1024-red.png) | [Captura](capturas/mi-gente-orbital/768x1024-lista.png) | [Captura](capturas/mi-gente-orbital/768x1024-ficha.png) |
| 1440 × 900 | [Captura](capturas/mi-gente-orbital/1440x900-red.png) | [Captura](capturas/mi-gente-orbital/1440x900-lista.png) | [Captura](capturas/mi-gente-orbital/1440x900-ficha.png) |

En cada tamaño: búsqueda con tildes y mayúsculas, filtros, selección, cambio Red/Lista sin perder la ficha, cierre con botón/Escape y foco restaurado, dos pertenencias de una persona, resalte de miembros, apertura de grupo, guardar notas, agregar contacto y editar presentación con consentimiento apagado. Sin errores JavaScript, solicitudes a terceros ni desbordamiento horizontal de la página. Orbe medido en 72 px; contenido fuera de la navegación inferior.

También se prueban redes vacías y 48 personas con nombres largos, incluido un nombre sin espacios. Se comparan las cajas reales de los nodos para detectar superposiciones, se abre la última persona, se filtra por categoría y se verifica coherencia con Lista. Capturas adicionales `*-vacia.png` y `*-nombres-largos.png`; resultados en `verificacion.json` y `verificacion-extremos.json`. Se corrigió el cálculo de espacio de nombres compuestos después de detectar una superposición real en tableta.

Comprobaciones: `npm test -- --maxWorkers=2` (244 pruebas en 31 archivos) y `npm run build`. Vite mantiene su advertencia sobre el paquete principal mayor de 500 kB; dividir toda la aplicación queda fuera de este alcance.

## Antes de fusionar

**Requiere revisión humana de datos personales, cifrado y consentimiento**, conforme a `CLAUDE.md`. La migración es aditiva e idempotente. Se actualizaron Política y `VERSION_TEXTOS`; la aceptación de textos nuevos por cuentas anteriores sigue siendo un pendiente previo del proyecto. La promoción mutua entre cuentas, las fotos y los mensajes directos no se implementan aquí; la interfaz explica las opciones disponibles. No se ha publicado a producción ni fusionado a `main`.
