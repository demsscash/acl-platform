import { z } from 'zod';

// ==================== COMMON SCHEMAS ====================

export const dateStringSchema = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Date invalide' }
);

export const positiveNumberSchema = z.number().positive('Doit être positif');
export const nonNegativeNumberSchema = z.number().nonnegative('Doit être positif ou zéro');

// ==================== DOTATION CARBURANT ====================

export const typeSourceCarburantSchema = z.enum(['CUVE_INTERNE', 'STATION_EXTERNE']);

export const dotationCarburantSchema = z.object({
  dateDotation: dateStringSchema,
  camionId: z.number().int().positive('Camion requis'),
  chauffeurId: z.number().int().positive('Chauffeur requis').optional(),
  quantiteLitres: positiveNumberSchema.refine(
    (val) => val <= 1000,
    { message: 'Quantité maximale: 1000L' }
  ),
  prixUnitaire: nonNegativeNumberSchema.optional(),
  kilometrageCamion: nonNegativeNumberSchema.optional(),
  typeSource: typeSourceCarburantSchema,
  cuveId: z.number().int().positive().optional(),
  stationNom: z.string().max(200).optional(),
}).refine(
  (data) => {
    // Si source cuve interne, cuveId est requis
    if (data.typeSource === 'CUVE_INTERNE' && !data.cuveId) {
      return false;
    }
    // Si source station externe, stationNom est requis
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

export type DotationCarburantInput = z.infer<typeof dotationCarburantSchema>;

// ==================== SORTIE STOCK ====================

export const motifSortieSchema = z.enum([
  'MAINTENANCE',
  'REPARATION',
  'REMPLACEMENT',
  'USURE',
  'PANNE',
  'AUTRE',
]);

export const ligneSortieStockSchema = z.object({
  pieceId: z.number().int().positive('Pièce requise'),
  quantite: z.number().int().positive('Quantité requise'),
  pieceName: z.string().optional(),
});

export const sortieStockSchema = z.object({
  dateSortie: dateStringSchema,
  camionId: z.number().int().positive('Camion requis'),
  kilometrageCamion: nonNegativeNumberSchema.optional(),
  motif: motifSortieSchema,
  notes: z.string().max(500).optional(),
  lignes: z.array(ligneSortieStockSchema).min(1, 'Au moins une pièce requise'),
});

export type SortieStockInput = z.infer<typeof sortieStockSchema>;
export type LigneSortieStockInput = z.infer<typeof ligneSortieStockSchema>;

// ==================== BON TRANSPORT ====================

export const natureChargementSchema = z.enum([
  'CONTENEUR_20',
  'CONTENEUR_40',
  'CONTENEUR_40_HC',
  'VRAC',
  'PALETTE',
  'COLIS',
  'VEHICULE',
  'MATERIEL_BTP',
  'ENGIN',
  'AUTRE',
]);

export const statutBonSchema = z.enum([
  'BROUILLON',
  'EN_COURS',
  'LIVRE',
  'ANNULE',
  'FACTURE',
]);

export const bonTransportSchema = z.object({
  dateCreation: dateStringSchema,
  clientId: z.number().int().positive('Client requis').optional(),
  camionId: z.number().int().positive('Camion requis').optional(),
  chauffeurId: z.number().int().positive('Chauffeur requis').optional(),
  lieuChargement: z.string().min(3, 'Lieu de chargement requis').max(500),
  lieuDechargement: z.string().min(3, 'Lieu de déchargement requis').max(500),
  natureChargement: natureChargementSchema.optional(),
  poidsKg: nonNegativeNumberSchema.optional(),
  montantHt: nonNegativeNumberSchema.optional(),
  statut: statutBonSchema.default('BROUILLON'),
  notes: z.string().max(1000).optional(),
});

export type BonTransportInput = z.infer<typeof bonTransportSchema>;

// ==================== BON LOCATION ====================

export const bonLocationSchema = z.object({
  dateDebut: dateStringSchema,
  dateFinPrevue: dateStringSchema.optional(),
  clientId: z.number().int().positive('Client requis').optional(),
  camionId: z.number().int().positive('Camion requis').optional(),
  chauffeurId: z.number().int().positive('Chauffeur requis').optional(),
  tarifJournalier: nonNegativeNumberSchema.optional(),
  carburantInclus: z.boolean().default(false),
  kmDepart: nonNegativeNumberSchema.optional(),
  statut: statutBonSchema.default('BROUILLON'),
  notes: z.string().max(1000).optional(),
}).refine(
  (data) => {
    if (data.dateFinPrevue) {
      return new Date(data.dateFinPrevue) >= new Date(data.dateDebut);
    }
    return true;
  },
  {
    message: 'La date de fin doit être après la date de début',
    path: ['dateFinPrevue'],
  }
);

export type BonLocationInput = z.infer<typeof bonLocationSchema>;

// ==================== PANNE ====================

export const typePanneSchema = z.enum([
  'MECANIQUE',
  'ELECTRIQUE',
  'PNEUMATIQUE',
  'HYDRAULIQUE',
  'CARROSSERIE',
  'ACCIDENT',
  'AUTRE',
]);

export const prioritePanneSchema = z.enum([
  'URGENTE',
  'HAUTE',
  'NORMALE',
  'BASSE',
]);

export const statutPanneSchema = z.enum([
  'DECLAREE',
  'EN_DIAGNOSTIC',
  'EN_ATTENTE_PIECES',
  'EN_REPARATION',
  'REPAREE',
  'CLOTUREE',
]);

export const panneSchema = z.object({
  datePanne: dateStringSchema,
  camionId: z.number().int().positive('Camion requis'),
  chauffeurId: z.number().int().positive().optional(),
  typePanne: typePanneSchema,
  description: z.string().min(10, 'Description trop courte').max(2000),
  priorite: prioritePanneSchema.default('NORMALE'),
  statut: statutPanneSchema.default('DECLAREE'),
  coutEstime: nonNegativeNumberSchema.optional(),
  localisation: z.string().max(255).optional(),
  kilometragePanne: nonNegativeNumberSchema.optional(),
});

export type PanneInput = z.infer<typeof panneSchema>;

// ==================== SYNC QUEUE ITEM ====================

export const syncActionSchema = z.enum(['create', 'update', 'delete']);
export const entityTypeSchema = z.enum([
  'dotation',
  'sortieStock',
  'bonTransport',
  'bonLocation',
  'panne',
]);

export const syncQueueItemSchema = z.object({
  localId: z.number().int().positive(),
  serverId: z.number().int().positive().optional(),
  action: syncActionSchema,
  data: z.any(),
  clientTimestamp: dateStringSchema.optional(),
});

export type SyncQueueItemInput = z.infer<typeof syncQueueItemSchema>;

// ==================== VALIDATION HELPERS ====================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: { path: string; message: string }[];
}

export function validateOfflineData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
    })),
  };
}

export function validateDotation(data: unknown): ValidationResult<DotationCarburantInput> {
  return validateOfflineData(dotationCarburantSchema, data);
}

export function validateSortieStock(data: unknown): ValidationResult<SortieStockInput> {
  return validateOfflineData(sortieStockSchema, data);
}

export function validateBonTransport(data: unknown): ValidationResult<any> {
  return validateOfflineData(bonTransportSchema, data);
}

export function validateBonLocation(data: unknown): ValidationResult<any> {
  return validateOfflineData(bonLocationSchema, data);
}

export function validatePanne(data: unknown): ValidationResult<any> {
  return validateOfflineData(panneSchema, data);
}

// ==================== BATCH VALIDATION ====================

export interface BatchValidationResult {
  valid: boolean;
  validItems: any[];
  invalidItems: { index: number; data: any; errors: { path: string; message: string }[] }[];
}

export function validateBatch<T>(
  schema: z.ZodSchema<T>,
  items: unknown[]
): BatchValidationResult {
  const validItems: T[] = [];
  const invalidItems: BatchValidationResult['invalidItems'] = [];

  items.forEach((item, index) => {
    const result = validateOfflineData(schema, item);
    if (result.success && result.data) {
      validItems.push(result.data);
    } else {
      invalidItems.push({
        index,
        data: item,
        errors: result.errors || [],
      });
    }
  });

  return {
    valid: invalidItems.length === 0,
    validItems,
    invalidItems,
  };
}
