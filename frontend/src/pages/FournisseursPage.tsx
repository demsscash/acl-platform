import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import piecesService from '../services/pieces.service';
import type { Fournisseur, EntreeStock } from '../services/pieces.service';
import { exportToCSV, printTable } from '../utils/export';
import { useToast } from '../components/ui/Toast';
import { SkeletonTable, Breadcrumb } from '../components/ui';
import { useEscapeKey } from '../hooks/useKeyboardShortcuts';

const typeEntreeLabels: Record<string, string> = {
  ACHAT: 'Achat',
  RETOUR: 'Retour',
  TRANSFERT: 'Transfert',
  INVENTAIRE: 'Inventaire',
  AUTRE: 'Autre',
};

export default function FournisseursPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedFournisseur, setSelectedFournisseur] = useState<Fournisseur | null>(null);
  const [editingFournisseur, setEditingFournisseur] = useState<Fournisseur | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ show: false, title: '', message: '', onConfirm: () => {} });

  const [formData, setFormData] = useState({
    raisonSociale: '',
    adresse: '',
    telephone: '',
    email: '',
  });

  const { data: fournisseurs, isLoading } = useQuery({
    queryKey: ['fournisseurs'],
    queryFn: piecesService.getFournisseurs,
  });

  const { data: entrees } = useQuery({
    queryKey: ['pieces-entrees'],
    queryFn: piecesService.getEntrees,
  });

  const createMutation = useMutation({
    mutationFn: piecesService.createFournisseur,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fournisseurs'] });
      closeModal();
      toast.success('Fournisseur créé avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la création du fournisseur');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Fournisseur> }) =>
      piecesService.updateFournisseur(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fournisseurs'] });
      closeModal();
      toast.success('Fournisseur modifié avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la modification du fournisseur');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: piecesService.deleteFournisseur,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fournisseurs'] });
      toast.success('Fournisseur supprimé avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression du fournisseur');
    },
  });

  const openCreateModal = () => {
    setEditingFournisseur(null);
    setFormData({ raisonSociale: '', adresse: '', telephone: '', email: '' });
    setShowModal(true);
  };

  const openEditModal = (fournisseur: Fournisseur) => {
    setEditingFournisseur(fournisseur);
    setFormData({
      raisonSociale: fournisseur.raisonSociale,
      adresse: fournisseur.adresse || '',
      telephone: fournisseur.telephone || '',
      email: fournisseur.email || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingFournisseur(null);
  };

  const openDetailModal = (fournisseur: Fournisseur) => {
    setSelectedFournisseur(fournisseur);
    setShowDetailModal(true);
  };

  // Keyboard shortcuts - fermer modals avec Escape
  useEscapeKey(() => {
    if (confirmModal.show) {
      setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
    } else if (showDetailModal) {
      setShowDetailModal(false);
      setSelectedFournisseur(null);
    } else if (showModal) {
      closeModal();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingFournisseur) {
      // Show confirmation for edits
      setConfirmModal({
        show: true,
        title: 'Confirmer la modification',
        message: `Voulez-vous vraiment modifier le fournisseur ${editingFournisseur.raisonSociale} ?`,
        onConfirm: () => {
          updateMutation.mutate({ id: editingFournisseur.id, data: formData });
          setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
        },
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (fournisseur: Fournisseur) => {
    setConfirmModal({
      show: true,
      title: 'Confirmer la suppression',
      message: `Voulez-vous vraiment supprimer le fournisseur ${fournisseur.raisonSociale} ?`,
      onConfirm: () => {
        deleteMutation.mutate(fournisseur.id);
        setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
      },
    });
  };

  // Get entries for a specific supplier
  const getEntreesByFournisseur = (fournisseurId: number): EntreeStock[] => {
    return entrees?.filter(e => e.fournisseurId === fournisseurId) || [];
  };

  // Calculate total for a supplier
  const getTotalByFournisseur = (fournisseurId: number): number => {
    const fournisseurEntrees = getEntreesByFournisseur(fournisseurId);
    return fournisseurEntrees.reduce((sum, e) => {
      const entreeTotal = e.lignes?.reduce((s, l) => s + (l.quantite * (l.prixUnitaire || 0)), 0) || 0;
      return sum + entreeTotal;
    }, 0);
  };

  // Filter suppliers
  const filteredFournisseurs = fournisseurs?.filter(f =>
    f.raisonSociale.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div>
        <Breadcrumb />
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des Fournisseurs</h1>
            <p className="text-gray-600">Liste et historique des fournisseurs</p>
          </div>
        </div>
        <SkeletonTable rows={6} columns={5} />
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb />
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Fournisseurs</h1>
          <p className="text-gray-600">Liste et historique des fournisseurs</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-yellow-400 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau fournisseur
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600">Total fournisseurs</p>
          <p className="text-2xl font-bold text-gray-900">{fournisseurs?.length || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600">Entrées ce mois</p>
          <p className="text-2xl font-bold text-green-600">
            {entrees?.filter(e => {
              const date = new Date(e.dateEntree);
              const now = new Date();
              return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            }).length || 0}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600">Valeur totale entrées</p>
          <p className="text-2xl font-bold text-blue-600">
            {entrees?.reduce((sum, e) => {
              const entreeTotal = e.lignes?.reduce((s, l) => s + (l.quantite * (l.prixUnitaire || 0)), 0) || 0;
              return sum + entreeTotal;
            }, 0).toLocaleString('fr-FR')} FCFA
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Rechercher un fournisseur..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Export buttons */}
        <div className="p-4 border-b border-gray-200 flex justify-end gap-2">
          <button
            onClick={() => {
              if (!filteredFournisseurs || filteredFournisseurs.length === 0) return;
              exportToCSV(
                filteredFournisseurs.map(f => ({
                  code: f.code,
                  raisonSociale: f.raisonSociale,
                  adresse: f.adresse || '-',
                  telephone: f.telephone || '-',
                  email: f.email || '-',
                })),
                'fournisseurs',
                [
                  { key: 'code', label: 'Code' },
                  { key: 'raisonSociale', label: 'Raison Sociale' },
                  { key: 'adresse', label: 'Adresse' },
                  { key: 'telephone', label: 'Téléphone' },
                  { key: 'email', label: 'Email' },
                ]
              );
            }}
            disabled={!filteredFournisseurs || filteredFournisseurs.length === 0}
            className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exporter CSV ({filteredFournisseurs?.length || 0})
          </button>
          <button
            onClick={() => {
              if (!filteredFournisseurs || filteredFournisseurs.length === 0) return;
              printTable(
                'Liste des Fournisseurs',
                ['Code', 'Raison Sociale', 'Téléphone', 'Email'],
                filteredFournisseurs.map(f => [
                  f.code,
                  f.raisonSociale,
                  f.telephone || '-',
                  f.email || '-',
                ])
              );
            }}
            disabled={!filteredFournisseurs || filteredFournisseurs.length === 0}
            className="px-3 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimer
          </button>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Raison sociale</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entrées</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant total</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredFournisseurs?.map((fournisseur) => {
              const fournisseurEntrees = getEntreesByFournisseur(fournisseur.id);
              const totalMontant = getTotalByFournisseur(fournisseur.id);
              return (
                <tr key={fournisseur.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm text-gray-900">{fournisseur.code}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{fournisseur.raisonSociale}</div>
                    {fournisseur.adresse && (
                      <div className="text-sm text-gray-500">{fournisseur.adresse}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {fournisseur.telephone && (
                      <div className="text-gray-900">{fournisseur.telephone}</div>
                    )}
                    {fournisseur.email && (
                      <div className="text-sm text-gray-500">{fournisseur.email}</div>
                    )}
                    {!fournisseur.telephone && !fournisseur.email && (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                      {fournisseurEntrees.length} entrée(s)
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {totalMontant.toLocaleString('fr-FR')} FCFA
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => openDetailModal(fournisseur)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Historique
                    </button>
                    <button
                      onClick={() => openEditModal(fournisseur)}
                      className="text-yellow-600 hover:text-yellow-800"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(fournisseur)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              );
            })}
            {(!filteredFournisseurs || filteredFournisseurs.length === 0) && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  {searchTerm ? 'Aucun fournisseur trouvé' : 'Aucun fournisseur enregistré'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Create/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingFournisseur ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Raison sociale *</label>
                  <input
                    type="text"
                    value={formData.raisonSociale}
                    onChange={(e) => setFormData({ ...formData, raisonSociale: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Nom de l'entreprise"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Adresse</label>
                  <textarea
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    rows={2}
                    placeholder="Adresse complète"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="06 00 00 00 00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="contact@entreprise.com"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-yellow-500 text-gray-900 rounded-lg font-medium hover:bg-yellow-400 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail/Historique */}
      {showDetailModal && selectedFournisseur && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedFournisseur.raisonSociale}</h2>
                <p className="text-gray-500">{selectedFournisseur.code}</p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Info fournisseur */}
            <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Adresse</p>
                <p className="font-medium text-gray-900">{selectedFournisseur.adresse || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Téléphone</p>
                <p className="font-medium text-gray-900">{selectedFournisseur.telephone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{selectedFournisseur.email || '-'}</p>
              </div>
            </div>

            {/* Stats fournisseur */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600">Nombre d'entrées</p>
                <p className="text-2xl font-bold text-green-700">
                  {getEntreesByFournisseur(selectedFournisseur.id).length}
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600">Montant total</p>
                <p className="text-2xl font-bold text-blue-700">
                  {getTotalByFournisseur(selectedFournisseur.id).toLocaleString('fr-FR')} FCFA
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-yellow-600">Dernière entrée</p>
                <p className="text-lg font-bold text-yellow-700">
                  {(() => {
                    const fEntrees = getEntreesByFournisseur(selectedFournisseur.id);
                    if (fEntrees.length === 0) return '-';
                    const lastEntree = fEntrees.sort((a, b) =>
                      new Date(b.dateEntree).getTime() - new Date(a.dateEntree).getTime()
                    )[0];
                    return new Date(lastEntree.dateEntree).toLocaleDateString('fr-FR');
                  })()}
                </p>
              </div>
            </div>

            {/* Historique des entrées */}
            <h3 className="font-medium text-gray-900 mb-3">Historique des entrées</h3>
            <div className="bg-white border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Bon</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Facture</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pièces</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {getEntreesByFournisseur(selectedFournisseur.id)
                    .sort((a, b) => new Date(b.dateEntree).getTime() - new Date(a.dateEntree).getTime())
                    .map((entree) => {
                      const montant = entree.lignes?.reduce((s, l) => s + (l.quantite * (l.prixUnitaire || 0)), 0) || 0;
                      return (
                        <tr key={entree.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-sm text-gray-900">{entree.numeroBon}</td>
                          <td className="px-4 py-3 text-gray-900">
                            {new Date(entree.dateEntree).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                              {typeEntreeLabels[entree.typeEntree] || entree.typeEntree}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{entree.numeroFacture || '-'}</td>
                          <td className="px-4 py-3">
                            <div className="text-sm">
                              {entree.lignes?.map((l, i) => (
                                <div key={i} className="text-gray-600">
                                  {l.piece?.designation} x{l.quantite}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">
                            {montant.toLocaleString('fr-FR')} FCFA
                          </td>
                        </tr>
                      );
                    })}
                  {getEntreesByFournisseur(selectedFournisseur.id).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        Aucune entrée enregistrée pour ce fournisseur
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{confirmModal.title}</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} })}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-500"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
