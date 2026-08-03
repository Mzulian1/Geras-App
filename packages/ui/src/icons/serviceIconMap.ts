import type { Ionicons } from "@expo/vector-icons";

type IoniconsName = keyof typeof Ionicons.glyphMap;

// Entrada mínima que necesita getServiceIcon — cualquier fila de
// `services` (o un objeto parcial armado a mano) cumple esta forma. No
// se importa el tipo `Service` de @geras/shared acá para no crear una
// dependencia circular entre paquetes; los campos son los únicos que
// realmente se usan para resolver el icono.
export interface ServiceLike {
  slug?: string | null;
  name?: string | null;
  category?: string | null;
}

const GENERIC_ICON: IoniconsName = "grid";

// Reglas por palabra clave, evaluadas en orden sobre el nombre/slug ya
// normalizado (minúsculas, sin tildes). La primera que matchea gana —
// por eso las más específicas van antes que las genéricas (p.ej.
// "cuidado personal" antes que "cuidado").
const KEYWORD_RULES: { keywords: string[]; icon: IoniconsName }[] = [
  { keywords: ["cuidador", "cuidadora", "cuidado personal", "cuidados"], icon: "people" },
  { keywords: ["enfermeria", "enfermero", "enfermera", "curacion", "herida"], icon: "medkit" },
  { keywords: ["kinesiologia", "kinesiologo", "kinesico"], icon: "body" },
  { keywords: ["terapia ocupacional", "adaptacion del entorno", "ocupacional"], icon: "hand-left" },
  { keywords: ["nutricion", "nutricionista"], icon: "nutrition" },
  { keywords: ["psicologia", "psicologo", "salud mental"], icon: "chatbubbles" },
  { keywords: ["fonoaudiologia", "fonoaudiologo"], icon: "mic" },
  { keywords: ["podologia", "podologo", "podologica"], icon: "footsteps" },
  { keywords: ["medico", "medicina", "consulta medica"], icon: "medical" },
  { keywords: ["acompanamiento", "reemplazo puntual", "compania"], icon: "heart" },
  { keywords: ["transporte", "traslado"], icon: "car" },
  { keywords: ["residencia", "residencial"], icon: "home" },
  { keywords: ["domiciliaria", "domicilio", "atencion en casa"], icon: "location" },
  { keywords: ["actividad fisica", "rehabilitacion", "ejercicio", "evaluacion funcional"], icon: "fitness" },
  { keywords: ["medicamento", "farmac"], icon: "bandage" },
  { keywords: ["peluqueria", "peluquero", "corte de pelo"], icon: "cut" },
  { keywords: ["limpieza", "aseo"], icon: "sparkles" },
  { keywords: ["alimentacion", "comida", "nutricion enteral"], icon: "restaurant" },
];

// Categoría de la profesión asociada — solo entra en juego si el nombre
// del servicio no matcheó ninguna palabra clave.
const CATEGORY_RULES: { keywords: string[]; icon: IoniconsName }[] = [
  { keywords: ["salud mental"], icon: "chatbubbles" },
  { keywords: ["salud"], icon: "medical" },
  { keywords: ["cuidado"], icon: "people" },
  { keywords: ["social"], icon: "heart" },
  { keywords: ["gerontolog"], icon: "body" },
];

// Minúsculas + sin tildes/diacríticos + espacios normalizados — para que
// "Kinesiología", "kinesiologia" y "Kinesiología " matcheen igual.
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchByKeywords(normalized: string, rules: { keywords: string[]; icon: IoniconsName }[]): IoniconsName | null {
  for (const rule of rules) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) return rule.icon;
  }
  return null;
}

// Resuelve el icono de un servicio: primero por slug, luego por nombre
// normalizado, luego por categoría de la profesión asociada, y por
// último el icono genérico. Nunca lanza ni devuelve undefined — siempre
// hay un ícono válido que mostrar.
export function getServiceIcon(service: ServiceLike | null | undefined): IoniconsName {
  if (!service) return GENERIC_ICON;

  if (service.slug) {
    const bySlug = matchByKeywords(normalize(service.slug), KEYWORD_RULES);
    if (bySlug) return bySlug;
  }

  if (service.name) {
    const byName = matchByKeywords(normalize(service.name), KEYWORD_RULES);
    if (byName) return byName;
  }

  if (service.category) {
    const byCategory = matchByKeywords(normalize(service.category), CATEGORY_RULES);
    if (byCategory) return byCategory;
  }

  return GENERIC_ICON;
}
