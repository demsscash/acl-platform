import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import caissesService from '../services/caisses.service';
import { useToast } from '../components/ui/Toast';
import { SkeletonTable, EmptyState, Breadcrumb } from '../components/ui';
import { useEscapeKey } from '../hooks/useKeyboardShortcuts';
import type { Caisse, MouvementCaisse, TypeCaisse, TypeMouvement } from '../types';

const typeCaisseLabels: Record<TypeCaisse, string> = {
  CENTRALE: 'Centrale',
  LOGISTIQUE: 'Logistique',
};

const typeMouvementLabels: Record<TypeMouvement, string> = {
  ENTREE: 'Entrée',
  SORTIE: 'Sortie',
  VIREMENT_INTERNE: 'Virement interne',
};

const typeMouvementColors: Record<TypeMouvement, string> = {
  ENTREE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  SORTIE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  VIREMENT_INTERNE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

// Modes de paiement pour les entrées de la Caisse CENTRALE (alimentée par compte bancaire)
const modesEntreeCentrale = [
  { value: 'VIREMENT', label: 'Virement bancaire' },
  { value: 'CHEQUE', label: 'Chèque' },
  { value: 'ESPECE', label: 'Espèces' },
  { value: 'AUTRE', label: 'Autre' },
];

// Modes de paiement pour les sorties de la Caisse LOGISTIQUE (Mobile Money, espèces)
const modesSortieLogistique = [
  { value: 'ORANGE_MONEY', label: 'Orange Money' },
  { value: 'WAVE', label: 'Wave' },
  { value: 'FREE_MONEY', label: 'Free Money' },
  { value: 'MOBILE_MONEY_AUTRE', label: 'Autre Mobile Money' },
  { value: 'ESPECE', label: 'Remise espèces' },
  { value: 'AUTRE', label: 'Autre' },
];

// Modes de sortie pour la caisse CENTRALE (virements vers banque ou autre)
const modesSortieCentrale = [
  { value: 'VIREMENT', label: 'Virement bancaire' },
  { value: 'CHEQUE', label: 'Chèque' },
  { value: 'AUTRE', label: 'Autre' },
];

const modePaiementLabels: Record<string, string> = {
  VIREMENT: 'Virement',
  CHEQUE: 'Chèque',
  ESPECE: 'Espèces',
  ORANGE_MONEY: 'Orange Money',
  WAVE: 'Wave',
  FREE_MONEY: 'Free Money',
  MOBILE_MONEY_AUTRE: 'Mobile Money',
  AUTRE: 'Autre',
};

export default function CaissesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [selectedCaisse, setSelectedCaisse] = useState<Caisse | null>(null);
  const [showCaisseModal, setShowCaisseModal] = useState(false);
  const [showMouvementModal, setShowMouvementModal] = useState(false);
  const [showVirementModal, setShowVirementModal] = useState(false);
  const [editingCaisse, setEditingCaisse] = useState<Caisse | null>(null);

  useEscapeKey(() => {
    if (showCaisseModal) setShowCaisseModal(false);
    if (showMouvementModal) setShowMouvementModal(false);
    if (showVirementModal) setShowVirementModal(false);
    if (selectedCaisse) setSelectedCaisse(null);
  });

  const [caisseForm, setCaisseForm] = useState({
    nom: '',
    type: 'CENTRALE' as TypeCaisse,
    soldeInitial: 0,
  });

  const [mouvementForm, setMouvementForm] = useState({
    type: 'ENTREE' as TypeMouvement,
    nature: '',
    montant: 0,
    beneficiaire: '',
    modePaiement: '',
    numeroReference: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    referenceExterne: '',
    preuveUrl: '',
  });

  const [virementForm, setVirementForm] = useState({
    caisseSourceId: 0,
    caisseDestinationId: 0,
    montant: 0,
    nature: 'Alimentation caisse logistique',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    preuveUrl: '',
  });

  // Queries - must be defined before using their data
  const { data: caisses, isLoading } = useQuery({
    queryKey: ['caisses'],
    queryFn: caissesService.getAll,
  });

  // Caisses pour affichage temps réel
  const caisseCentrale = caisses?.find(c => c.type === 'CENTRALE');
  const caisseLogistique = caisses?.find(c => c.type === 'LOGISTIQUE');

  const { data: stats } = useQuery({
    queryKey: ['caisses-stats'],
    queryFn: caissesService.getStats,
  });

  const { data: mouvements } = useQuery({
    queryKey: ['caisses-mouvements', selectedCaisse?.id],
    queryFn: () => selectedCaisse ? caissesService.getMouvements(selectedCaisse.id) : Promise.resolve([]),
    enabled: !!selectedCaisse,
  });

  const createCaisseMutation = useMutation({
    mutationFn: caissesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caisses'] });
      queryClient.invalidateQueries({ queryKey: ['caisses-stats'] });
      setShowCaisseModal(false);
      resetCaisseForm();
      toast.success('Caisse créée avec succès');
    },
    onError: () => toast.error('Erreur lors de la création'),
  });

  const updateCaisseMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => caissesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caisses'] });
      setShowCaisseModal(false);
      setEditingCaisse(null);
      resetCaisseForm();
      toast.success('Caisse modifiée avec succès');
    },
    onError: () => toast.error('Erreur lors de la modification'),
  });

  const addMouvementMutation = useMutation({
    mutationFn: ({ caisseId, data }: { caisseId: number; data: any }) => caissesService.addMouvement(caisseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caisses'] });
      queryClient.invalidateQueries({ queryKey: ['caisses-stats'] });
      queryClient.invalidateQueries({ queryKey: ['caisses-mouvements'] });
      setShowMouvementModal(false);
      resetMouvementForm();
      toast.success('Mouvement enregistré avec succès');
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Erreur lors de l\'enregistrement'),
  });

  const virementMutation = useMutation({
    mutationFn: caissesService.virement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caisses'] });
      queryClient.invalidateQueries({ queryKey: ['caisses-stats'] });
      queryClient.invalidateQueries({ queryKey: ['caisses-mouvements'] });
      setShowVirementModal(false);
      resetVirementForm();
      toast.success('Virement effectué avec succès');
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Erreur lors du virement'),
  });

  const resetCaisseForm = () => setCaisseForm({ nom: '', type: 'CENTRALE', soldeInitial: 0 });
  const resetMouvementForm = () => setMouvementForm({
    type: 'ENTREE',
    nature: '',
    montant: 0,
    beneficiaire: '',
    modePaiement: '',
    numeroReference: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    referenceExterne: '',
    preuveUrl: '',
  });
  const resetVirementForm = () => setVirementForm({
    caisseSourceId: caisseCentrale?.id || 0,
    caisseDestinationId: caisseLogistique?.id || 0,
    montant: 0,
    nature: 'Alimentation caisse logistique',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    preuveUrl: '',
  });

  const handleEditCaisse = (caisse: Caisse) => {
    setEditingCaisse(caisse);
    setCaisseForm({ nom: caisse.nom, type: caisse.type, soldeInitial: Number(caisse.soldeInitial) });
    setShowCaisseModal(true);
  };

  const handleCaisseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCaisse) {
      updateCaisseMutation.mutate({ id: editingCaisse.id, data: { nom: caisseForm.nom, type: caisseForm.type } });
    } else {
      createCaisseMutation.mutate(caisseForm);
    }
  };

  const handleMouvementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaisse) return;
    addMouvementMutation.mutate({ caisseId: selectedCaisse.id, data: mouvementForm });
  };

  const handleVirementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    virementMutation.mutate(virementForm);
  };

  if (isLoading) {
    return (
      <div>
        <Breadcrumb />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Gestion des Caisses</h1>
        <SkeletonTable rows={4} columns={5} />
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des Caisses</h1>
          <p className="text-gray-600 dark:text-gray-400">Comptabilité et mouvements de trésorerie</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowVirementModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-500 flex items-center gap-2"
            disabled={!caisses || caisses.length < 2}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Virement
          </button>
          <button
            onClick={() => { setEditingCaisse(null); resetCaisseForm(); setShowCaisseModal(true); }}
            className="bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-yellow-400 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle caisse
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600 dark:text-gray-400">Nombre de caisses</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.totalCaisses || 0}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
          <p className="text-sm text-gray-600 dark:text-gray-400">Solde Caisse Centrale</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {Number(stats?.soldeTotalCentrale || 0).toLocaleString('fr-FR')} F
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border-l-4 border-green-500">
          <p className="text-sm text-gray-600 dark:text-gray-400">Solde Caisse Logistique</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {Number(stats?.soldeTotalLogistique || 0).toLocaleString('fr-FR')} F
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border-l-4 border-yellow-500">
          <p className="text-sm text-gray-600 dark:text-gray-400">Solde Général</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {Number(stats?.soldeGeneral || 0).toLocaleString('fr-FR')} F
          </p>
        </div>
      </div>

      {/* Caisses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {caisses?.map((caisse) => (
          <div
            key={caisse.id}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 cursor-pointer transition-all hover:shadow-md ${
              selectedCaisse?.id === caisse.id ? 'ring-2 ring-yellow-500' : ''
            }`}
            onClick={() => setSelectedCaisse(caisse)}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{caisse.nom}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  caisse.type === 'CENTRALE' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                }`}>
                  {typeCaisseLabels[caisse.type]}
                </span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleEditCaisse(caisse); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Solde initial</span>
                <span className="text-gray-700 dark:text-gray-300">{Number(caisse.soldeInitial).toLocaleString('fr-FR')} F</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Solde actuel</span>
                <span className={`text-lg font-bold ${Number(caisse.soldeActuel) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {Number(caisse.soldeActuel).toLocaleString('fr-FR')} F
                </span>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              {/* Entrée uniquement pour CENTRALE (LOGISTIQUE alimentée par virement) */}
              {caisse.type === 'CENTRALE' ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCaisse(caisse);
                    setMouvementForm({ ...mouvementForm, type: 'ENTREE' });
                    setShowMouvementModal(true);
                  }}
                  className="flex-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded hover:bg-green-200"
                >
                  + Entrée
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Virement de CENTRALE vers LOGISTIQUE
                    const caisseCentrale = caisses?.find(c => c.type === 'CENTRALE');
                    if (caisseCentrale) {
                      setVirementForm({
                        ...virementForm,
                        caisseSourceId: caisseCentrale.id,
                        caisseDestinationId: caisse.id,
                      });
                      setShowVirementModal(true);
                    }
                  }}
                  className="flex-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded hover:bg-blue-200"
                  title="Alimenter depuis la Caisse Centrale"
                >
                  + Alimenter
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCaisse(caisse);
                  setMouvementForm({ ...mouvementForm, type: 'SORTIE' });
                  setShowMouvementModal(true);
                }}
                className="flex-1 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2 py-1 rounded hover:bg-red-200"
              >
                - Sortie
              </button>
            </div>
          </div>
        ))}
        {(!caisses || caisses.length === 0) && (
          <div className="col-span-full">
            <EmptyState
              icon="document"
              title="Aucune caisse"
              description="Créez votre première caisse pour commencer"
              actionLabel="Nouvelle caisse"
              onAction={() => setShowCaisseModal(true)}
            />
          </div>
        )}
      </div>

      {/* Mouvements Table */}
      {selectedCaisse && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Historique - {selectedCaisse.nom}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Solde actuel: <span className="font-bold text-yellow-600">{Number(selectedCaisse.soldeActuel).toLocaleString('fr-FR')} F</span>
              </p>
            </div>
            <button
              onClick={() => setSelectedCaisse(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Mode</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nature</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Bénéficiaire</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Référence</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Montant</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Preuve</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {mouvements?.map((m: MouvementCaisse) => (
                <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {new Date(m.date).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeMouvementColors[m.type]}`}>
                      {typeMouvementLabels[m.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {m.modePaiement ? modePaiementLabels[m.modePaiement] || m.modePaiement : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{m.nature}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {m.type === 'VIREMENT_INTERNE' && m.caisseDestination ? `→ ${m.caisseDestination.nom}` : m.beneficiaire || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono">
                    {m.numeroReference || m.referenceExterne || '-'}
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-medium ${
                    m.type === 'ENTREE' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {m.type === 'ENTREE' ? '+' : '-'}{Number(m.montant).toLocaleString('fr-FR')} F
                  </td>
                  <td className="px-4 py-3 text-center">
                    {m.preuveUrl ? (
                      <a
                        href={m.preuveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                        title="Voir le justificatif"
                      >
                        <svg className="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </a>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {(!mouvements || mouvements.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    Aucun mouvement enregistré
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Caisse Modal */}
      {showCaisseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingCaisse ? 'Modifier la caisse' : 'Nouvelle caisse'}
            </h2>
            <form onSubmit={handleCaisseSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom *</label>
                  <input
                    type="text"
                    value={caisseForm.nom}
                    onChange={(e) => setCaisseForm({ ...caisseForm, nom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                    placeholder="Ex: Caisse Centrale"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type *</label>
                  <select
                    value={caisseForm.type}
                    onChange={(e) => setCaisseForm({ ...caisseForm, type: e.target.value as TypeCaisse })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="CENTRALE">Centrale</option>
                    <option value="LOGISTIQUE">Logistique</option>
                  </select>
                </div>
                {!editingCaisse && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Solde initial (FCFA)</label>
                    <input
                      type="number"
                      value={caisseForm.soldeInitial}
                      onChange={(e) => setCaisseForm({ ...caisseForm, soldeInitial: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      min="0"
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowCaisseModal(false); setEditingCaisse(null); resetCaisseForm(); }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createCaisseMutation.isPending || updateCaisseMutation.isPending}
                  className="px-4 py-2 bg-yellow-500 text-gray-900 rounded-lg font-medium hover:bg-yellow-400 disabled:opacity-50"
                >
                  {createCaisseMutation.isPending || updateCaisseMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mouvement Modal */}
      {showMouvementModal && selectedCaisse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {mouvementForm.type === 'ENTREE' ? 'Nouvelle entrée' : 'Nouvelle sortie'} - {selectedCaisse.nom}
            </h2>
            <form onSubmit={handleMouvementSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <select
                    value={mouvementForm.type}
                    onChange={(e) => setMouvementForm({ ...mouvementForm, type: e.target.value as TypeMouvement })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="ENTREE">Entrée</option>
                    <option value="SORTIE">Sortie</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nature/Description *</label>
                  <input
                    type="text"
                    value={mouvementForm.nature}
                    onChange={(e) => setMouvementForm({ ...mouvementForm, nature: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                    placeholder="Ex: Paiement client, Achat fournitures..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Montant (FCFA) *</label>
                  <input
                    type="number"
                    value={mouvementForm.montant}
                    onChange={(e) => setMouvementForm({ ...mouvementForm, montant: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mode de paiement *</label>
                  <select
                    value={mouvementForm.modePaiement}
                    onChange={(e) => setMouvementForm({ ...mouvementForm, modePaiement: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                  >
                    <option value="">-- Sélectionner --</option>
                    {(mouvementForm.type === 'ENTREE'
                      ? modesEntreeCentrale // Entrées uniquement pour CENTRALE
                      : selectedCaisse?.type === 'LOGISTIQUE'
                        ? modesSortieLogistique
                        : modesSortieCentrale
                    ).map((mode) => (
                      <option key={mode.value} value={mode.value}>{mode.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {mouvementForm.modePaiement === 'CHEQUE' ? 'N° Chèque' :
                     mouvementForm.modePaiement === 'VIREMENT' ? 'Référence virement' :
                     ['ORANGE_MONEY', 'WAVE', 'FREE_MONEY', 'MOBILE_MONEY_AUTRE'].includes(mouvementForm.modePaiement) ? 'N° Transaction' :
                     'Référence'}
                  </label>
                  <input
                    type="text"
                    value={mouvementForm.numeroReference}
                    onChange={(e) => setMouvementForm({ ...mouvementForm, numeroReference: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder={
                      mouvementForm.modePaiement === 'CHEQUE' ? 'Numéro du chèque' :
                      mouvementForm.modePaiement === 'VIREMENT' ? 'Référence du virement' :
                      ['ORANGE_MONEY', 'WAVE', 'FREE_MONEY', 'MOBILE_MONEY_AUTRE'].includes(mouvementForm.modePaiement) ? 'ID de la transaction' :
                      'Référence'
                    }
                  />
                </div>
                {mouvementForm.type === 'SORTIE' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bénéficiaire *</label>
                    <input
                      type="text"
                      value={mouvementForm.beneficiaire}
                      onChange={(e) => setMouvementForm({ ...mouvementForm, beneficiaire: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      placeholder="Nom du bénéficiaire"
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={mouvementForm.date}
                    onChange={(e) => setMouvementForm({ ...mouvementForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Référence externe</label>
                  <input
                    type="text"
                    value={mouvementForm.referenceExterne}
                    onChange={(e) => setMouvementForm({ ...mouvementForm, referenceExterne: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="N° facture, bon..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Preuve / Justificatif (URL)
                  </label>
                  <input
                    type="text"
                    value={mouvementForm.preuveUrl}
                    onChange={(e) => setMouvementForm({ ...mouvementForm, preuveUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="Lien vers reçu, capture d'écran, photo..."
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Capture du virement, reçu mobile money, photo du bordereau...
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                  <textarea
                    value={mouvementForm.notes}
                    onChange={(e) => setMouvementForm({ ...mouvementForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    rows={2}
                  />
                </div>
              </div>

              {/* Affichage du solde après opération */}
              {selectedCaisse && mouvementForm.montant > 0 && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Solde actuel: <span className="font-bold">{Number(selectedCaisse.soldeActuel).toLocaleString('fr-FR')} F</span>
                  </p>
                  <p className={`text-sm font-medium ${mouvementForm.type === 'ENTREE' ? 'text-green-600' : 'text-red-600'}`}>
                    Solde après: {(
                      mouvementForm.type === 'ENTREE'
                        ? Number(selectedCaisse.soldeActuel) + mouvementForm.montant
                        : Number(selectedCaisse.soldeActuel) - mouvementForm.montant
                    ).toLocaleString('fr-FR')} F
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowMouvementModal(false); resetMouvementForm(); }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={addMouvementMutation.isPending || (mouvementForm.type === 'SORTIE' && mouvementForm.montant > Number(selectedCaisse?.soldeActuel || 0))}
                  className={`px-4 py-2 rounded-lg font-medium disabled:opacity-50 ${
                    mouvementForm.type === 'ENTREE'
                      ? 'bg-green-600 text-white hover:bg-green-500'
                      : 'bg-red-600 text-white hover:bg-red-500'
                  }`}
                >
                  {addMouvementMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Virement Modal - CENTRALE → LOGISTIQUE uniquement */}
      {showVirementModal && caisseCentrale && caisseLogistique && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Alimenter la Caisse Logistique</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Transfert de fonds de la Caisse Centrale vers la Caisse Logistique
            </p>

            {/* Affichage temps réel des soldes */}
            <div className="grid grid-cols-3 gap-2 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Caisse Centrale</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {Number(caisseCentrale.soldeActuel).toLocaleString('fr-FR')} F
                </p>
                {virementForm.montant > 0 && (
                  <p className="text-xs text-red-500">
                    → {(Number(caisseCentrale.soldeActuel) - virementForm.montant).toLocaleString('fr-FR')} F
                  </p>
                )}
              </div>
              <div className="flex items-center justify-center">
                <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Caisse Logistique</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  {Number(caisseLogistique.soldeActuel).toLocaleString('fr-FR')} F
                </p>
                {virementForm.montant > 0 && (
                  <p className="text-xs text-green-500">
                    → {(Number(caisseLogistique.soldeActuel) + virementForm.montant).toLocaleString('fr-FR')} F
                  </p>
                )}
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              virementMutation.mutate({
                ...virementForm,
                caisseSourceId: caisseCentrale.id,
                caisseDestinationId: caisseLogistique.id,
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Montant à transférer (FCFA) *</label>
                  <input
                    type="number"
                    value={virementForm.montant}
                    onChange={(e) => setVirementForm({ ...virementForm, montant: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-lg font-semibold"
                    required
                    min="1"
                    max={Number(caisseCentrale.soldeActuel)}
                    placeholder="0"
                  />
                  {virementForm.montant > Number(caisseCentrale.soldeActuel) && (
                    <p className="text-xs text-red-500 mt-1">Solde insuffisant dans la caisse centrale</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motif *</label>
                  <input
                    type="text"
                    value={virementForm.nature}
                    onChange={(e) => setVirementForm({ ...virementForm, nature: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                    placeholder="Ex: Approvisionnement hebdomadaire"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                    <input
                      type="date"
                      value={virementForm.date}
                      onChange={(e) => setVirementForm({ ...virementForm, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preuve (URL)</label>
                    <input
                      type="text"
                      value={virementForm.preuveUrl}
                      onChange={(e) => setVirementForm({ ...virementForm, preuveUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      placeholder="Lien vers justificatif"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                  <textarea
                    value={virementForm.notes}
                    onChange={(e) => setVirementForm({ ...virementForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowVirementModal(false); resetVirementForm(); }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={virementMutation.isPending || virementForm.montant <= 0 || virementForm.montant > Number(caisseCentrale.soldeActuel)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 disabled:opacity-50 flex items-center gap-2"
                >
                  {virementMutation.isPending ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Transfert...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                      Transférer {virementForm.montant > 0 ? `${virementForm.montant.toLocaleString('fr-FR')} F` : ''}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
