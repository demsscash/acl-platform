import { z } from 'zod';

// ==================== PATTERNS DE VALIDATION ====================

const immatriculationPattern = /^[A-Z]{2}-\d{3,4}-[A-Z]{2}$/;
const telephonePattern = /^(\+221|00221)?[0-9]{9}$/;

// ==================== MESSAGES D'ERREUR PERSONNALISÉS ====================

const messages = {
  required: 'Ce champ est requis',
  invalidEmail: 'Adresse email invalide',
  invalidPhone: 'Numéro de téléphone invalide (ex: 771234567)',
  invalidImmatriculation: 'Format invalide (ex: DK-1234-AB)',
  minLength: (min: number) => `Minimum ${min} caractères`,
  maxLength: (max: number) => `Maximum ${max} caractères`,
  positive: 'Doit être un nombre positif',
  nonNegative: 'Doit être positif ou zéro',
  min: (min: number) => `Minimum ${min}`,
  max: (max: number) => `Maximum ${max}`,
  integer: 'Doit être un nombre entier',
};

// ==================== SCHÉMAS CAMIONS ====================

export const camionSchema = z.object({
  immatriculation: z
    .string()
    .min(1, messages.required)
    .regex(immatriculationPattern, messages.invalidImmatriculation),
  marque: z
    .string()
    .min(1, messages.required)
    .min(2, messages.minLength(2))
    .max(50, messages.maxLength(50)),
  modele: z
    .string()
    .max(50, messages.maxLength(50))
    .optional(),
  typeCamion: z.enum(['PLATEAU', 'GRUE', 'BENNE', 'PORTE_CONTENEUR', 'CITERNE', 'FRIGORIFIQUE', 'AUTRE'], {
    required_error: messages.required,
  }),
  typeCarburant: z.enum(['DIESEL', 'ESSENCE']).default('DIESEL'),
  capaciteReservoirLitres: z
    .number()
    .int(messages.integer)
    .min(50, messages.min(50))
    .max(2000, messages.max(2000))
    .optional(),
  numeroInterne: z
    .string()
    .max(20, messages.maxLength(20))
    .optional(),
  anneeMiseCirculation: z
    .number()
    .int(messages.integer)
    .min(1980, messages.min(1980))
    .max(new Date().getFullYear() + 1, messages.max(new Date().getFullYear() + 1))
    .optional(),
});

export type CamionFormData = z.infer<typeof camionSchema>;

// ==================== SCHÉMAS CHAUFFEURS ====================

export const chauffeurSchema = z.object({
  matricule: z
    .string()
    .min(1, messages.required)
    .min(3, messages.minLength(3))
    .max(20, messages.maxLength(20)),
  nom: z
    .string()
    .min(1, messages.required)
    .min(2, messages.minLength(2))
    .max(50, messages.maxLength(50)),
  prenom: z
    .string()
    .min(1, messages.required)
    .min(2, messages.minLength(2))
    .max(50, messages.maxLength(50)),
  telephone: z
    .string()
    .regex(telephonePattern, messages.invalidPhone)
    .optional()
    .or(z.literal('')),
  numeroPermis: z
    .string()
    .min(1, messages.required)
    .min(5, messages.minLength(5))
    .max(30, messages.maxLength(30)),
  typePermis: z.enum(['B', 'C', 'D', 'E', 'CE', 'DE'], {
    required_error: messages.required,
  }),
  dateExpirationPermis: z
    .string()
    .refine((val) => !val || new Date(val) > new Date(), {
      message: 'Le permis doit être valide (date future)',
    })
    .optional(),
});

export type ChauffeurFormData = z.infer<typeof chauffeurSchema>;

// ==================== SCHÉMAS DOTATION CARBURANT ====================

export const dotationCarburantSchema = z.object({
  dateDotation: z
    .string()
    .min(1, messages.required)
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Date invalide' }),
  camionId: z
    .number({ required_error: messages.required, invalid_type_error: 'Sélectionnez un camion' })
    .int()
    .positive('Sélectionnez un camion'),
  chauffeurId: z
    .number()
    .int()
    .positive()
    .optional(),
  quantiteLitres: z
    .number({ required_error: messages.required, invalid_type_error: 'Entrez une quantité valide' })
    .positive(messages.positive)
    .max(1000, 'Quantité maximale: 1000L'),
  prixUnitaire: z
    .number()
    .nonnegative(messages.nonNegative)
    .optional(),
  kilometrageCamion: z
    .number()
    .int(messages.integer)
    .nonnegative(messages.nonNegative)
    .optional(),
  typeSource: z.enum(['CUVE_INTERNE', 'STATION_EXTERNE'], {
    required_error: messages.required,
  }),
  cuveId: z
    .number()
    .int()
    .positive()
    .optional(),
  stationNom: z
    .string()
    .max(200, messages.maxLength(200))
    .optional(),
}).refine(
  (data) => {
    if (data.typeSource === 'CUVE_INTERNE' && !data.cuveId) {
      return false;
    }
    if (data.typeSource === 'STATION_EXTERNE' && !data.stationNom) {
      return false;
    }
    return true;
  },
  {
    message: 'Cuve requise pour source interne, nom de station requis pour source externe',
    path: ['typeSource'],
  }
);

export type DotationCarburantFormData = z.infer<typeof dotationCarburantSchema>;

// ==================== SCHÉMAS SORTIE STOCK ====================

export const ligneSortieSchema = z.object({
  pieceId: z
    .number({ required_error: 'Sélectionnez une pièce' })
    .int()
    .positive('Sélectionnez une pièce'),
  quantite: z
    .number({ required_error: messages.required, invalid_type_error: 'Entrez une quantité' })
    .int(messages.integer)
    .positive(messages.positive),
});

export const sortieStockSchema = z.object({
  dateSortie: z
    .string()
    .min(1, messages.required)
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Date invalide' }),
  camionId: z
    .number({ required_error: messages.required })
    .int()
    .positive('Sélectionnez un camion'),
  kilometrageCamion: z
    .number()
    .int(messages.integer)
    .nonnegative(messages.nonNegative)
    .optional(),
  motif: z.enum(['MAINTENANCE', 'REPARATION', 'REMPLACEMENT', 'USURE', 'PANNE', 'AUTRE'], {
    required_error: messages.required,
  }),
  notes: z
    .string()
    .max(500, messages.maxLength(500))
    .optional(),
  lignes: z
    .array(ligneSortieSchema)
    .min(1, 'Ajoutez au moins une pièce'),
});

export type SortieStockFormData = z.infer<typeof sortieStockSchema>;

// ==================== SCHÉMAS BON TRANSPORT ====================

export const bonTransportSchema = z.object({
  dateCreation: z
    .string()
    .min(1, messages.required),
  clientId: z
    .number()
    .int()
    .positive('Sélectionnez un client')
    .optional(),
  camionId: z
    .number()
    .int()
    .positive('Sélectionnez un camion')
    .optional(),
  chauffeurId: z
    .number()
    .int()
    .positive()
    .optional(),
  lieuChargement: z
    .string()
    .min(3, messages.minLength(3))
    .max(500, messages.maxLength(500)),
  lieuDechargement: z
    .string()
    .min(3, messages.minLength(3))
    .max(500, messages.maxLength(500)),
  natureChargement: z
    .enum(['CONTENEUR_20', 'CONTENEUR_40', 'CONTENEUR_40_HC', 'VRAC', 'PALETTE', 'COLIS', 'VEHICULE', 'MATERIEL_BTP', 'ENGIN', 'AUTRE'])
    .optional(),
  poidsKg: z
    .number()
    .nonnegative(messages.nonNegative)
    .max(100000, 'Poids maximum: 100 tonnes')
    .optional(),
  montantHt: z
    .number()
    .nonnegative(messages.nonNegative)
    .optional(),
  notes: z
    .string()
    .max(1000, messages.maxLength(1000))
    .optional(),
});

export type BonTransportFormData = z.infer<typeof bonTransportSchema>;

// ==================== SCHÉMAS PANNE ====================

export const panneSchema = z.object({
  datePanne: z
    .string()
    .min(1, messages.required)
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Date invalide' }),
  camionId: z
    .number({ required_error: messages.required })
    .int()
    .positive('Sélectionnez un camion'),
  chauffeurId: z
    .number()
    .int()
    .positive()
    .optional(),
  typePanne: z.enum(['MECANIQUE', 'ELECTRIQUE', 'PNEUMATIQUE', 'HYDRAULIQUE', 'CARROSSERIE', 'ACCIDENT', 'AUTRE'], {
    required_error: messages.required,
  }),
  description: z
    .string()
    .min(10, 'Description trop courte (minimum 10 caractères)')
    .max(2000, messages.maxLength(2000)),
  priorite: z
    .enum(['URGENTE', 'HAUTE', 'NORMALE', 'BASSE'])
    .default('NORMALE'),
  coutEstime: z
    .number()
    .nonnegative(messages.nonNegative)
    .optional(),
  localisation: z
    .string()
    .max(255, messages.maxLength(255))
    .optional(),
  kilometragePanne: z
    .number()
    .int(messages.integer)
    .nonnegative(messages.nonNegative)
    .optional(),
});

export type PanneFormData = z.infer<typeof panneSchema>;

// ==================== SCHÉMAS FOURNISSEUR ====================

export const fournisseurSchema = z.object({
  nom: z
    .string()
    .min(1, messages.required)
    .min(2, messages.minLength(2))
    .max(100, messages.maxLength(100)),
  type: z.enum(['PIECES', 'CARBURANT', 'SERVICES', 'AUTRE'], {
    required_error: messages.required,
  }),
  adresse: z
    .string()
    .max(255, messages.maxLength(255))
    .optional(),
  telephone: z
    .string()
    .regex(telephonePattern, messages.invalidPhone)
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .email(messages.invalidEmail)
    .optional()
    .or(z.literal('')),
  contactPrincipal: z
    .string()
    .max(100, messages.maxLength(100))
    .optional(),
});

export type FournisseurFormData = z.infer<typeof fournisseurSchema>;

// ==================== SCHÉMAS UTILISATEUR ====================

export const userSchema = z.object({
  email: z
    .string()
    .min(1, messages.required)
    .email(messages.invalidEmail),
  password: z
    .string()
    .min(8, 'Minimum 8 caractères')
    .regex(/[A-Z]/, 'Doit contenir au moins une majuscule')
    .regex(/[a-z]/, 'Doit contenir au moins une minuscule')
    .regex(/[0-9]/, 'Doit contenir au moins un chiffre')
    .optional(),
  nom: z
    .string()
    .min(1, messages.required)
    .min(2, messages.minLength(2))
    .max(50, messages.maxLength(50)),
  prenom: z
    .string()
    .min(1, messages.required)
    .min(2, messages.minLength(2))
    .max(50, messages.maxLength(50)),
  telephone: z
    .string()
    .regex(telephonePattern, messages.invalidPhone)
    .optional()
    .or(z.literal('')),
  role: z.enum(['DIRECTION', 'COORDINATEUR', 'MAGASINIER'], {
    required_error: messages.required,
  }),
});

export type UserFormData = z.infer<typeof userSchema>;

// ==================== SCHÉMAS CLIENT ====================

export const clientSchema = z.object({
  raisonSociale: z
    .string()
    .min(1, messages.required)
    .min(2, messages.minLength(2))
    .max(200, messages.maxLength(200)),
  adresse: z
    .string()
    .max(500, messages.maxLength(500))
    .optional(),
  telephone: z
    .string()
    .regex(telephonePattern, messages.invalidPhone)
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .email(messages.invalidEmail)
    .optional()
    .or(z.literal('')),
  contactPrincipal: z
    .string()
    .max(100, messages.maxLength(100))
    .optional(),
});

export type ClientFormData = z.infer<typeof clientSchema>;

// ==================== HELPERS DE VALIDATION ====================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
}

export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!errors[path]) {
      errors[path] = err.message;
    }
  });

  return { success: false, errors };
}

// Helper pour convertir les valeurs de formulaire
export function parseFormNumber(value: string | number | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? undefined : num;
}

export function parseFormInt(value: string | number | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  return isNaN(num) ? undefined : num;
}
