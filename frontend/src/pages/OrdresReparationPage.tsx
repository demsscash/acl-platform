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
import { useAuthStore } from '../stores/auth.store';

export default function OrdresReparationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { hasModulePermission } = useAuthStore();

  const canCreate = hasModulePermission('entretien', 'create');
  const canUpdate = hasModulePermission('entretien', 'update');
  const canDelete = hasModulePermission('entretien', 'delete');

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState<Maintenance | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<TypeMaintenance | ''>('');
  const [filterPriorite, setFilterPriorite] = useState<PrioriteMaintenance | ''>('');

  const [formData, setFormData] = useState<CreateMaintenanceDto & UpdateMaintenanceDto>({
    type: 'PREVENTIVE',
    priorite: 'NORMALE',
    titre: '',
    description: '',
    camionId: 0,
    datePlanifiee: new Date().toISOString().split('T')[0],
    kilometrageActuel: undefined,
    prochainKilometrage: undefined,
    prestataireExterne: '',
    observations: '',
  });

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

  const { data: allMaintenances, isLoading } = useQuery({
    queryKey: ['maintenances', 'ordres', search, filterType, filterPriorite],
    queryFn: () => entretienService.getAll({
      search: search || undefined,
      type: filterType || undefined,
      priorite: filterPriorite || undefined,
    }),
  });

  // Filtrer uniquement les ordres planifies ou en attente de pieces
  const maintenances = (allMaintenances || []).filter(
    m => m.statut === 'PLANIFIE' || m.statut === 'EN_ATTENTE_PIECES'
  );

  const { data: camions } = useQuery({
    queryKey: ['camions'],
    queryFn: camionsService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: entretienService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      setShowModal(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMaintenanceDto }) =>
      entretienService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      setShowModal(false);
      setSelectedMaintenance(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: entretienService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
    },
  });

  const updateStatutMutation = useMutation({
    mutationFn: ({ id, statut }: { id: number; statut: StatutMaintenance }) =>
      entretienService.updateStatut(id, statut),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
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
      prestataireExterne: '',
      observations: '',
    });
  };

  const handleEdit = (m: Maintenance) => {
    setSelectedMaintenance(m);
    setFormData({
      type: m.type,
      priorite: m.priorite,
      titre: m.titre,
      description: m.description || '',
      camionId: m.camionId,
      datePlanifiee: m.datePlanifiee.split('T')[0],
      kilometrageActuel: m.kilometrageActuel,
      prochainKilometrage: m.prochainKilometrage,
      prestataireExterne: m.prestataireExterne || '',
      observations: m.observations || '',
    });
    setShowModal(true);
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
    if (confirm('Supprimer cet ordre de reparation ?')) {
      deleteMutation.mutate(id);
    }
  };

  const getPrioriteBadgeClass = (priorite: PrioriteMaintenance) => {
    switch (priorite) {
      case 'BASSE': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'NORMALE': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'HAUTE': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'URGENTE': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatutBadgeClass = (statut: StatutMaintenance) => {
    switch (statut) {
      case 'PLANIFIE': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'EN_ATTENTE_PIECES': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalPlanifie = maintenances.filter(m => m.statut === 'PLANIFIE').length;
  const totalAttentePieces = maintenances.filter(m => m.statut === 'EN_ATTENTE_PIECES').length;
  const totalUrgent = maintenances.filter(m => m.priorite === 'URGENTE').length;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ordres de Reparation</h1>
          <p className="text-gray-500 dark:text-gray-400">Planification des interventions de maintenance</p>
        </div>
        {canCreate && (
          <button
            onClick={() => { resetForm(); setSelectedMaintenance(null); setShowModal(true); }}
            className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-4 py-2 rounded-lg font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvel ordre de reparation
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total planifie</p>
          <p className="text-3xl font-bold text-blue-600">{totalPlanifie}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">En attente de pieces</p>
          <p className="text-3xl font-bold text-yellow-600">{totalAttentePieces}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Urgent</p>
          <p className="text-3xl font-bold text-red-600">{totalUrgent}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        ) : maintenances.length > 0 ? (
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
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {maintenances.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium text-yellow-600">{m.numero}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{m.camion?.immatriculation || '-'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{TYPE_MAINTENANCE_LABELS[m.type]}</td>
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
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canUpdate && (
                        <button
                          onClick={() => updateStatutMutation.mutate({ id: m.id, statut: 'EN_COURS' })}
                          className="text-orange-600 hover:text-orange-700 text-xs font-medium px-2 py-1 bg-orange-50 dark:bg-orange-900/20 rounded"
                          title="Demarrer l'intervention"
                        >
                          Demarrer
                        </button>
                      )}
                      {canUpdate && (
                        <button onClick={() => handleEdit(m)} className="text-blue-600 hover:text-blue-700" title="Modifier">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleDelete(m.id)} className="text-red-600 hover:text-red-700" title="Supprimer">
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
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Aucun ordre de reparation en attente</div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowModal(false); setSelectedMaintenance(null); resetForm(); }}>
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedMaintenance ? 'Modifier l\'ordre' : 'Nouvel ordre de reparation'}
              </h2>
              <button onClick={() => { setShowModal(false); setSelectedMaintenance(null); resetForm(); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
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
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowDetailModal(false); setSelectedMaintenance(null); searchParams.delete('id'); setSearchParams(searchParams); }}>
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedMaintenance.numero}</h2>
                <p className="text-gray-500 dark:text-gray-400">{selectedMaintenance.titre}</p>
              </div>
              <button
                onClick={() => { setShowDetailModal(false); setSelectedMaintenance(null); searchParams.delete('id'); setSearchParams(searchParams); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatutBadgeClass(selectedMaintenance.statut)}`}>
                  {STATUT_MAINTENANCE_LABELS[selectedMaintenance.statut]}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPrioriteBadgeClass(selectedMaintenance.priorite)}`}>
                  {PRIORITE_MAINTENANCE_LABELS[selectedMaintenance.priorite]}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Camion</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedMaintenance.camion?.immatriculation} - {selectedMaintenance.camion?.marque}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Type</p>
                  <p className="font-medium text-gray-900 dark:text-white">{TYPE_MAINTENANCE_LABELS[selectedMaintenance.type]}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Date prevue</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date(selectedMaintenance.datePlanifiee).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                {selectedMaintenance.kilometrageActuel && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Kilometrage</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedMaintenance.kilometrageActuel.toLocaleString()} km
                    </p>
                  </div>
                )}
              </div>

              {selectedMaintenance.description && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Description</p>
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{selectedMaintenance.description}</p>
                </div>
              )}

              {selectedMaintenance.observations && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Observations</p>
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{selectedMaintenance.observations}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
