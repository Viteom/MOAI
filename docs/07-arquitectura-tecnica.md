# MOAI · Arquitectura técnica general

Borrador 1 · Propuesta de pila tecnológica, servicios y plan de construcción

Este documento reúne las decisiones técnicas pendientes en un solo plano. Todo es una recomendación para que un responsable técnico la valide: las versiones, los precios y las condiciones de los servicios cambian, y hay que confirmarlos antes de decidir.

## Qué se construye primero

- **Prototipo cero:** clicable y sin backend. Onboarding y pantalla principal con la ciudad de Medellín. Sirve para validar la sensación y mostrar la visión. No se asume como base del producto real.
- **Producto real (fase 1):** aplicación móvil, backend y grafo, siguiendo los hitos del final de este documento.

## Visión de conjunto

| Capa | Tecnología sugerida | Responsabilidad | Alternativa |
| --- | --- | --- | --- |
| Aplicación móvil | React Native con TypeScript y módulos nativos | Interfaz, ubicación aproximada, cifrado local, almacenamiento seguro | Flutter |
| Escena y animación | Capas de imagen con paralaje y animaciones ligeras | Fondo por capas, luces, árbol vital | Un motor de animación interactiva, a evaluar |
| API | Node.js con TypeScript (por ejemplo, NestJS o Fastify) | Autenticación, permisos, Esporas, Moais, buzón del Radar, cartas | Python con FastAPI |
| Base transaccional | PostgreSQL | Cuentas, consentimientos, preferencias, colas de notificaciones, registros | No aplica |
| Grafo | Neo4j, administrado o autohospedado | Vínculos, Moais, encuentros, animales, plantas, eventos | No aplica |
| Datos efímeros | Redis | Buzón de etiquetas del Radar con caducidad y límites de frecuencia | No aplica |
| Archivos | Almacenamiento de objetos con CDN | Fondos por ciudad, capas, imágenes en formatos modernos | No aplica |
| Cifrado | Una librería auditada, como libsodium | Claves compartidas, etiquetas, mensajes y datos íntimos | No aplica |
| Notificaciones | APNs (Apple) y FCM (Google) | Avisos con texto genérico | No aplica |
| Inteligencia artificial | API de un modelo de lenguaje con contrato de no retención | Variar las cartas con contexto grueso | Modelo pequeño en el dispositivo: más privado, más limitado |
| Clima | Servicio de clima consultado por identificador de ciudad | Fondo y cartas | Fuente oficial, si ofrece datos aprovechables (por confirmar) |
| SMS | Proveedor con número corto | Código de acceso y aviso de «estoy bien» | WhatsApp Business: costos y políticas por verificar |
| Observabilidad | Registro de errores y métricas sin datos personales | Detectar fallos | No aplica |
| Infraestructura | Nube pública (AWS o GCP) con infraestructura como código | Despliegue repetible | No aplica |

## Por qué más de una base de datos

- Neo4j es excelente para vínculos, pero no para cuentas ni registros de consentimiento, que necesitan transacciones y auditoría. No conviene meter todo en el grafo.
- Los identificadores (UUID) son los mismos en PostgreSQL y en Neo4j. Para mantenerlos coherentes se usa un patrón de eventos: se guarda el cambio en PostgreSQL y un proceso lo replica al grafo.
- Redis guarda solo lo que debe desaparecer solo (etiquetas del Radar, contadores de frecuencia).

## Identidad y acceso

- **Recomendación:** acceso por número de teléfono con un código por SMS o WhatsApp, y correo opcional. Para muchas personas mayores, el teléfono es su identidad principal.
- **Verificación de identidad cívica:** sigue pendiente (variables que se piden y quién aprueba). Es una decisión de producto antes que técnica.
- Sesiones renovables, cierre de sesión remoto y lista de dispositivos de confianza.

## Cifrado y privacidad en la práctica

- Las claves compartidas por pareja se guardan en el almacén seguro del teléfono (Keychain y Keystore).
- **Problema abierto: cambiar de teléfono.** Si las claves viven solo en el dispositivo, un teléfono nuevo pierde los vínculos cifrados. Opciones: re-vinculación asistida (la otra persona vuelve a aceptar) o una copia cifrada con una frase de recuperación, que es difícil para personas mayores. Recomiendo empezar por la re-vinculación asistida.
- La intención de la Espora va cifrada de punta a punta.
- Los registros técnicos no incluyen ubicación, contenido de mensajes ni datos personales.
- La estilización de la foto sigue pendiente (dispositivo o nube) y condiciona la promesa de privacidad.

## Radar y ubicación

Ver la arquitectura del Radar. En resumen: ubicación aproximada con los servicios de bajo consumo del sistema, celdas del tamaño de un barrio, etiquetas por pareja guardadas en Redis con caducidad y comparación en los teléfonos. Hay que probarlo en teléfonos de gama baja y en fabricantes con ahorro de batería agresivo.

## Cartas de Brisa

- Una biblioteca escrita a mano, por contexto, que la IA varía sin salirse de la voz.
- Solo contexto grueso: hora, clima y oficio. Nunca el estado emocional ligado a la identidad.
- Filtros de seguridad que prohíben temas como salud, crisis y dinero, y revisión humana al inicio.
- Si la IA falla, se envía una carta fija de la biblioteca.
- Control de costo por usuario al día, con caché por contexto.

## Escenas y rendimiento

- Imágenes en formatos modernos, en varias resoluciones y con carga progresiva: primero una versión borrosa y luego la nítida. Meta por validar: que la primera pantalla aparezca en pocos segundos con conexión móvil lenta.
- El vidrio esmerilado es costoso en teléfonos modestos. Debe degradarse con elegancia a un panel opaco.
- El Modo Ahorro apaga paralaje, vidrio y animaciones.

## Calidad y seguridad

- Pruebas unitarias, pruebas de las consultas Cypher con un grafo de prueba, pruebas de extremo a extremo en dispositivos reales y pruebas de accesibilidad.
- Revisión de seguridad independiente y pruebas de penetración antes de lanzar.
- Escaneo de dependencias y secretos fuera del código.
- Copias de seguridad, restauración probada y plan de respuesta a incidentes.
- Una evaluación interna de impacto sobre la privacidad antes de abrir a usuarios reales.

## Entornos y entrega

- Tres entornos: desarrollo, pruebas y producción, con despliegue automatizado.
- Distribución de versiones de prueba por las vías oficiales de Apple y Google.
- Interruptores de funciones para encender el Radar y el algoritmo de cuidado con grupos pequeños.

## Cómo construirlo con Claude Code

- Un repositorio único con carpetas para la aplicación, la API, los tipos compartidos, los scripts de datos y los documentos de MOAI.
- Un archivo CLAUDE.md con los principios, las convenciones y las decisiones ya tomadas.
- Reglas del proyecto: toda consulta a Neo4j lleva pruebas; todo lo que toque datos personales requiere revisión humana; nada de criptografía propia.
- Modelos: el más capaz para la arquitectura y las partes críticas (privacidad, cifrado, Radar), y el de volumen para pantallas, endpoints y pruebas.
- El código generado necesita revisión humana, sobre todo en seguridad y privacidad.

## Hitos de construcción (sin fechas)

1. **M0:** repositorio, entornos, despliegue automatizado y esquema base de ambas bases de datos.
2. **M1:** acceso por teléfono, perfil y las pantallas del onboarding.
3. **M2:** grafo con Espora y Polinización, y vínculos con sus fuerzas.
4. **M3:** ciudad y clima reales, fondos de Medellín por capas y cartas diarias.
5. **M4:** Moais múltiples y algoritmo de cuidado de nivel Moai.
6. **M5:** Radar de zona con cifrado y buzón de etiquetas.
7. **M6:** Modo Ahorro y Modo Cuidado en emergencias.
8. **M7:** endurecimiento, revisión de seguridad, concepto legal y beta cerrada.

## Decisiones técnicas por tomar

| Decisión | Recomendación | Alternativa |
| --- | --- | --- |
| Lenguaje del backend | TypeScript, para compartir tipos con la aplicación | Python |
| Alojamiento del grafo | Neo4j administrado | Autohospedado |
| Región de los datos | Una región cercana de la nube (por ejemplo, São Paulo), revisando la transferencia internacional | Región en Estados Unidos: más servicios, más implicaciones legales |
| Acceso | Teléfono con código por SMS | Correo o inicio con terceros |
| Claves al cambiar de teléfono | Re-vinculación asistida | Frase de recuperación cifrada |
| IA de las cartas | API con no retención por contrato | Modelo local |
| Estilizado de la foto | En el dispositivo | En la nube |
| Animaciones | Capas con animaciones ligeras | Motor de animación interactiva |
| SMS de «estoy bien» | Evaluarlo en la fase 1 con un proveedor | Esperar a la fase 2 |

## Riesgos técnicos

- El cifrado de punta a punta y el cambio de teléfono.
- La fiabilidad del Radar en segundo plano.
- El costo de la IA y de las imágenes por ciudad.
- La complejidad del grafo con Moais solapados.
- Un equipo pequeño con muchas piezas a la vez.
- Que las consultas Cypher no se hayan probado todavía contra una base de datos real.
