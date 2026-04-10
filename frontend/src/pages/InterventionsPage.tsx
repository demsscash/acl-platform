import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import entretienService, {
  TYPE_MAINTENANCE_LABELS,
  STATUT_MAINTENANCE_LABELS,
  PRIORITE_MAINTENANCE_LABELS,
} from '../services/entretien.service';
import type {
  Maintenance,
  UpdateMaintenanceDto,
  StatutMaintenance,
} from '../services/entretien.service';
import camionsService from '../services/camions.service';
import piecesService from '../services/pieces.service';
import type { CataloguePiece } from '../services/pieces.service';
import { useAuthStore } from '../stores/auth.store';

const SOURCE_PIECE_LABELS: Record<string, string> = {
  MAGASIN: 'Magasin (stock interne)',
  FOURNISSEUR: 'Fournisseur (achat direct)',
  AUTRE_CAMION: 'Autre camion (récupération)',
  AUTRE: 'Autre',
};

export default function InterventionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { hasModulePermission, canViewFinancialData } = useAuthStore();

  const canUpdate = hasModulePermission('entretien', 'update');
  const canSeeFinancial = canViewFinancialData('entretien');

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState<Maintenance | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState<'EN_COURS' | 'TERMINE' | ''>('');

  const [formData, setFormData] = useState<UpdateMaintenanceDto>({
    statut: 'EN_COURS',
    dateDebut: new Date().toISOString().split('T')[0],
    dateFin: undefined,
    coutPieces: 0,
    coutMainOeuvre: 0,
    coutExterne: 0,
    travauxEffectues: '',
    observations: '',
    piecesUtilisees: [],
  });

  const [newPiece, setNewPiece] = useState({
    pieceId: 0,
    reference: '',
    designation: '',
    quantite: 1,
    prixUnitaire: 0,
    source: 'MAGASIN' as string,
    sourceDetail: '',
  });
  const [saisieLibre, setSaisieLibre] = useState(false);

  useEffect(() => {
    const idParam = searchParams.get('id');
    if (idParam) {
      const id = parseInt(idParam);
      entretienService.getById(id).then((m) => {
        setSelectedMaintenance(m);
        setShowDetailModal(true);
      }).catch(() => {
        searchParams.delete('id');
        setSearchParams(searchParams);
      });
    }
  }, [searchParams, setSearchParams]);

  const { data: maintenances, isLoading } = useQuery({
    queryKey: ['maintenances', 'interventions', search],
    queryFn: () => entretienService.getAll({ search: search || undefined }),
  });

  const { data: camions } = useQuery({
    queryKey: ['camions'],
    queryFn: camionsService.getAll,
  });

  const { data: cataloguePieces } = useQuery({
    queryKey: ['catalogue-pieces'],
    queryFn: piecesService.getAll,
  });

  const { data: fournisseurs } = useQuery({
    queryKey: ['fournisseurs'],
    queryFn: piecesService.getFournisseurs,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMaintenanceDto }) =>
      entretienService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      setShowModal(false);
      setSelectedMaintenance(null);
    },
  });

  const updateStatutMutation = useMutation({
    mutationFn: ({ id, statut }: { id: number; statut: StatutMaintenance }) =>
      entretienService.updateStatut(id, statut),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
    },
  });

  const handleSelectPieceFromCatalogue = (piece: CataloguePiece) => {
    setNewPiece({
      ...newPiece,
      pieceId: piece.id,
      reference: piece.reference,
      designation: piece.designation,
      prixUnitaire: piece.prixUnitaireMoyen || 0,
    });
  };

  const handleAddPiece = () => {
    if (newPiece.reference && newPiece.designation && newPiece.source) {
      const pieces = formData.piecesUtilisees || [];
      setFormData({
        ...formData,
        piecesUtilisees: [...pieces, {
          pieceId: newPiece.pieceId || Date.now(),
          reference: newPiece.reference,
          designation: newPiece.designation,
          quantite: newPiece.quantite,
          prixUnitaire: newPiece.prixUnitaire,
          source: newPiece.source,
          sourceDetail: newPiece.sourceDetail,
        }],
      });
      setNewPiece({ pieceId: 0, reference: '', designation: '', quantite: 1, prixUnitaire: 0, source: 'MAGASIN', sourceDetail: '' });
      setSaisieLibre(false);
    }
  };

  const handleRemovePiece = (index: number) => {
    const pieces = formData.piecesUtilisees || [];
    setFormData({ ...formData, piecesUtilisees: pieces.filter((_, i) => i !== index) });
  };

  const handleOpenIntervention = (m: Maintenance) => {
    setSelectedMaintenance(m);
    setFormData({
      statut: m.statut,
      dateDebut: m.dateDebut ? m.dateDebut.split('T')[0] : new Date().toISOString().split('T')[0],
      dateFin: m.dateFin ? m.dateFin.split('T')[0] : undefined,
      coutPieces: m.coutPieces || 0,
      coutMainOeuvre: m.coutMainOeuvre || 0,
      coutExterne: m.coutExterne || 0,
      travauxEffectues: m.travauxEffectues || '',
      observations: m.observations || '',
      piecesUtilisees: m.piecesUtilisees || [],
    });
    setShowModal(true);
  };

  const handleViewDetail = (m: Maintenance) => {
    setSelectedMaintenance(m);
    setShowDetailModal(true);
    setSearchParams({ id: m.id.toString() });
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedMaintenance(null);
    searchParams.delete('id');
    setSearchParams(searchParams);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaintenance) return;
    const pieces = formData.piecesUtilisees || [];
    const coutPiecesCalculated = pieces.reduce((sum, p) => sum + (p.quantite * (p.prixUnitaire || 0)), 0);
    updateMutation.mutate({
      id: selectedMaintenance.id,
      data: {
        ...formData,
        coutPieces: coutPiecesCalculated || formData.coutPieces,
      },
    });
  };

  const getStatutBadgeClass = (statut: StatutMaintenance) => {
    switch (statut) {
      case 'EN_COURS': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'TERMINE': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPrioriteBadgeClass = (priorite: string) => {
    switch (priorite) {
      case 'URGENTE': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'HAUTE': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'NORMALE': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount);
  };

  const interventions = (maintenances || []).filter(m =>
    (m.statut === 'EN_COURS' || m.statut === 'TERMINE') &&
    (filterStatut === '' || m.statut === filterStatut)
  );

  const enCoursCount = (maintenances || []).filter(m => m.statut === 'EN_COURS').length;
  const termineCount = (maintenances || []).filter(m => m.statut === 'TERMINE').length;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Interventions</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Enregistrement des opérations effectuées, pièces utilisées et remplacées
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total interventions</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{enCoursCount + termineCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">En cours</p>
          <p className="text-2xl font-bold text-orange-600">{enCoursCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Terminées</p>
          <p className="text-2xl font-bold text-green-600">{termineCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recherche</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Numéro, titre, immatriculation..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Statut</label>
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value as 'EN_COURS' | 'TERMINE' | '')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Toutes</option>
              <option value="EN_COURS">En cours</option>
              <option value="TERMINE">Terminées</option>
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center text-gray-500">Chargement...</div>
      ) : interventions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
          Aucune intervention trouvée. Les interventions apparaissent ici lorsqu'un ordre de réparation est démarré.
        </div>
      ) : (
        <div className="space-y-4">
          {interventions.map((m) => {
            const coutTotal = Number(m.coutPieces) + Number(m.coutMainOeuvre) + Number(m.coutExterne);
            const dureeJours = m.dateDebut && m.dateFin
              ? Math.ceil((new Date(m.dateFin).getTime() - new Date(m.dateDebut).getTime()) / (1000 * 60 * 60 * 24))
              : m.dateDebut
              ? Math.ceil((new Date().getTime() - new Date(m.dateDebut).getTime()) / (1000 * 60 * 60 * 24))
              : null;

            return (
              <div key={m.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        onClick={() => handleViewDetail(m)}
                        className="text-lg font-semibold text-yellow-600 hover:text-yellow-700"
                      >
                        {m.numero}
                      </button>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatutBadgeClass(m.statut)}`}>
                        {STATUT_MAINTENANCE_LABELS[m.statut]}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPrioriteBadgeClass(m.priorite)}`}>
                        {PRIORITE_MAINTENANCE_LABELS[m.priorite]}
                      </span>
                    </div>
                    <p className="text-gray-900 dark:text-white font-medium mt-1">{m.titre}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {m.camion?.immatriculation} - {TYPE_MAINTENANCE_LABELS[m.type]}
                    </p>
                  </div>
                  <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                    {m.dateDebut && <p>Début: {new Date(m.dateDebut).toLocaleDateString('fr-FR')}</p>}
                    {m.dateFin && <p>Fin: {new Date(m.dateFin).toLocaleDateString('fr-FR')}</p>}
                    {dureeJours !== null && (
                      <p className="font-medium text-gray-700 dark:text-gray-300">
                        Durée: {dureeJours} jour{dureeJours > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>

                {m.travauxEffectues && (
                  <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">Travaux effectués</p>
                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{m.travauxEffectues}</p>
                  </div>
                )}

                {m.piecesUtilisees && m.piecesUtilisees.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">
                      Pièces utilisées / remplacées ({m.piecesUtilisees.length})
                    </p>
                    <div className="space-y-1">
                      {m.piecesUtilisees.map((piece, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs text-gray-700 dark:text-gray-300">
                          <span>
                            <span className="font-medium">{piece.designation}</span>
                            <span className="text-gray-500 dark:text-gray-400"> ({piece.reference})</span>
                            <span> x{piece.quantite}</span>
                            <span className="text-blue-600 dark:text-blue-400"> - {SOURCE_PIECE_LABELS[piece.source] || piece.source}</span>
                          </span>
                          {canSeeFinancial && piece.prixUnitaire ? (
                            <span className="font-medium">{(piece.quantite * piece.prixUnitaire).toLocaleString()} FCFA</span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {canSeeFinancial && coutTotal > 0 && (
                  <div className="mt-3 flex items-center gap-4 text-sm flex-wrap">
                    <span className="text-gray-500 dark:text-gray-400">Pièces: {formatCurrency(Number(m.coutPieces))}</span>
                    <span className="text-gray-500 dark:text-gray-400">MO: {formatCurrency(Number(m.coutMainOeuvre))}</span>
                    <span className="text-gray-500 dark:text-gray-400">Ext: {formatCurrency(Number(m.coutExterne))}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">Total: {formatCurrency(coutTotal)}</span>
                  </div>
                )}

                {canUpdate && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleOpenIntervention(m)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Enregistrer / Modifier
                    </button>
                    {m.statut === 'EN_COURS' && (
                      <button
                        onClick={() => updateStatutMutation.mutate({ id: m.id, statut: 'TERMINE' })}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      >
                        Terminer
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Intervention Modal */}
      {showModal && selectedMaintenance && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Intervention - {selectedMaintenance.numero}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedMaintenance.titre} - {selectedMaintenance.camion?.immatriculation}
              </p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Statut</label>
                  <select
                    value={formData.statut}
                    onChange={(e) => setFormData({ ...formData, statut: e.target.value as StatutMaintenance })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="EN_COURS">En cours</option>
                    <option value="TERMINE">Terminée</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date début</label>
                  <input
                    type="date"
                    value={formData.dateDebut || ''}
                    onChange={(e) => setFormData({ ...formData, dateDebut: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date fin</label>
                  <input
                    type="date"
                    value={formData.dateFin || ''}
                    onChange={(e) => setFormData({ ...formData, dateFin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Travaux effectués / Opérations
                </label>
                <textarea
                  value={formData.travauxEffectues || ''}
                  onChange={(e) => setFormData({ ...formData, travauxEffectues: e.target.value })}
                  rows={4}
                  placeholder="Décrire les travaux et opérations effectués..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Pieces utilisees */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Pièces utilisées / remplacées
                </label>

                {formData.piecesUtilisees && formData.piecesUtilisees.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {formData.piecesUtilisees.map((piece, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">{piece.designation}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Réf: {piece.reference} | Qté: {piece.quantite} | Prix: {piece.prixUnitaire?.toLocaleString() || 0} FCFA
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            Provenance: {SOURCE_PIECE_LABELS[piece.source] || piece.source}
                            {piece.sourceDetail && ` - ${piece.sourceDetail}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePiece(index)}
                          className="text-red-600 hover:text-red-700 ml-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mb-3 flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saisieLibre}
                      onChange={(e) => setSaisieLibre(e.target.checked)}
                      className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Saisie libre (pièce hors catalogue)</span>
                  </label>
                </div>

                <div className="space-y-3">
                  {!saisieLibre ? (
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Pièce du catalogue</label>
                      <select
                        value={newPiece.pieceId || ''}
                        onChange={(e) => {
                          const piece = cataloguePieces?.find(p => p.id === parseInt(e.target.value));
                          if (piece) handleSelectPieceFromCatalogue(piece);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      >
                        <option value="">-- Choisir une pièce --</option>
                        {cataloguePieces?.filter(p => p.actif).map((piece) => (
                          <option key={piece.id} value={piece.id}>
                            {piece.reference} - {piece.designation}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={newPiece.reference}
                        onChange={(e) => setNewPiece({ ...newPiece, reference: e.target.value })}
                        placeholder="Référence"
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                      <input
                        type="text"
                        value={newPiece.designation}
                        onChange={(e) => setNewPiece({ ...newPiece, designation: e.target.value })}
                        placeholder="Désignation"
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Quantité</label>
                      <input
                        type="number"
                        value={newPiece.quantite}
                        onChange={(e) => setNewPiece({ ...newPiece, quantite: parseInt(e.target.value) || 1 })}
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Prix unitaire (FCFA)</label>
                      <input
                        type="number"
                        value={newPiece.prixUnitaire}
                        onChange={(e) => setNewPiece({ ...newPiece, prixUnitaire: parseFloat(e.target.value) || 0 })}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Provenance *</label>
                      <select
                        value={newPiece.source}
                        onChange={(e) => setNewPiece({ ...newPiece, source: e.target.value, sourceDetail: '' })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      >
                        {Object.entries(SOURCE_PIECE_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {newPiece.source === 'FOURNISSEUR' ? 'Fournisseur' :
                         newPiece.source === 'AUTRE_CAMION' ? 'Camion d\'origine' :
                         'Détail (optionnel)'}
                      </label>
                      {newPiece.source === 'FOURNISSEUR' ? (
                        <select
                          value={newPiece.sourceDetail}
                          onChange={(e) => setNewPiece({ ...newPiece, sourceDetail: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        >
                          <option value="">-- Choisir --</option>
                          {fournisseurs?.filter(f => f.actif).map((f) => (
                            <option key={f.id} value={f.raisonSociale}>{f.raisonSociale}</option>
                          ))}
                          <option value="AUTRE">Autre fournisseur</option>
                        </select>
                      ) : newPiece.source === 'AUTRE_CAMION' ? (
                        <select
                          value={newPiece.sourceDetail}
                          onChange={(e) => setNewPiece({ ...newPiece, sourceDetail: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        >
                          <option value="">-- Choisir --</option>
                          {camions?.map((c) => (
                            <option key={c.id} value={c.immatriculation}>{c.immatriculation} - {c.marque}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={newPiece.sourceDetail}
                          onChange={(e) => setNewPiece({ ...newPiece, sourceDetail: e.target.value })}
                          placeholder="Précision optionnelle"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        />
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddPiece}
                    disabled={!newPiece.reference || !newPiece.designation}
                    className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    + Ajouter cette pièce
                  </button>
                </div>
              </div>

              {canSeeFinancial && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Coût pièces (auto)</label>
                    <input
                      type="number"
                      value={formData.coutPieces || 0}
                      onChange={(e) => setFormData({ ...formData, coutPieces: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Coût main d'œuvre</label>
                    <input
                      type="number"
                      value={formData.coutMainOeuvre || 0}
                      onChange={(e) => setFormData({ ...formData, coutMainOeuvre: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Coût externe</label>
                    <input
                      type="number"
                      value={formData.coutExterne || 0}
                      onChange={(e) => setFormData({ ...formData, coutExterne: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observations</label>
                <textarea
                  value={formData.observations || ''}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setSelectedMaintenance(null); }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 rounded-lg font-medium disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedMaintenance && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedMaintenance.numero}</h2>
                <p className="text-gray-500 dark:text-gray-400">{selectedMaintenance.titre}</p>
              </div>
              <button
                onClick={handleCloseDetail}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Camion</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedMaintenance.camion?.immatriculation} - {selectedMaintenance.camion?.marque}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Type</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {TYPE_MAINTENANCE_LABELS[selectedMaintenance.type]}
                  </p>
                </div>
              </div>
              {selectedMaintenance.travauxEffectues && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Travaux effectués</p>
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{selectedMaintenance.travauxEffectues}</p>
                </div>
              )}
              {selectedMaintenance.piecesUtilisees && selectedMaintenance.piecesUtilisees.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Pièces utilisées</p>
                  <div className="space-y-1">
                    {selectedMaintenance.piecesUtilisees.map((p, idx) => (
                      <div key={idx} className="text-sm text-gray-900 dark:text-white">
                        • {p.designation} ({p.reference}) x{p.quantite} - {SOURCE_PIECE_LABELS[p.source] || p.source}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
