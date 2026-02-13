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
  CreateMaintenanceDto,
  UpdateMaintenanceDto,
  TypeMaintenance,
  StatutMaintenance,
  PrioriteMaintenance,
} from '../services/entretien.service';
import camionsService from '../services/camions.service';
import piecesService from '../services/pieces.service';
import type { CataloguePiece } from '../services/pieces.service';
import { useAuthStore } from '../stores/auth.store';

// Sources de provenance des pieces
const SOURCE_PIECE_LABELS: Record<string, string> = {
  MAGASIN: 'Magasin (stock interne)',
  FOURNISSEUR: 'Fournisseur (achat direct)',
  AUTRE_CAMION: 'Autre camion (recuperation)',
  AUTRE: 'Autre',
};

export default function EntretienPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { hasModulePermission, canViewFinancialData } = useAuthStore();

  const canCreate = hasModulePermission('entretien', 'create');
  const canUpdate = hasModulePermission('entretien', 'update');
  const canDelete = hasModulePermission('entretien', 'delete');
  const canSeeFinancial = canViewFinancialData('entretien');

  // State
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState<Maintenance | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState<StatutMaintenance | ''>('');
  const [filterType, setFilterType] = useState<TypeMaintenance | ''>('');
  const [filterPriorite, setFilterPriorite] = useState<PrioriteMaintenance | ''>('');

  // Form state
  const [formData, setFormData] = useState<CreateMaintenanceDto & UpdateMaintenanceDto>({
    type: 'PREVENTIVE',
    priorite: 'NORMALE',
    titre: '',
    description: '',
    camionId: 0,
    datePlanifiee: new Date().toISOString().split('T')[0],
    kilometrageActuel: undefined,
    prochainKilometrage: undefined,
    technicienId: undefined,
    prestataireExterne: '',
    coutPieces: 0,
    coutMainOeuvre: 0,
    coutExterne: 0,
    observations: '',
    travauxEffectues: '',
    piecesUtilisees: [],
  });

  // State for adding new piece
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

  // Check for id param to open detail modal
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

  // Queries
  const { data: maintenances, isLoading } = useQuery({
    queryKey: ['maintenances', search, filterStatut, filterType, filterPriorite],
    queryFn: () => entretienService.getAll({
      search: search || undefined,
      statut: filterStatut || undefined,
      type: filterType || undefined,
      priorite: filterPriorite || undefined,
    }),
  });

  const { data: stats } = useQuery({
    queryKey: ['maintenances-stats'],
    queryFn: entretienService.getStats,
  });

  const { data: camions } = useQuery({
    queryKey: ['camions'],
    queryFn: camionsService.getAll,
  });

  // Catalogue de pieces et fournisseurs pour la selection
  const { data: cataloguePieces } = useQuery({
    queryKey: ['catalogue-pieces'],
    queryFn: piecesService.getAll,
  });

  const { data: fournisseurs } = useQuery({
    queryKey: ['fournisseurs'],
    queryFn: piecesService.getFournisseurs,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: entretienService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      queryClient.invalidateQueries({ queryKey: ['maintenances-stats'] });
      setShowModal(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMaintenanceDto }) =>
      entretienService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      queryClient.invalidateQueries({ queryKey: ['maintenances-stats'] });
      setShowModal(false);
      setSelectedMaintenance(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: entretienService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      queryClient.invalidateQueries({ queryKey: ['maintenances-stats'] });
    },
  });

  const updateStatutMutation = useMutation({
    mutationFn: ({ id, statut }: { id: number; statut: StatutMaintenance }) =>
      entretienService.updateStatut(id, statut),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      queryClient.invalidateQueries({ queryKey: ['maintenances-stats'] });
    },
  });

  const resetForm = () => {
    setFormData({
      type: 'PREVENTIVE',
      priorite: 'NORMALE',
      titre: '',
      description: '',
      camionId: 0,
      datePlanifiee: new Date().toISOString().split('T')[0],
      kilometrageActuel: undefined,
      prochainKilometrage: undefined,
      technicienId: undefined,
      prestataireExterne: '',
      coutPieces: 0,
      coutMainOeuvre: 0,
      coutExterne: 0,
      observations: '',
      travauxEffectues: '',
      piecesUtilisees: [],
    });
    setNewPiece({ pieceId: 0, reference: '', designation: '', quantite: 1, prixUnitaire: 0, source: 'MAGASIN', sourceDetail: '' });
    setSaisieLibre(false);
  };

  const handleAddPiece = () => {
    if (newPiece.reference && newPiece.designation && newPiece.source) {
      const pieces = formData.piecesUtilisees || [];
      const pieceToAdd = {
        pieceId: newPiece.pieceId || Date.now(),
        reference: newPiece.reference,
        designation: newPiece.designation,
        quantite: newPiece.quantite,
        prixUnitaire: newPiece.prixUnitaire,
        source: newPiece.source,
        sourceDetail: newPiece.sourceDetail,
      };
      setFormData({
        ...formData,
        piecesUtilisees: [...pieces, pieceToAdd],
      });
      setNewPiece({ pieceId: 0, reference: '', designation: '', quantite: 1, prixUnitaire: 0, source: 'MAGASIN', sourceDetail: '' });
      setSaisieLibre(false);
    }
  };

  // Quand on selectionne une piece du catalogue
  const handleSelectPieceFromCatalogue = (piece: CataloguePiece) => {
    setNewPiece({
      ...newPiece,
      pieceId: piece.id,
      reference: piece.reference,
      designation: piece.designation,
      prixUnitaire: piece.prixUnitaireMoyen || 0,
    });
  };

  const handleRemovePiece = (index: number) => {
    const pieces = formData.piecesUtilisees || [];
    setFormData({
      ...formData,
      piecesUtilisees: pieces.filter((_, i) => i !== index),
    });
  };

  const handleEdit = (maintenance: Maintenance) => {
    setSelectedMaintenance(maintenance);
    setFormData({
      type: maintenance.type,
      priorite: maintenance.priorite,
      titre: maintenance.titre,
      description: maintenance.description || '',
      camionId: maintenance.camionId,
      datePlanifiee: maintenance.datePlanifiee.split('T')[0],
      kilometrageActuel: maintenance.kilometrageActuel,
      prochainKilometrage: maintenance.prochainKilometrage,
      prestataireExterne: maintenance.prestataireExterne || '',
      coutPieces: maintenance.coutPieces,
      coutMainOeuvre: maintenance.coutMainOeuvre,
      coutExterne: maintenance.coutExterne,
      observations: maintenance.observations || '',
      travauxEffectues: maintenance.travauxEffectues || '',
      piecesUtilisees: maintenance.piecesUtilisees || [],
    });
    setShowModal(true);
  };

  const handleViewDetail = (maintenance: Maintenance) => {
    setSelectedMaintenance(maintenance);
    setShowDetailModal(true);
    setSearchParams({ id: maintenance.id.toString() });
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedMaintenance(null);
    searchParams.delete('id');
    setSearchParams(searchParams);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMaintenance) {
      updateMutation.mutate({ id: selectedMaintenance.id, data: formData });
    } else {
      createMutation.mutate(formData as CreateMaintenanceDto);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Supprimer cette maintenance ?')) {
      deleteMutation.mutate(id);
    }
  };

  const getStatutBadgeClass = (statut: StatutMaintenance) => {
    switch (statut) {
      case 'PLANIFIE': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'EN_ATTENTE_PIECES': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'EN_COURS': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'TERMINE': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'ANNULE': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPrioriteBadgeClass = (priorite: PrioriteMaintenance) => {
    switch (priorite) {
      case 'BASSE': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'NORMALE': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'HAUTE': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'URGENTE': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Entretien & Maintenance</h1>
          <p className="text-gray-500 dark:text-gray-400">Gestion des maintenances des camions</p>
        </div>
        {canCreate && (
          <button
            onClick={() => { resetForm(); setSelectedMaintenance(null); setShowModal(true); }}
            className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-4 py-2 rounded-lg font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle maintenance
          </button>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Planifie</p>
            <p className="text-2xl font-bold text-blue-600">{stats.planifie}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">En cours</p>
            <p className="text-2xl font-bold text-orange-600">{stats.enCours}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Termine</p>
            <p className="text-2xl font-bold text-green-600">{stats.termine}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">En retard</p>
            <p className="text-2xl font-bold text-red-600">{stats.enRetard}</p>
          </div>
          {canSeeFinancial && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Cout ce mois</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.coutTotalMois)}</p>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recherche</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Numero, titre, immatriculation..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Statut</label>
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value as StatutMaintenance | '')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Tous</option>
              {Object.entries(STATUT_MAINTENANCE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as TypeMaintenance | '')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Tous</option>
              {Object.entries(TYPE_MAINTENANCE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priorite</label>
            <select
              value={filterPriorite}
              onChange={(e) => setFilterPriorite(e.target.value as PrioriteMaintenance | '')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Toutes</option>
              {Object.entries(PRIORITE_MAINTENANCE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Chargement...</div>
        ) : maintenances && maintenances.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Numero</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Camion</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Titre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date prevue</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Priorite</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Statut</th>
                {canSeeFinancial && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Cout</th>
                )}
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {maintenances.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleViewDetail(m)}
                      className="text-yellow-600 hover:text-yellow-700 font-medium"
                    >
                      {m.numero}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">
                    {m.camion?.immatriculation || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {TYPE_MAINTENANCE_LABELS[m.type]}
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{m.titre}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {new Date(m.datePlanifiee).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPrioriteBadgeClass(m.priorite)}`}>
                      {PRIORITE_MAINTENANCE_LABELS[m.priorite]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatutBadgeClass(m.statut)}`}>
                      {STATUT_MAINTENANCE_LABELS[m.statut]}
                    </span>
                  </td>
                  {canSeeFinancial && (
                    <td className="px-4 py-3 text-gray-900 dark:text-white">
                      {formatCurrency(Number(m.coutPieces) + Number(m.coutMainOeuvre) + Number(m.coutExterne))}
                    </td>
                  )}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canUpdate && m.statut === 'PLANIFIE' && (
                        <button
                          onClick={() => updateStatutMutation.mutate({ id: m.id, statut: 'EN_COURS' })}
                          className="text-orange-600 hover:text-orange-700"
                          title="Demarrer"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      )}
                      {canUpdate && m.statut === 'EN_COURS' && (
                        <button
                          onClick={() => updateStatutMutation.mutate({ id: m.id, statut: 'TERMINE' })}
                          className="text-green-600 hover:text-green-700"
                          title="Terminer"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      )}
                      {canUpdate && (
                        <button
                          onClick={() => handleEdit(m)}
                          className="text-blue-600 hover:text-blue-700"
                          title="Modifier"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="text-red-600 hover:text-red-700"
                          title="Supprimer"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Aucune maintenance trouvee
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedMaintenance ? 'Modifier la maintenance' : 'Nouvelle maintenance'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Camion *</label>
                  <select
                    value={formData.camionId}
                    onChange={(e) => setFormData({ ...formData, camionId: parseInt(e.target.value) })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value={0}>Selectionner un camion</option>
                    {camions?.map((c) => (
                      <option key={c.id} value={c.id}>{c.immatriculation} - {c.marque}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as TypeMaintenance })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {Object.entries(TYPE_MAINTENANCE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titre *</label>
                <input
                  type="text"
                  value={formData.titre}
                  onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date prevue *</label>
                  <input
                    type="date"
                    value={formData.datePlanifiee}
                    onChange={(e) => setFormData({ ...formData, datePlanifiee: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priorite</label>
                  <select
                    value={formData.priorite}
                    onChange={(e) => setFormData({ ...formData, priorite: e.target.value as PrioriteMaintenance })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {Object.entries(PRIORITE_MAINTENANCE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kilometrage actuel</label>
                  <input
                    type="number"
                    value={formData.kilometrageActuel || ''}
                    onChange={(e) => setFormData({ ...formData, kilometrageActuel: parseInt(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prochain kilometrage</label>
                  <input
                    type="number"
                    value={formData.prochainKilometrage || ''}
                    onChange={(e) => setFormData({ ...formData, prochainKilometrage: parseInt(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prestataire externe</label>
                <input
                  type="text"
                  value={formData.prestataireExterne}
                  onChange={(e) => setFormData({ ...formData, prestataireExterne: e.target.value })}
                  placeholder="Nom du garage externe si applicable"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {canSeeFinancial && selectedMaintenance && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cout pieces</label>
                      <input
                        type="number"
                        value={formData.coutPieces || 0}
                        onChange={(e) => setFormData({ ...formData, coutPieces: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cout main d'oeuvre</label>
                      <input
                        type="number"
                        value={formData.coutMainOeuvre || 0}
                        onChange={(e) => setFormData({ ...formData, coutMainOeuvre: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cout externe</label>
                      <input
                        type="number"
                        value={formData.coutExterne || 0}
                        onChange={(e) => setFormData({ ...formData, coutExterne: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Pieces utilisees */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Pieces changees / utilisees
                </label>

                {/* Liste des pieces ajoutees */}
                {formData.piecesUtilisees && formData.piecesUtilisees.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {formData.piecesUtilisees.map((piece, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">{piece.designation}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Ref: {piece.reference} | Qte: {piece.quantite} | Prix: {piece.prixUnitaire?.toLocaleString() || 0} FCFA
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

                {/* Toggle saisie libre / catalogue */}
                <div className="mb-3 flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saisieLibre}
                      onChange={(e) => setSaisieLibre(e.target.checked)}
                      className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Saisie libre (piece hors catalogue)</span>
                  </label>
                </div>

                {/* Selection piece du catalogue OU saisie libre */}
                <div className="space-y-3">
                  {!saisieLibre ? (
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Selectionner une piece du catalogue</label>
                      <select
                        value={newPiece.pieceId || ''}
                        onChange={(e) => {
                          const piece = cataloguePieces?.find(p => p.id === parseInt(e.target.value));
                          if (piece) handleSelectPieceFromCatalogue(piece);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      >
                        <option value="">-- Choisir une piece --</option>
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
                        placeholder="Reference"
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                      <input
                        type="text"
                        value={newPiece.designation}
                        onChange={(e) => setNewPiece({ ...newPiece, designation: e.target.value })}
                        placeholder="Designation"
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                  )}

                  {/* Quantite et Prix */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Quantite</label>
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

                  {/* Source / Provenance */}
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
                         'Detail (optionnel)'}
                      </label>
                      {newPiece.source === 'FOURNISSEUR' ? (
                        <select
                          value={newPiece.sourceDetail}
                          onChange={(e) => setNewPiece({ ...newPiece, sourceDetail: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        >
                          <option value="">-- Choisir un fournisseur --</option>
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
                          <option value="">-- Choisir le camion --</option>
                          {camions?.map((c) => (
                            <option key={c.id} value={c.immatriculation}>{c.immatriculation} - {c.marque}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={newPiece.sourceDetail}
                          onChange={(e) => setNewPiece({ ...newPiece, sourceDetail: e.target.value })}
                          placeholder="Precision optionnelle"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        />
                      )}
                    </div>
                  </div>

                  {/* Bouton Ajouter */}
                  <button
                    type="button"
                    onClick={handleAddPiece}
                    disabled={!newPiece.reference || !newPiece.designation}
                    className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Ajouter cette piece
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Travaux effectues</label>
                <textarea
                  value={formData.travauxEffectues}
                  onChange={(e) => setFormData({ ...formData, travauxEffectues: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observations</label>
                <textarea
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setSelectedMaintenance(null); resetForm(); }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 rounded-lg font-medium disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
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
            <div className="p-6 space-y-6">
              {/* Status & Priority */}
              <div className="flex gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatutBadgeClass(selectedMaintenance.statut)}`}>
                  {STATUT_MAINTENANCE_LABELS[selectedMaintenance.statut]}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPrioriteBadgeClass(selectedMaintenance.priorite)}`}>
                  {PRIORITE_MAINTENANCE_LABELS[selectedMaintenance.priorite]}
                </span>
              </div>

              {/* Info Grid */}
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
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Date prevue</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date(selectedMaintenance.datePlanifiee).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                {selectedMaintenance.dateDebut && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Date debut</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(selectedMaintenance.dateDebut).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                )}
                {selectedMaintenance.dateFin && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Date fin</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(selectedMaintenance.dateFin).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                )}
                {selectedMaintenance.kilometrageActuel && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Kilometrage</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedMaintenance.kilometrageActuel.toLocaleString()} km
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedMaintenance.description && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Description</p>
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{selectedMaintenance.description}</p>
                </div>
              )}

              {/* Travaux */}
              {selectedMaintenance.travauxEffectues && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Travaux effectues</p>
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{selectedMaintenance.travauxEffectues}</p>
                </div>
              )}

              {/* Pieces utilisees */}
              {selectedMaintenance.piecesUtilisees && selectedMaintenance.piecesUtilisees.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-3">
                    Pieces changees ({selectedMaintenance.piecesUtilisees.length})
                  </p>
                  <div className="space-y-2">
                    {selectedMaintenance.piecesUtilisees.map((piece, index) => (
                      <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{piece.designation}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Ref: {piece.reference}</p>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                              Provenance: {SOURCE_PIECE_LABELS[piece.source] || piece.source || 'Non specifie'}
                              {piece.sourceDetail && ` - ${piece.sourceDetail}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-900 dark:text-white">x{piece.quantite}</p>
                            {canSeeFinancial && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {(piece.quantite * (piece.prixUnitaire || 0)).toLocaleString()} FCFA
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {canSeeFinancial && (
                    <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800 text-right">
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        Total pieces: {selectedMaintenance.piecesUtilisees.reduce((sum, p) => sum + (p.quantite * (p.prixUnitaire || 0)), 0).toLocaleString()} FCFA
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Costs */}
              {canSeeFinancial && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Couts</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Pieces</p>
                      <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(Number(selectedMaintenance.coutPieces))}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Main d'oeuvre</p>
                      <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(Number(selectedMaintenance.coutMainOeuvre))}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Externe</p>
                      <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(Number(selectedMaintenance.coutExterne))}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatCurrency(Number(selectedMaintenance.coutPieces) + Number(selectedMaintenance.coutMainOeuvre) + Number(selectedMaintenance.coutExterne))}
                    </p>
                  </div>
                </div>
              )}

              {/* Observations */}
              {selectedMaintenance.observations && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Observations</p>
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{selectedMaintenance.observations}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                {canUpdate && (
                  <button
                    onClick={() => { handleCloseDetail(); handleEdit(selectedMaintenance); }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                  >
                    Modifier
                  </button>
                )}
                <button
                  onClick={handleCloseDetail}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
