// ============================================================
// DATOS SINTÉTICOS DE DEMOSTRACIÓN — compartidos entre seed y clean
//
// Todo lo creado por este seed lleva el prefijo "QA GERAS" (nombres de
// residencias) o el dominio "@qa-geras.cl" (emails de profesionales
// sintéticos), para poder identificarlo y borrarlo sin riesgo de tocar
// datos reales.
// ============================================================
import type { Database } from "@geras/shared";

type MobilityLevel = Database["public"]["Enums"]["mobility_level"];
type DayOfWeek = Database["public"]["Enums"]["day_of_week"];

export const QA_EMAIL_DOMAIN = "qa-geras.cl";
export const QA_RESIDENCE_PREFIX = "QA GERAS";

export interface ProfessionalSeed {
  slug: string;
  fullName: string;
  professionId: number;
  serviceId: number;
  bio: string;
  yearsExperience: number;
  baseComunaId: number;
  coverageComunaIds: number[];
  averageRating: number;
  totalReviews: number;
  priceOverride?: number;
}

// 10 profesionales sintéticos, uno por categoría pedida. serviceId/
// professionId vienen del catálogo real ya sembrado en la base (no se
// inventan IDs: services.profession_id ya está fijado por esa tabla).
export const PROFESSIONAL_SEEDS: ProfessionalSeed[] = [
  {
    slug: "cuidadora-1",
    fullName: "Marta Soto Reyes",
    professionId: 12,
    serviceId: 12,
    bio: "Cuidadora de adultos mayores con enfoque en compañía diaria y apoyo en actividades básicas.",
    yearsExperience: 6,
    baseComunaId: 6,
    coverageComunaIds: [6, 5, 7],
    averageRating: 4.8,
    totalReviews: 34,
  },
  {
    slug: "enfermera-1",
    fullName: "Paula Contreras Vidal",
    professionId: 3,
    serviceId: 5,
    bio: "Enfermera con experiencia en atención domiciliaria, manejo de heridas y control de signos vitales.",
    yearsExperience: 9,
    baseComunaId: 1,
    coverageComunaIds: [1, 2, 3],
    averageRating: 4.9,
    totalReviews: 51,
  },
  {
    slug: "kinesiologo-1",
    fullName: "Diego Fuentes Araya",
    professionId: 1,
    serviceId: 1,
    bio: "Kinesiólogo especializado en rehabilitación motora y prevención de caídas en personas mayores.",
    yearsExperience: 7,
    baseComunaId: 9,
    coverageComunaIds: [9, 10, 11],
    averageRating: 4.7,
    totalReviews: 28,
  },
  {
    slug: "terapeuta-ocupacional-1",
    fullName: "Fernanda Ibáñez Castro",
    professionId: 2,
    serviceId: 3,
    bio: "Terapeuta ocupacional enfocada en autonomía funcional y adaptación del hogar.",
    yearsExperience: 5,
    baseComunaId: 8,
    coverageComunaIds: [8, 7, 6],
    averageRating: 4.6,
    totalReviews: 19,
  },
  {
    slug: "nutricionista-1",
    fullName: "Camila Rojas Muñoz",
    professionId: 6,
    serviceId: 9,
    bio: "Nutricionista con experiencia en alimentación geriátrica y manejo nutricional de patologías crónicas.",
    yearsExperience: 4,
    baseComunaId: 2,
    coverageComunaIds: [2, 1, 3],
    averageRating: 4.8,
    totalReviews: 22,
  },
  {
    slug: "podologa-1",
    fullName: "Isidora Vega Palma",
    professionId: 8,
    serviceId: 11,
    bio: "Podóloga clínica especializada en cuidado del pie diabético y de la tercera edad.",
    yearsExperience: 8,
    baseComunaId: 6,
    coverageComunaIds: [6, 14, 15],
    averageRating: 4.9,
    totalReviews: 40,
  },
  {
    slug: "acompanamiento-1",
    fullName: "Rosa Herrera Bravo",
    professionId: 12,
    serviceId: 13,
    bio: "Acompañante de adultos mayores para salidas, trámites y compañía en el día a día.",
    yearsExperience: 3,
    baseComunaId: 13,
    coverageComunaIds: [13, 17, 19],
    averageRating: 4.5,
    totalReviews: 12,
  },
  {
    slug: "psicologa-1",
    fullName: "Valentina Torres Salas",
    professionId: 7,
    serviceId: 10,
    bio: "Psicóloga con experiencia en acompañamiento emocional de personas mayores y sus familias.",
    yearsExperience: 6,
    baseComunaId: 1,
    coverageComunaIds: [1, 4, 3],
    averageRating: 4.8,
    totalReviews: 26,
  },
  {
    slug: "fonoaudiologo-1",
    fullName: "Matías Sepúlveda León",
    professionId: 5,
    serviceId: 8,
    bio: "Fonoaudiólogo especializado en trastornos de deglución y comunicación en personas mayores.",
    yearsExperience: 5,
    baseComunaId: 9,
    coverageComunaIds: [9, 12, 19],
    averageRating: 4.6,
    totalReviews: 15,
  },
  {
    slug: "atencion-domiciliaria-1",
    fullName: "Javiera Muñoz Díaz",
    professionId: 4,
    serviceId: 7,
    bio: "TENS con experiencia en cuidados técnicos básicos y atención domiciliaria integral.",
    yearsExperience: 10,
    baseComunaId: 14,
    coverageComunaIds: [14, 15, 16],
    averageRating: 4.9,
    totalReviews: 47,
  },
];

export const AVAILABILITY_BLOCKS: { day: DayOfWeek; start: string; end: string }[] = [
  { day: "monday", start: "09:00:00", end: "18:00:00" },
  { day: "tuesday", start: "09:00:00", end: "18:00:00" },
  { day: "wednesday", start: "09:00:00", end: "18:00:00" },
  { day: "thursday", start: "09:00:00", end: "18:00:00" },
  { day: "friday", start: "09:00:00", end: "14:00:00" },
];

export interface ResidenceSeed {
  slug: string;
  name: string;
  comunaId: number;
  description: string;
  priceFrom: number;
  priceTo: number;
  capacity: number;
  availableSlots: number;
  mobilityLevels: MobilityLevel[];
  roomTypes: { name: string; price: number; capacity: number }[];
  characteristics: string[];
  includedServices: string[];
}

// 10 residencias sintéticas, una por comuna pedida.
export const RESIDENCE_SEEDS: ResidenceSeed[] = [
  {
    slug: "nunoa",
    name: `${QA_RESIDENCE_PREFIX} Residencial Ñuñoa`,
    comunaId: 6,
    description: "Residencia familiar en Ñuñoa, cercana a áreas verdes, con atención personalizada las 24 horas.",
    priceFrom: 850000,
    priceTo: 1350000,
    capacity: 24,
    availableSlots: 4,
    mobilityLevels: ["independent", "needs_assistance"],
    roomTypes: [
      { name: "Habitación individual", price: 1350000, capacity: 1 },
      { name: "Habitación compartida", price: 950000, capacity: 2 },
    ],
    characteristics: ["Jardín interior", "Terapia ocupacional incluida", "Atención 24/7"],
    includedServices: ["Alimentación completa", "Enfermería 24 horas", "Actividades recreativas"],
  },
  {
    slug: "providencia",
    name: `${QA_RESIDENCE_PREFIX} Parque Providencia`,
    comunaId: 1,
    description: "Residencia boutique en Providencia con enfoque en rehabilitación y vida activa.",
    priceFrom: 1100000,
    priceTo: 1800000,
    capacity: 18,
    availableSlots: 2,
    mobilityLevels: ["independent", "needs_assistance", "wheelchair"],
    roomTypes: [
      { name: "Suite individual", price: 1800000, capacity: 1 },
      { name: "Habitación doble", price: 1300000, capacity: 2 },
    ],
    characteristics: ["Kinesiología incluida", "Sala de rehabilitación", "Transporte propio"],
    includedServices: ["Alimentación completa", "Kinesiología", "Transporte a controles médicos"],
  },
  {
    slug: "las-condes",
    name: `${QA_RESIDENCE_PREFIX} Altos de Las Condes`,
    comunaId: 2,
    description: "Residencia premium en Las Condes, con equipo médico permanente y habitaciones amplias.",
    priceFrom: 1400000,
    priceTo: 2200000,
    capacity: 30,
    availableSlots: 6,
    mobilityLevels: ["independent", "needs_assistance", "wheelchair", "bedridden"],
    roomTypes: [
      { name: "Suite premium", price: 2200000, capacity: 1 },
      { name: "Habitación individual", price: 1600000, capacity: 1 },
    ],
    characteristics: ["Médico residente", "Piscina temperada", "Seguridad 24/7"],
    includedServices: ["Alimentación completa", "Médico residente", "Enfermería 24 horas"],
  },
  {
    slug: "macul",
    name: `${QA_RESIDENCE_PREFIX} Hogar Macul`,
    comunaId: 8,
    description: "Residencia acogedora en Macul, cercana a centros de salud y comercio.",
    priceFrom: 750000,
    priceTo: 1100000,
    capacity: 16,
    availableSlots: 3,
    mobilityLevels: ["independent", "needs_assistance"],
    roomTypes: [
      { name: "Habitación individual", price: 1100000, capacity: 1 },
      { name: "Habitación compartida", price: 800000, capacity: 3 },
    ],
    characteristics: ["Ambiente familiar", "Talleres semanales", "Patio techado"],
    includedServices: ["Alimentación completa", "Actividades recreativas", "Aseo diario"],
  },
  {
    slug: "penalolen",
    name: `${QA_RESIDENCE_PREFIX} Mirador Peñalolén`,
    comunaId: 7,
    description: "Residencia con vista a la precordillera, ambiente tranquilo y atención cercana.",
    priceFrom: 800000,
    priceTo: 1250000,
    capacity: 20,
    availableSlots: 5,
    mobilityLevels: ["independent", "needs_assistance", "wheelchair"],
    roomTypes: [
      { name: "Habitación individual", price: 1250000, capacity: 1 },
      { name: "Habitación doble", price: 900000, capacity: 2 },
    ],
    characteristics: ["Vista a la cordillera", "Jardines amplios", "Fisioterapia disponible"],
    includedServices: ["Alimentación completa", "Fisioterapia", "Actividades al aire libre"],
  },
  {
    slug: "la-reina",
    name: `${QA_RESIDENCE_PREFIX} Refugio La Reina`,
    comunaId: 5,
    description: "Residencia pequeña y familiar en La Reina, con atención muy personalizada.",
    priceFrom: 900000,
    priceTo: 1400000,
    capacity: 12,
    availableSlots: 2,
    mobilityLevels: ["independent", "needs_assistance"],
    roomTypes: [
      { name: "Habitación individual", price: 1400000, capacity: 1 },
      { name: "Habitación compartida", price: 1000000, capacity: 2 },
    ],
    characteristics: ["Grupo reducido de residentes", "Atención personalizada", "Huerta propia"],
    includedServices: ["Alimentación completa", "Enfermería diurna", "Actividades terapéuticas"],
  },
  {
    slug: "santiago-centro",
    name: `${QA_RESIDENCE_PREFIX} Centro Histórico`,
    comunaId: 9,
    description: "Residencia céntrica con fácil acceso a hospitales y transporte público.",
    priceFrom: 700000,
    priceTo: 1050000,
    capacity: 22,
    availableSlots: 4,
    mobilityLevels: ["independent", "needs_assistance", "wheelchair"],
    roomTypes: [
      { name: "Habitación individual", price: 1050000, capacity: 1 },
      { name: "Habitación compartida", price: 750000, capacity: 2 },
    ],
    characteristics: ["Cercano a hospitales", "Acceso a transporte público", "Ascensor"],
    includedServices: ["Alimentación completa", "Aseo diario", "Enfermería 24 horas"],
  },
  {
    slug: "vitacura",
    name: `${QA_RESIDENCE_PREFIX} Jardines de Vitacura`,
    comunaId: 3,
    description: "Residencia de alto estándar en Vitacura, con amplios jardines y servicios premium.",
    priceFrom: 1600000,
    priceTo: 2500000,
    capacity: 26,
    availableSlots: 3,
    mobilityLevels: ["independent", "needs_assistance", "wheelchair", "bedridden"],
    roomTypes: [
      { name: "Suite premium", price: 2500000, capacity: 1 },
      { name: "Habitación individual", price: 1900000, capacity: 1 },
    ],
    characteristics: ["Jardines extensos", "Chef propio", "Equipo médico permanente"],
    includedServices: ["Alimentación gourmet", "Médico residente", "Enfermería 24 horas"],
  },
  {
    slug: "san-miguel",
    name: `${QA_RESIDENCE_PREFIX} Casa San Miguel`,
    comunaId: 12,
    description: "Residencia accesible en San Miguel, con equipo de cuidado cálido y cercano.",
    priceFrom: 650000,
    priceTo: 950000,
    capacity: 14,
    availableSlots: 3,
    mobilityLevels: ["independent", "needs_assistance"],
    roomTypes: [
      { name: "Habitación individual", price: 950000, capacity: 1 },
      { name: "Habitación compartida", price: 700000, capacity: 2 },
    ],
    characteristics: ["Ambiente cálido", "Actividades diarias", "Patio con huerta"],
    includedServices: ["Alimentación completa", "Actividades recreativas", "Aseo diario"],
  },
  {
    slug: "maipu",
    name: `${QA_RESIDENCE_PREFIX} Vista Maipú`,
    comunaId: 13,
    description: "Residencia amplia en Maipú, con espacios recreativos y atención de enfermería permanente.",
    priceFrom: 700000,
    priceTo: 1100000,
    capacity: 28,
    availableSlots: 7,
    mobilityLevels: ["independent", "needs_assistance", "wheelchair"],
    roomTypes: [
      { name: "Habitación individual", price: 1100000, capacity: 1 },
      { name: "Habitación compartida", price: 780000, capacity: 3 },
    ],
    characteristics: ["Amplias áreas verdes", "Gimnasio adaptado", "Sala multiuso"],
    includedServices: ["Alimentación completa", "Enfermería 24 horas", "Gimnasia adaptada"],
  },
];
