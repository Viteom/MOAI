// Términos de uso y Política de tratamiento de datos (Ley 1581 de 2012 y Decreto 1074 de 2015, Colombia).
// BORRADOR escrito por el equipo a partir de prácticas comunes de servicios similares: pasa al equipo jurídico
// antes de salir a producción. Regla 10: cada frase debe coincidir con lo que hace el código. Si cambias
// qué se guarda, cuánto dura o con quién se comparte, cambia este archivo y sube VERSION_TEXTOS (registro.ts).

// Datos del responsable: los completa el equipo jurídico.
export const RESPONSABLE = {
  nombre: 'MOAI Ciudades del Cuidado',
  identificacion: 'NIT por definir',
  domicilio: 'Medellín, Colombia',
  correo: 'correo de contacto por definir',
};

export const FECHA_TEXTOS = '14 de octubre de 2026';

export type Seccion = { titulo: string; parrafos?: string[]; lista?: string[] };
export type Texto = { titulo: string; bajada: string; secciones: Seccion[] };

const contacto = `${RESPONSABLE.nombre} (${RESPONSABLE.identificacion}), con domicilio en ${RESPONSABLE.domicilio}. Correo: ${RESPONSABLE.correo}.`;

export const privacidad: Texto = {
  titulo: 'Política de tratamiento de datos',
  bajada: `Versión borrador del ${FECHA_TEXTOS}. Te contamos qué datos guardamos, para qué, por cuánto tiempo y cómo puedes decidir sobre ellos.`,
  secciones: [
    { titulo: '1. Quién cuida tus datos', parrafos: [
      `El responsable del tratamiento es ${contacto}`,
      'Esta política sigue la Ley 1581 de 2012, el Decreto 1074 de 2015 y las demás normas colombianas de protección de datos personales.',
    ] },
    { titulo: '2. Qué datos guardamos', lista: [
      'Tu nombre, tal como lo escribiste. En los planes, otras personas solo ven tu primer nombre.',
      'Tu correo electrónico (o tu número de WhatsApp, cuando esa opción esté disponible), para enviarte los códigos de acceso.',
      'Tu fecha de nacimiento, para confirmar que eres mayor de edad y recordar fechas importantes para ti, como tu cumpleaños.',
      'Tu municipio y, si lo eliges, tu barrio.',
      'Tus lugares guardados (hasta cinco), como zonas aproximadas de cerca de 1 km. Nunca guardamos tu dirección ni tus coordenadas, ni un historial de dónde has estado.',
      'Los planes que propones (qué, cuándo y en qué lugar público), los planes a los que te sumas y los mensajes que escribes en la conversación de cada plan.',
      'Tus preferencias: si quieres recomendaciones, los tipos de plan que te interesan y si quieres el correo semanal.',
      'Con quién confirmaste que te viste después de un plan («Sí, nos vimos» o «No coincidimos»).',
      'Los Moais de los que haces parte, su nombre, las invitaciones y tus respuestas a ellas, y los mensajes que escribes en la conversación de cada Moai.',
      'A quién bloqueaste y los reportes que haces: a quién, el motivo y lo que quieras contar.',
      'Si lo autorizas, el resultado del test «¿Cómo cuidas y cómo te cuidas?» (las respuestas que elegiste), cifrado. Puede considerarse un dato sensible: responderlo y guardarlo es opcional y no cambia nada de lo que puedes hacer en MOAI. No es un diagnóstico.',
      'Tu Moai interno: los nombres de las personas que te nutren, quiénes son para ti, si son de tu familia y cuándo marcaste que hablaron, cifrados. Pueden ser personas que no usan MOAI; solo guardamos lo que tú escribes.',
      'Tu tarjeta para vecinos, si la armas con Brisa: una frase, lo que te gusta, lo que compartes y lo que quieres aprender, y si apruebas mostrarla.',
      'Tu estado, solo si tú lo declaras: si estás en invierno (cifrado), si dejaste tu puerta abierta y a quién le contaste tu invierno.',
      'Los saludos de lejos que envías y recibes.',
      'La prueba de que aceptaste estos textos: fecha y versión.',
      'Datos técnicos mínimos para tu sesión: una cookie de sesión y los códigos de acceso, que guardamos cifrados (no en claro).',
    ] },
    { titulo: '3. Lo que no guardamos', lista: [
      'Tu ubicación exacta, tu dirección ni un historial de ubicaciones.',
      'Tu libreta de contactos.',
      'Datos de salud ni deducciones sobre tu ánimo, tu salud o tu personalidad.',
      'Contraseñas: entras siempre con un código que vence en 10 minutos.',
      'Identificadores publicitarios. No usamos cookies de publicidad ni de seguimiento.',
    ] },
    { titulo: '4. Para qué los usamos', lista: [
      'Crear tu cuenta, confirmar que el correo es tuyo y permitirte entrar.',
      'Mostrarte planes de personas cercanas y mostrar los tuyos a quienes están cerca, según el alcance que elijas.',
      'Que las personas que van a un plan puedan conversar entre ellas.',
      'Que puedas formar un Moai con personas con las que ya te viste, y conversar con tu Moai.',
      'Cuidar la convivencia: si dos personas distintas reportan a alguien en 90 días, su cuenta queda en pausa (no puede proponer planes, escribir ni invitar) hasta que una persona del equipo revise el caso.',
      'Cuidar las conversaciones: antes de enviar un mensaje a un plan o a un Moai, MOAI lo revisa de forma automática, sin inteligencia artificial y sin que nadie lo lea. Si tiene amenazas, insultos graves o contenido sexual, no se envía; si pide dinero, comparte un teléfono, una casa o un dato sensible, te avisamos y tú decides. No guardamos el resultado de esa revisión.',
      'Cuidarte a ti: si lo autorizas, recordarte cuidar tus límites y a quienes te nutren, como mucho una vez por semana. Tu Moai interno sirve solo para eso.',
      'Acercarte a tus vecinos sin exponerte: mostrar tu tarjeta a tus vecinos (en Mi barrio, «Vecinos») si lo apruebas, y llevar los saludos de lejos.',
      'Bajar el ritmo cuando nos cuentas que estás en invierno: mientras dure, no te sugerimos planes ni te enviamos correos de planes.',
      'Enviarte recordatorios para confirmar tu cuenta y, solo si lo activas, un correo semanal con planes cercanos (máximo uno por semana).',
      'Recomendarte planes, solo si lo activas y solo con los tipos de plan que elegiste. Siempre puedes ver por qué te recomendamos algo.',
      'Cuidar la seguridad del servicio y cumplir obligaciones legales.',
    ], parrafos: [
      'No vendemos tus datos, no los usamos para publicidad y no los usamos para entrenar modelos de inteligencia artificial de terceros.',
    ] },
    { titulo: '5. Quién ve qué', lista: [
      'Tu correo, tu fecha de nacimiento y tus lugares guardados: solo tú.',
      'Tus planes: las personas cuya zona entra en el alcance que elegiste. Ven tu primer nombre, el plan, el lugar público, la fecha y una distancia aproximada por franjas, nunca exacta.',
      'La conversación de un plan: solo quienes van a ese plan. Ni Brisa ni el equipo la leen; el equipo solo ve un mensaje si alguien lo reporta.',
      'Tus respuestas a «¿Te viste con…?»: nadie más. Solo cuando las dos personas dicen que sí, cada una ve a la otra en «Mi gente».',
      'Tu Moai: sus miembros ven tu primer nombre y la conversación del Moai. Ni Brisa ni el equipo la leen; el equipo solo ve un mensaje si alguien lo reporta. Cuando votas para sumar a alguien, nadie sabe qué votaste.',
      'Tus bloqueos y reportes: la persona no sabe que la bloqueaste ni quién la reportó. Los reportes los lee solo el equipo que revisa los casos, que ve tu primer nombre, lo que contaste, el texto del mensaje si reportaste un mensaje y el correo de la persona reportada, para poder escribirle.',
      'Si eres responsable de una entidad: el equipo de MOAI ve tu correo. Tus convocatorias se publican con el nombre de la entidad, no con el tuyo.',
      'El resultado del test de cuidado y tu Moai interno: solo tú. Se guardan cifrados.',
      'Tu red en «Mi gente»: solo tú. Se arma con lo que ya está en tu cuenta (tu Moai interno, tus Moais y con quién te viste) y muestra cómo va cada vínculo por colores, nunca con números.',
      'Tu tarjeta (primer nombre, frase, gustos, lo que compartes y quieres aprender): solo si apruebas mostrarla, la ven vecinos de tu zona. Nunca ven tu dirección ni tu ubicación: solo «cerca» o «en tu zona».',
      'Tu puerta abierta: solo las personas con las que ya te viste. Tu invierno: solo las personas a quienes tú elijas contárselo, y nadie más.',
      'Un saludo de lejos: la persona que lo recibe ve tu primer nombre y la frase que elegiste.',
    ] },
    { titulo: '6. Brisa', parrafos: [
      'Brisa es una inteligencia artificial, no una persona. Hoy sus mensajes se generan dentro de MOAI a partir de tus planes y preferencias, sin enviar tus datos a proveedores externos de inteligencia artificial. Lo que le escribes a Brisa en la conversación de inicio no se guarda ni se envía a nadie: solo vive en tu pantalla. La excepción es lo que tú decides guardar al final de una conversación, como tu tarjeta, tu estado o el resultado del test. Si eso cambia, te lo diremos antes y te pediremos autorización.',
    ] },
    { titulo: '7. Cuánto tiempo los guardamos', lista: [
      'Mientras tengas tu cuenta activa.',
      'Si no confirmas tu cuenta, la borramos a los 20 días.',
      'Si la fecha de nacimiento muestra que eres menor de 18 años, borramos la cuenta de inmediato.',
      'Las conversaciones de los planes se borran 30 días después del plan o de su cancelación.',
      'La conversación de cada Moai guarda solo los mensajes de los últimos 90 días. Si sales de un Moai, dejas de verla; si nadie queda, el Moai se borra.',
      'Los reportes, con el texto del mensaje reportado cuando lo hay, se guardan mientras exista tu cuenta o la de la persona reportada, para poder revisar casos repetidos.',
      'El resultado del test de cuidado se guarda hasta que lo borres. Si respondes el test sin autorizar que lo guardemos, no queda guardado. Tu Moai interno se guarda hasta que quites a cada persona.',
      'Tu invierno, hasta que le digas a Brisa que saliste; en ese momento también olvidamos a quién se lo contaste. La puerta abierta se cierra sola a los 7 días. Los saludos de lejos se borran a los 30 días. Tu tarjeta, hasta que la cambies o la borres.',
      'Las sesiones vencen a los 30 días.',
      'Si borras tu cuenta (en «Más», «Mi cuenta»), borramos de inmediato tus datos: tu cuenta, lugares, planes, mensajes, Moai interno, test, tarjeta, invierno, reportes y bloqueos. Los Moais siguen para quienes quedan, sin ti.',
    ] },
    { titulo: '8. Con quién los compartimos', parrafos: [
      'Solo con proveedores que nos ayudan a prestar el servicio y que actúan bajo nuestras instrucciones (encargados del tratamiento):',
    ], lista: [
      'Resend, para enviar los correos con tus códigos y avisos. Sus servidores pueden estar en Estados Unidos, lo que implica una transmisión internacional de tu correo y del contenido del mensaje.',
      'Twilio, para los códigos por WhatsApp, cuando esa opción esté disponible.',
      'El proveedor de alojamiento del servidor y la base de datos (por definir).',
      'Autoridades, solo cuando una norma o una orden lo exija.',
    ] },
    { titulo: '9. Tus derechos', parrafos: ['Como titular de tus datos puedes, en cualquier momento y sin costo:'], lista: [
      'Conocer, actualizar y corregir tus datos.',
      'Pedir prueba de la autorización que nos diste.',
      'Saber cómo hemos usado tus datos.',
      'Revocar tu autorización y pedir que borremos tus datos, cuando no exista un deber legal de conservarlos.',
      'Presentar quejas ante la Superintendencia de Industria y Comercio, después de haber hecho tu consulta o reclamo ante nosotros.',
    ] },
    { titulo: '10. Cómo ejercerlos', parrafos: [
      'Desde MOAI, en «Más», «Mi cuenta», puedes descargar todos tus datos en un archivo y borrar tu cuenta, sin escribirle a nadie.',
      `Para lo demás, escríbenos a ${RESPONSABLE.correo} desde el correo con el que creaste tu cuenta, diciendo qué necesitas.`,
      'Respondemos las consultas en un máximo de 10 días hábiles (prorrogables 5 más) y los reclamos en un máximo de 15 días hábiles (prorrogables 8 más), como indica la ley. Si necesitamos más tiempo, te contamos por qué.',
    ] },
    { titulo: '11. Seguridad', parrafos: [
      'Guardamos los códigos y las sesiones cifrados, usamos una cookie de sesión que el código de las páginas no puede leer, y nuestros registros técnicos no incluyen tu correo, tu ubicación ni tus mensajes. Ningún sistema es perfecto: si ocurre un incidente que afecte tus datos, te avisaremos a ti y a la autoridad.',
    ] },
    { titulo: '12. Menores de edad', parrafos: [
      'MOAI es solo para personas mayores de 18 años. No recogemos datos de menores a sabiendas.',
    ] },
    { titulo: '13. Cambios a esta política', parrafos: [
      'Si cambiamos qué datos guardamos o para qué, te lo contaremos antes y te pediremos aceptar la nueva versión. Guardamos la versión que aceptaste.',
    ] },
  ],
};

export const terminos: Texto = {
  titulo: 'Términos de uso',
  bajada: `Versión borrador del ${FECHA_TEXTOS}. Son las reglas para que MOAI sea un lugar seguro y cálido para todas las personas.`,
  secciones: [
    { titulo: '1. Qué es MOAI', parrafos: [
      `MOAI es una plataforma para encontrarse con personas cercanas en planes sencillos y en lugares públicos. La ofrece ${contacto}`,
      'Usar MOAI es gratis.',
    ] },
    { titulo: '2. Lo que MOAI no es', parrafos: [
      'MOAI no es un servicio de emergencias, ni un servicio médico o psicológico, y no vigila a nadie. Si tú o alguien más está en peligro, llama a la línea de emergencias 123. Si estás pasando por un momento difícil, busca a una persona de confianza o a una línea de ayuda profesional.',
    ] },
    { titulo: '3. Quién puede usarlo', lista: [
      'Personas mayores de 18 años.',
      'Una cuenta por persona, con tu nombre real o el nombre con el que te conocen.',
      'Tú cuidas el acceso a tu correo: quien tenga tus códigos puede entrar a tu cuenta.',
    ] },
    { titulo: '4. Los planes', lista: [
      'Los planes son siempre en lugares públicos: un parque, una biblioteca, un café. Nunca en la casa de nadie.',
      'No se permiten planes con fines comerciales, de venta, de captación de dinero, políticos o religiosos de proselitismo.',
      'Quien propone un plan no es guía, ni anfitrión profesional, ni responde por los demás. Cada persona decide si va y cuida de sí misma.',
      'Si cambias de idea, cancela o sal del plan para que nadie te espere.',
    ] },
    { titulo: '5. Cómo nos tratamos', parrafos: ['En MOAI no se permite:'], lista: [
      'Acosar, amenazar, discriminar o humillar a otras personas.',
      'Pedir dinero, datos personales o encuentros en lugares privados.',
      'Hacerse pasar por otra persona.',
      'Publicar contenido sexual, violento o ilegal.',
      'Usar MOAI para enviar publicidad o mensajes masivos.',
    ] },
    { titulo: '6. Seguridad en los encuentros', lista: [
      'Encuéntrate en el lugar público del plan y a la hora acordada.',
      'Cuéntale a alguien de confianza a dónde vas.',
      'No compartas tu dirección ni datos bancarios.',
      'Si algo te incomoda, vete. No le debes explicaciones a nadie.',
    ] },
    { titulo: '7. Moais, bloqueos y reportes', lista: [
      'Un Moai es un grupo de 2 a 5 personas que ya se vieron en persona. Para sumar a alguien, todos los miembros deben estar de acuerdo. Puedes salir cuando quieras, sin explicaciones.',
      'Puedes bloquear a cualquier persona: dejarás de ver sus planes, no verá los tuyos y no podrá invitarte a un Moai. No le avisamos.',
      'Puedes reportar una indelicadeza. La persona nunca sabrá quién la reportó.',
      'Si dos personas distintas reportan a alguien en 90 días, su cuenta queda en pausa hasta que una persona del equipo revise el caso: puede ver planes y sumarse, pero no proponer, escribir ni invitar. Un solo reporte no pausa a nadie.',
      'Reportar a alguien a sabiendas de que no hizo nada también incumple estas reglas.',
      'El equipo puede cerrar un caso sin medidas, o suspender una cuenta: la persona no puede entrar y sus planes dejan de verse. Le escribimos para contarle por qué, y puede responder si cree que es un error.',
    ] },
    { titulo: '8. Convocatorias de entidades', lista: [
      'Entidades públicas, empresas y organizaciones comunitarias pueden publicar convocatorias (por ejemplo, «Buscamos 5 personas para sembrar árboles»). Solo el equipo de MOAI las da de alta, con una persona responsable.',
      'Las convocatorias siguen las mismas reglas que los planes: en lugares públicos, sin cobrar, sin vender y sin proselitismo político o religioso.',
      'Sumarte a una convocatoria no te vuelve parte de la entidad ni le da tus datos: la entidad ve tu primer nombre, igual que en cualquier plan.',
    ] },
    { titulo: '9. Brisa', parrafos: [
      'Brisa es una inteligencia artificial que te acompaña en MOAI. Puede equivocarse, no reemplaza a una persona y nunca da consejos médicos, legales ni financieros.',
    ] },
    { titulo: '10. Lo que publicas', parrafos: [
      'Lo que escribes en tus planes y conversaciones es tuyo. Nos das permiso para mostrarlo a las personas que corresponda dentro de MOAI, y solo para eso. Si cancelas un plan, deja de mostrarse, y su conversación se borra 30 días después.',
    ] },
    { titulo: '11. Si algo sale mal', parrafos: [
      'Podemos ocultar planes o suspender cuentas que incumplan estas reglas, y te contaremos por qué. Si crees que nos equivocamos, escríbenos.',
      'MOAI se ofrece tal como está. Hacemos lo posible para que funcione bien, pero no respondemos por lo que ocurra entre personas en los encuentros, más allá de lo que la ley colombiana establezca.',
    ] },
    { titulo: '12. Tu cuenta', parrafos: [
      `Puedes dejar de usar MOAI cuando quieras y pedir que borremos tu cuenta escribiendo a ${RESPONSABLE.correo}. Lo que pasa con tus datos está en la Política de tratamiento de datos.`,
    ] },
    { titulo: '13. Cambios y ley aplicable', parrafos: [
      'Si cambiamos estos términos, te lo contaremos antes y te pediremos aceptarlos de nuevo.',
      'Estos términos se rigen por las leyes de Colombia.',
    ] },
  ],
};
