// ============================================================
// CONTENIDO LEGAL — BORRADOR
//
// IMPORTANTE: borrador pendiente de revisión jurídica antes de
// publicación. No constituye asesoría legal ni cuenta con aprobación
// de un abogado. Redactado considerando (sin garantizar cumplimiento
// exhaustivo de): Ley N.º 19.628 sobre protección de la vida privada,
// Ley N.º 21.719 (actualización de protección de datos personales),
// Ley N.º 20.584 sobre derechos del paciente (donde corresponde),
// Ley N.º 19.496 de protección al consumidor, y el Reglamento de
// Comercio Electrónico. Antes de publicar en producción, un abogado
// debe revisar y aprobar cada texto.
// ============================================================

export interface LegalSection {
  title: string;
  body: string[];
}

export interface LegalDocument {
  id: string;
  title: string;
  updatedAt: string;
  sections: LegalSection[];
}

export const LEGAL_DRAFT_DISCLAIMER =
  "Borrador pendiente de revisión jurídica antes de publicación. Este texto no constituye asesoría legal.";

export const privacyPolicy: LegalDocument = {
  id: "privacy-policy",
  title: "Política de privacidad",
  updatedAt: "2026-08-01",
  sections: [
    {
      title: "Rol de Geras",
      body: [
        "Geras es una plataforma de intermediación que conecta a familias con profesionales de cuidado y residencias para personas mayores. Geras no presta directamente los servicios de cuidado, salud o alojamiento: esa responsabilidad es del profesional o residencia con quien se contrata a través de la plataforma.",
      ],
    },
    {
      title: "Datos que recopilamos",
      body: [
        "Datos de identificación y contacto (nombre, correo, teléfono) de quien crea la cuenta.",
        "Datos de la persona mayor a cuidado cuando la familia los ingresa: nombre, fecha de nacimiento, relación, nivel de movilidad y necesidades generales — necesarios para conectar con un profesional adecuado.",
        "Datos de uso de la plataforma: solicitudes, reservas, mensajes de contacto y reseñas.",
      ],
    },
    {
      title: "Finalidad del tratamiento",
      body: [
        "Los datos se usan exclusivamente para: crear y gestionar la cuenta, conectar a la familia con profesionales o residencias, procesar solicitudes y reservas, enviar confirmaciones y notificaciones del servicio, y cumplir obligaciones legales o regulatorias cuando corresponda.",
      ],
    },
    {
      title: "Consentimiento",
      body: [
        "El tratamiento de datos de la persona mayor a cuidado requiere el consentimiento expreso de quien crea la solicitud en su nombre, otorgado al momento de registrarla en la plataforma.",
      ],
    },
    {
      title: "Conservación",
      body: [
        "Los datos se conservan mientras la cuenta esté activa y por el plazo adicional que exija la ley para fines contables, tributarios o de resolución de disputas.",
      ],
    },
    {
      title: "Seguridad",
      body: [
        "Se aplican medidas técnicas y organizativas razonables (control de acceso, cifrado en tránsito, políticas de acceso a nivel de fila en la base de datos) para proteger los datos contra acceso no autorizado, pérdida o alteración.",
      ],
    },
    {
      title: "Derechos del titular",
      body: [
        "Toda persona puede ejercer sus derechos de acceso, rectificación, supresión, oposición, bloqueo y portabilidad de sus datos personales, escribiendo al contacto de privacidad indicado más abajo.",
      ],
    },
    {
      title: "Proveedores y encargados",
      body: [
        "Geras utiliza proveedores externos para autenticación, base de datos, envío de correos y hosting. Estos proveedores tratan los datos únicamente por encargo de Geras y bajo las mismas obligaciones de confidencialidad.",
      ],
    },
    {
      title: "Transferencias de datos",
      body: [
        "Algunos proveedores de infraestructura pueden procesar datos fuera de Chile. En esos casos, Geras exige contractualmente niveles de protección equivalentes a los de la legislación chilena.",
      ],
    },
    {
      title: "Contacto de privacidad",
      body: ["Para consultas o solicitudes relacionadas con tus datos personales: privacidad@geras.cl"],
    },
  ],
};

export const termsAndConditions: LegalDocument = {
  id: "terms",
  title: "Términos y condiciones",
  updatedAt: "2026-08-01",
  sections: [
    {
      title: "Qué es Geras",
      body: [
        "Geras es una plataforma que intermedia entre familias, personas mayores, profesionales de cuidado y residencias. Geras facilita el contacto, la solicitud y la reserva de servicios, pero no es empleador de los profesionales ni operador de las residencias publicadas.",
      ],
    },
    {
      title: "Responsabilidad del profesional o residencia",
      body: [
        "Cada profesional o residencia es responsable de la calidad, idoneidad, legalidad y ejecución del servicio que presta. Geras verifica antecedentes básicos de publicación, pero no garantiza el resultado de cada atención individual.",
      ],
    },
    {
      title: "Condiciones de reserva y cancelación",
      body: [
        "Una reserva queda confirmada cuando el profesional la acepta. Cualquiera de las partes puede cancelar antes de que comience la atención, sujeto a las políticas de cada profesional o residencia, que se muestran antes de confirmar.",
      ],
    },
    {
      title: "Limitación de uso en emergencias",
      body: [
        "Geras no es un servicio de emergencia médica. Ante una urgencia de salud, contacta inmediatamente a los servicios de emergencia (SAMU 131) y no esperes una respuesta a través de la plataforma.",
      ],
    },
    {
      title: "Canales de contacto",
      body: ["Soporte general: contacto@geras.cl · Privacidad: privacidad@geras.cl"],
    },
    {
      title: "Confirmaciones electrónicas",
      body: [
        "Al reservar un servicio, aceptas recibir confirmaciones y notificaciones relacionadas por correo electrónico y dentro de la aplicación.",
      ],
    },
    {
      title: "Pagos",
      body: [
        "El pago en línea dentro de la plataforma está en preparación y todavía no está disponible. Mientras tanto, el pago se coordina directamente entre la familia y el profesional o residencia.",
      ],
    },
  ],
};

export const legalNotice: LegalDocument = {
  id: "legal-notice",
  title: "Aviso legal",
  updatedAt: "2026-08-01",
  sections: [
    {
      title: "Identificación",
      body: ["Geras es un servicio operado por Soluciones Mayores."],
    },
    {
      title: "Normativa considerada",
      body: [
        "Ley N.º 19.628 sobre protección de la vida privada.",
        "Ley N.º 21.719, que modifica la anterior y crea la Agencia de Protección de Datos Personales.",
        "Ley N.º 20.584, que regula los derechos y deberes de las personas en su atención de salud, cuando corresponde.",
        "Ley N.º 19.496 sobre protección de los derechos de los consumidores.",
        "Reglamento de la Ley sobre protección al consumidor en el comercio electrónico.",
      ],
    },
    {
      title: "Versión",
      body: ["Versión del documento: 0.1 (borrador) · Última actualización: 01-08-2026."],
    },
  ],
};

export const legalDocuments: LegalDocument[] = [privacyPolicy, termsAndConditions, legalNotice];
