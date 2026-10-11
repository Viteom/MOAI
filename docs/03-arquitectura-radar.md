# MOAI · Arquitectura del Radar Micelial

Versión por fases · Borrador para revisión técnica y legal

El Radar Micelial avisa en los bordes de la pantalla cuando alguien de tu red está cerca, sin mostrar pines ni mapas. Este documento define cómo construirlo por fases, empezando por lo que se puede hacer bien y con poco riesgo.

## Decisión de alcance

- **Fase 0:** Radar simulado, con datos de mentira, para validar la sensación visual.
- **Fase 1:** Radar de zona, con internet y ubicación aproximada.
- **Fase 2:** Bluetooth y conexión sin internet (esbozo al final).

Bluetooth y la conectividad sin internet quedan para una actualización posterior: son lo más difícil (permisos, batería en segundo plano, revisión de las tiendas, pruebas en muchos teléfonos) y no hacen falta para validar la idea. El diseño de la fase 1 es compatible hacia adelante, para no rehacerlo después.

## Qué es el Radar y qué no

Es:

- Un aviso visual suave en el borde de la pantalla: «alguien de tu tronco está en tu zona».
- Mutuo: solo funciona entre personas que se lo permitieron una a la otra.
- Aproximado: dice «cerca», nunca «aquí».

No es:

- Un mapa, ni pines, ni coordenadas.
- Una forma de pedir la ubicación de alguien.
- Un historial: no se guarda dónde estuviste.

## Principios que no se negocian

- Ubicación aproximada, nunca exacta (permiso de ubicación aproximada del sistema).
- Dos consentimientos por cada vínculo, con fecha de vencimiento, que se pueden retirar en un toque.
- Nada de ubicación en Neo4j ni en ninguna base de datos permanente.
- El servidor no puede leer dónde está nadie.
- Sin nombres por defecto: el nombre solo aparece si ambas personas aceptan un saludo.
- Los Perfiles Brote (menores) nunca comparten ubicación.

## Fase 1 · Radar de zona

### Cómo funciona

1. **Consentimiento.** Cada persona activa el Radar para cada vínculo por separado, por un tiempo definido (propuesta: 7 días, renovables). Funciona solo si ambas lo activaron.
2. **Secreto compartido.** Cuando se acepta el vínculo, los dos teléfonos acuerdan una clave que solo ellos conocen, mediante un intercambio de claves estándar. El servidor no la ve.
3. **Celda aproximada.** El teléfono convierte la ubicación aproximada en una celda de una cuadrícula del tamaño de un barrio (por ejemplo, la cuadrícula hexagonal H3, resolución 7 u 8; el tamaño se calibra).
4. **Etiquetas por pareja.** Para cada vínculo con Radar activo, el teléfono calcula una etiqueta opaca a partir de la clave compartida, la celda y la hora redondeada, y la publica en un buzón con caducidad corta. También calcula las de las celdas vecinas, para cubrir los límites entre celdas.
5. **Comparación en el dispositivo.** El teléfono baja las etiquetas que publicó su pareja y las compara con las propias. Si coinciden, están en la misma zona.
6. **Aviso.** Se enciende el borde con el color del anillo (raíz, tronco o rama), sin nombre.
7. **Saludo opcional.** Si la persona toca el aviso, se ofrece enviar un saludo; solo si el otro acepta, se revelan los nombres.

### Qué ve el servidor y qué no

| Dato | ¿Lo ve el servidor? |
| --- | --- |
| Quién está vinculado con quién | Sí (ya está en el grafo) |
| Que alguien publicó etiquetas, y cuándo | Sí (es un metadato) |
| La celda, las coordenadas o el barrio | No |
| Si dos personas coinciden en zona | No (se compara en los teléfonos) |
| El contenido del saludo | No (cifrado de extremo a extremo) |

### Componentes

| Componente | Tecnología sugerida | Qué hace | Qué no guarda |
| --- | --- | --- | --- |
| App móvil | React Native con módulos nativos | Ubicación aproximada, cálculo de celdas y etiquetas, comparación, avisos | Historial de ubicaciones |
| Cifrado | Una librería auditada, como libsodium | Intercambio de claves y etiquetas | Nada propio: no inventar criptografía |
| Almacén seguro local | Keychain de iOS y Keystore de Android | Guarda las claves compartidas | No aplica |
| Buzón de etiquetas | Almacén en memoria con caducidad (por ejemplo, Redis) | Recibe y entrega etiquetas por pareja, con TTL de minutos u horas | Ninguna etiqueta después de caducar |
| API | Node.js o Python | Autenticación, permisos, buzón, notificaciones | Ubicaciones |
| Notificaciones | APNs y FCM | Avisos con texto genérico | Datos sensibles en el mensaje |
| Neo4j | Ya definido | Solo vínculos y permisos de Radar | Coordenadas o celdas |

### Batería

- No hay GPS continuo: se usan los servicios de bajo consumo del sistema (cambio significativo de ubicación en iOS; ubicación de potencia equilibrada y geovallas en Android).
- Se publican y consultan etiquetas solo cuando cambia la celda o cada cierto intervalo largo, agrupando las llamadas de red.
- El Radar se apaga solo fuera del horario que elija la persona.

### Anti-acoso y seguridad

- La persona define zonas de exclusión (su casa, su trabajo) donde nunca emite; el cálculo es local.
- Límite de avisos por día y enfriamiento tras cada uno.
- Quien fue bloqueada o silenciada no recibe aviso, ni rastro de que existió.
- Retirar el permiso corta el Radar para esa pareja al instante.
- Modo viaje: nunca se comparte que alguien está de viaje salvo que lo decida.
- Texto de aviso genérico («alguien de tu gente está cerca») para que nada sensible pase por los servicios de notificación de Apple o Google.

### Experiencia

- Borde luminoso con el color del anillo; la intensidad indica si la persona está en tu celda o en una vecina.
- Sin números, sin conteos, sin cifras de «cuántos cerca».
- Un botón de pausa siempre a la vista.
- Los avisos de noche vienen apagados por defecto.

## Fase 2 · Bluetooth y sin internet (esbozo)

- Reutiliza la clave compartida por pareja: el anuncio Bluetooth lleva un identificador que rota cada pocos minutos y que solo la pareja puede reconocer.
- Escaneo con ciclos de trabajo cortos para cuidar la batería; permisos de Bluetooth y de ubicación cercana en iOS y Android.
- Da proximidad real (decenas de metros) y funciona sin internet.
- La conectividad por SMS o USSD para zonas sin datos se diseña aparte: no soporta Bluetooth ni proximidad, así que ofrece solo avisos como «tu Moai te piensa».

## Cambios mínimos en Neo4j

El grafo guarda permisos, nunca ubicación. El Radar está activo cuando ambas personas consintieron y el permiso no ha vencido.

```
MATCH (a:Persona {id: $a})-[r:RAIZ|TRONCO|RAMA]-(b:Persona {id: $b})
SET r.radarConsienten = [x IN coalesce(r.radarConsienten, []) WHERE x <> $a] + [$a],
    r.radarHasta = datetime() + duration('P7D')
RETURN r.id, size(r.radarConsienten) = 2 AS radarActivo
```

El servidor solo entrega etiquetas de una pareja cuando radarActivo es verdadero y radarHasta no ha vencido.

## Riesgos y límites

- **Fiabilidad en segundo plano.** iOS y Android limitan lo que una app puede hacer con la pantalla apagada, y algunos fabricantes de Android son más agresivos. Hay que prometer «presencia aproximada», no tiempo real, y probar en teléfonos de gama baja.
- **Metadatos.** Aunque el servidor no vea dónde estás, sí ve cuándo publicas etiquetas. Se puede reducir con publicaciones a intervalos fijos, pero no desaparece del todo.
- **Lenguaje.** «Zero-Knowledge» tiene un significado técnico estricto que este diseño no cumple por completo. Conviene decir «cifrado de extremo a extremo y privacidad por diseño».
- **Claves.** Si el servidor entrega las claves publicas, podría sustituirlas (ataque de intermediario). Se mitiga verificando las claves al aceptar el vínculo, por ejemplo en persona durante un Tiempo Festivo.
- **Revisión.** Antes de lanzar hacen falta una revisión de seguridad independiente y un concepto legal sobre la Ley 1581 y los datos de ubicación.

## Decisiones por tomar

- Tamaño de la celda: ¿barrio o una zona más amplia?
- Duración por defecto del permiso: ¿7 días?
- ¿Se empieza con el Radar de zona o con avisos de «llegué» en los Puntos Neutros, que no usan ubicación?
- Si un aviso puede insinuar el anillo (raíz, tronco o rama) o solo decir «alguien de tu gente.»

