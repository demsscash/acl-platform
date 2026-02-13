import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import pneumatiquesService from '../services/pneumatiques.service';
import type { StockPneumatique } from '../services/pneumatiques.service';
import camionsService from '../services/camions.service';

const statutColors: Record<string, string> = {
  NEUF: 'bg-green-100 text-green-800',
  BON: 'bg-blue-100 text-blue-800',
  USE: 'bg-yellow-100 text-yellow-800',
  A_REMPLACER: 'bg-orange-100 text-orange-800',
  REFORME: 'bg-red-100 text-red-800',
};

const positionLabels: Record<string, string> = {
  AVG: 'Avant Gauche',
  AVD: 'Avant Droit',
  ARG_EXT: 'Arrière Gauche Ext.',
  ARG_INT: 'Arrière Gauche Int.',
  ARD_EXT: 'Arrière Droit Ext.',
  ARD_INT: 'Arrière Droit Int.',
  SECOURS: 'Secours',
};

export default function PneumatiquesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'stock' | 'catalogue' | 'controles'>('stock');
  const [filterStatut, setFilterStatut] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [showCatalogueModal, setShowCatalogueModal] = useState(false);
  const [showControleModal, setShowControleModal] = useState(false);
  const [showInstallerModal, setShowInstallerModal] = useState(false);
  const [selectedPneu, setSelectedPneu] = useState<StockPneumatique | null>(null);

  const [formData, setFormData] = useState({
    catalogueId: undefined as number | undefined,
    numeroSerie: '',
    dateAchat: '',
    statut: 'NEUF' as StockPneumatique['statut'],
  });

  const [catalogueForm, setCatalogueForm] = useState({
    reference: '',
    marque: '',
    dimension: '',
    typeUsage: '',
    dureeVieKm: 0,
    profondeurInitialeMm: 0,
    prixUnitaire: 0,
  });

  const [controleForm, setControleForm] = useState({
    pneuId: undefined as number | undefined,
    dateControle: new Date().toISOString().split('T')[0],
    kilometrage: 0,
    profondeurMesureeMm: 0,
    pressionBar: 0,
    etatVisuel: '' as string,
    observations: '',
  });

  const [installerForm, setInstallerForm] = useState({
    camionId: undefined as number | undefined,
    position: '',
    kmInstallation: 0,
  });

  const { data: stock, isLoading } = useQuery({
    queryKey: ['pneumatiques-stock', filterStatut],
    queryFn: () => pneumatiquesService.getStock(undefined, filterStatut || undefined),
  });

  const { data: stats } = useQuery({
    queryKey: ['pneumatiques-stats'],
    queryFn: pneumatiquesService.getStats,
  });

  const { data: catalogue } = useQuery({
    queryKey: ['pneumatiques-catalogue'],
    queryFn: pneumatiquesService.getCatalogue,
  });

  const { data: controles } = useQuery({
    queryKey: ['pneumatiques-controles'],
    queryFn: () => pneumatiquesService.getControles(),
    enabled: activeTab === 'controles',
  });

  const { data: camions } = useQuery({
    queryKey: ['camions'],
    queryFn: camionsService.getAll,
  });

  const createPneuMutation = useMutation({
    mutationFn: pneumatiquesService.createPneu,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pneumatiques-stock'] });
      queryClient.invalidateQueries({ queryKey: ['pneumatiques-stats'] });
      setShowModal(false);
      resetForm();
    },
  });

  const createCatalogueMutation = useMutation({
    mutationFn: pneumatiquesService.createCatalogue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pneumatiques-catalogue'] });
      setShowCatalogueModal(false);
      setCatalogueForm({
        reference: '',
        marque: '',
        dimension: '',
        typeUsage: '',
        dureeVieKm: 0,
        profondeurInitialeMm: 0,
        prixUnitaire: 0,
      });
    },
  });

  const createControleMutation = useMutation({
    mutationFn: pneumatiquesService.createControle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pneumatiques-controles'] });
      queryClient.invalidateQueries({ queryKey: ['pneumatiques-stock'] });
      setShowControleModal(false);
    },
  });

  const installerMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof installerForm }) =>
      pneumatiquesService.installerPneu(id, data.camionId!, data.position, data.kmInstallation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pneumatiques-stock'] });
      queryClient.invalidateQueries({ queryKey: ['pneumatiques-stats'] });
      setShowInstallerModal(false);
      setSelectedPneu(null);
    },
  });

  const retirerMutation = useMutation({
    mutationFn: ({ id, statut }: { id: number; statut?: string }) =>
      pneumatiquesService.retirerPneu(id, statut),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pneumatiques-stock'] });
      queryClient.invalidateQueries({ queryKey: ['pneumatiques-stats'] });
    },
  });

  const resetForm = () => {
    setFormData({
      catalogueId: undefined,
      numeroSerie: '',
      dateAchat: '',
      statut: 'NEUF',
    });
  };

  const handleInstaller = (pneu: StockPneumatique) => {
    setSelectedPneu(pneu);
    setInstallerForm({
      camionId: undefined,
      position: '',
      kmInstallation: 0,
    });
    setShowInstallerModal(true);
  };

  const handleControle = (pneu: StockPneumatique) => {
    setControleForm({
      pneuId: pneu.id,
      dateControle: new Date().toISOString().split('T')[0],
      kilometrage: pneu.kmActuel || 0,
      profondeurMesureeMm: pneu.profondeurActuelleMm || 0,
      pressionBar: 0,
      etatVisuel: pneu.statut,
      observations: '',
    });
    setShowControleModal(true);
  };

  const camionsDisponibles = camions?.filter(c => c.statut === 'DISPONIBLE' || c.statut === 'EN_MISSION');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pneumatiques</h1>
          <p className="text-gray-600">Gestion du stock et suivi des pneus</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'stock' && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-yellow-400 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouveau pneu
            </button>
          )}
          {activeTab === 'catalogue' && (
            <button
              onClick={() => setShowCatalogueModal(true)}
              className="bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-yellow-400 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouveau modèle
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
          <p className="text-sm text-gray-600">En service</p>
          <p className="text-2xl font-bold text-blue-600">{stats?.enService || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
          <p className="text-sm text-gray-600">Disponibles</p>
          <p className="text-2xl font-bold text-green-600">{stats?.disponibles || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-orange-500">
          <p className="text-sm text-gray-600">A remplacer</p>
          <p className="text-2xl font-bold text-orange-600">{stats?.aRemplacer || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-red-500">
          <p className="text-sm text-gray-600">Réformés</p>
          <p className="text-2xl font-bold text-red-600">{stats?.reformes || 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('stock')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'stock'
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Stock de pneus
            </button>
            <button
              onClick={() => setActiveTab('catalogue')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'catalogue'
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Catalogue
            </button>
            <button
              onClick={() => setActiveTab('controles')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'controles'
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Contrôles
            </button>
          </nav>
        </div>
      </div>

      {/* Stock Tab */}
      {activeTab === 'stock' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterStatut('')}
                className={`px-4 py-2 rounded-lg font-medium text-sm ${
                  filterStatut === '' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tous
              </button>
              {Object.entries(statutColors).map(([key]) => (
                <button
                  key={key}
                  onClick={() => setFilterStatut(key)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm ${
                    filterStatut === key ? 'bg-yellow-500 text-gray-900' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {key.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Stock Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Série</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modèle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Camion</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Km</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profondeur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stock?.map((pneu) => (
                  <tr key={pneu.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-sm text-gray-900">{pneu.numeroSerie}</td>
                    <td className="px-6 py-4 text-gray-900">
                      {pneu.catalogue ? `${pneu.catalogue.marque} ${pneu.catalogue.dimension}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {pneu.camion ? pneu.camion.immatriculation : '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {pneu.positionActuelle ? positionLabels[pneu.positionActuelle] : '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {pneu.kmActuel ? `${pneu.kmActuel.toLocaleString()} km` : '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {pneu.profondeurActuelleMm ? `${pneu.profondeurActuelleMm} mm` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statutColors[pneu.statut]}`}>
                        {pneu.statut.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {pneu.camionId && (
                          <>
                            <button
                              onClick={() => handleControle(pneu)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Contrôle
                            </button>
                            <button
                              onClick={() => retirerMutation.mutate({ id: pneu.id })}
                              className="text-orange-600 hover:text-orange-800 text-sm"
                            >
                              Retirer
                            </button>
                          </>
                        )}
                        {!pneu.camionId && pneu.statut !== 'REFORME' && (
                          <button
                            onClick={() => handleInstaller(pneu)}
                            className="text-green-600 hover:text-green-800 text-sm"
                          >
                            Installer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {(!stock || stock.length === 0) && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      Aucun pneu en stock
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Catalogue Tab */}
      {activeTab === 'catalogue' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Référence</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marque</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dimension</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durée vie</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prof. initiale</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {catalogue?.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm text-gray-900">{item.reference}</td>
                  <td className="px-6 py-4 text-gray-900">{item.marque}</td>
                  <td className="px-6 py-4 text-gray-900">{item.dimension}</td>
                  <td className="px-6 py-4 text-gray-600">{item.typeUsage || '-'}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {item.dureeVieKm ? `${item.dureeVieKm.toLocaleString()} km` : '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {item.profondeurInitialeMm ? `${item.profondeurInitialeMm} mm` : '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-900">
                    {item.prixUnitaire ? `${Number(item.prixUnitaire).toLocaleString('fr-FR')} F` : '-'}
                  </td>
                </tr>
              ))}
              {(!catalogue || catalogue.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Aucun modèle dans le catalogue
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Contrôles Tab */}
      {activeTab === 'controles' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pneu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Camion</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Km</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profondeur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pression</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">État</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Observations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {controles?.map((ctrl) => (
                <tr key={ctrl.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900">
                    {new Date(ctrl.dateControle).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 font-mono text-sm text-gray-900">
                    {ctrl.pneu?.numeroSerie || '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {ctrl.pneu?.camion?.immatriculation || '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {ctrl.kilometrage ? `${ctrl.kilometrage.toLocaleString()} km` : '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {ctrl.profondeurMesureeMm ? `${ctrl.profondeurMesureeMm} mm` : '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {ctrl.pressionBar ? `${ctrl.pressionBar} bar` : '-'}
                  </td>
                  <td className="px-6 py-4">
                    {ctrl.etatVisuel && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statutColors[ctrl.etatVisuel] || 'bg-gray-100 text-gray-800'}`}>
                        {ctrl.etatVisuel.replace('_', ' ')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-sm">{ctrl.observations || '-'}</td>
                </tr>
              ))}
              {(!controles || controles.length === 0) && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Aucun contrôle enregistré
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Nouveau Pneu */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Nouveau pneu</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              createPneuMutation.mutate(formData);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Modèle *</label>
                  <select
                    value={formData.catalogueId || ''}
                    onChange={(e) => setFormData({ ...formData, catalogueId: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  >
                    <option value="">-- Sélectionner --</option>
                    {catalogue?.map((c) => (
                      <option key={c.id} value={c.id}>{c.marque} {c.dimension} - {c.reference}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">N° Série *</label>
                  <input
                    type="text"
                    value={formData.numeroSerie}
                    onChange={(e) => setFormData({ ...formData, numeroSerie: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date d'achat</label>
                  <input
                    type="date"
                    value={formData.dateAchat}
                    onChange={(e) => setFormData({ ...formData, dateAchat: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Statut</label>
                  <select
                    value={formData.statut}
                    onChange={(e) => setFormData({ ...formData, statut: e.target.value as StockPneumatique['statut'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="NEUF">Neuf</option>
                    <option value="BON">Bon</option>
                    <option value="USE">Usé</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createPneuMutation.isPending}
                  className="px-4 py-2 bg-yellow-500 text-gray-900 rounded-lg font-medium hover:bg-yellow-400 disabled:opacity-50"
                >
                  {createPneuMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Catalogue */}
      {showCatalogueModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Nouveau modèle</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              createCatalogueMutation.mutate(catalogueForm);
            }}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Référence *</label>
                    <input
                      type="text"
                      value={catalogueForm.reference}
                      onChange={(e) => setCatalogueForm({ ...catalogueForm, reference: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Marque *</label>
                    <input
                      type="text"
                      value={catalogueForm.marque}
                      onChange={(e) => setCatalogueForm({ ...catalogueForm, marque: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dimension *</label>
                  <input
                    type="text"
                    value={catalogueForm.dimension}
                    onChange={(e) => setCatalogueForm({ ...catalogueForm, dimension: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="ex: 315/80R22.5"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type d'usage</label>
                  <input
                    type="text"
                    value={catalogueForm.typeUsage}
                    onChange={(e) => setCatalogueForm({ ...catalogueForm, typeUsage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="ex: Route, Chantier"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Durée vie (km)</label>
                    <input
                      type="number"
                      value={catalogueForm.dureeVieKm || ''}
                      onChange={(e) => setCatalogueForm({ ...catalogueForm, dureeVieKm: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prof. initiale (mm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={catalogueForm.profondeurInitialeMm || ''}
                      onChange={(e) => setCatalogueForm({ ...catalogueForm, profondeurInitialeMm: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prix unitaire (FCFA)</label>
                  <input
                    type="number"
                    value={catalogueForm.prixUnitaire || ''}
                    onChange={(e) => setCatalogueForm({ ...catalogueForm, prixUnitaire: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCatalogueModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createCatalogueMutation.isPending}
                  className="px-4 py-2 bg-yellow-500 text-gray-900 rounded-lg font-medium hover:bg-yellow-400 disabled:opacity-50"
                >
                  {createCatalogueMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Installer */}
      {showInstallerModal && selectedPneu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Installer le pneu {selectedPneu.numeroSerie}
            </h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              installerMutation.mutate({ id: selectedPneu.id, data: installerForm });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Camion *</label>
                  <select
                    value={installerForm.camionId || ''}
                    onChange={(e) => setInstallerForm({ ...installerForm, camionId: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  >
                    <option value="">-- Sélectionner --</option>
                    {camionsDisponibles?.map((c) => (
                      <option key={c.id} value={c.id}>{c.immatriculation} - {c.typeCamion}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Position *</label>
                  <select
                    value={installerForm.position}
                    onChange={(e) => setInstallerForm({ ...installerForm, position: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  >
                    <option value="">-- Sélectionner --</option>
                    {Object.entries(positionLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kilométrage installation *</label>
                  <input
                    type="number"
                    value={installerForm.kmInstallation}
                    onChange={(e) => setInstallerForm({ ...installerForm, kmInstallation: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowInstallerModal(false); setSelectedPneu(null); }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={installerMutation.isPending}
                  className="px-4 py-2 bg-yellow-500 text-gray-900 rounded-lg font-medium hover:bg-yellow-400 disabled:opacity-50"
                >
                  {installerMutation.isPending ? 'Installation...' : 'Installer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Contrôle */}
      {showControleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Nouveau contrôle</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              createControleMutation.mutate(controleForm);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date contrôle *</label>
                  <input
                    type="date"
                    value={controleForm.dateControle}
                    onChange={(e) => setControleForm({ ...controleForm, dateControle: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kilométrage</label>
                    <input
                      type="number"
                      value={controleForm.kilometrage}
                      onChange={(e) => setControleForm({ ...controleForm, kilometrage: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Profondeur (mm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={controleForm.profondeurMesureeMm}
                      onChange={(e) => setControleForm({ ...controleForm, profondeurMesureeMm: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pression (bar)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={controleForm.pressionBar}
                      onChange={(e) => setControleForm({ ...controleForm, pressionBar: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">État visuel</label>
                    <select
                      value={controleForm.etatVisuel}
                      onChange={(e) => setControleForm({ ...controleForm, etatVisuel: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="">-- Non évalué --</option>
                      <option value="NEUF">Neuf</option>
                      <option value="BON">Bon</option>
                      <option value="USE">Usé</option>
                      <option value="A_REMPLACER">A remplacer</option>
                      <option value="REFORME">Réformé</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observations</label>
                  <textarea
                    value={controleForm.observations}
                    onChange={(e) => setControleForm({ ...controleForm, observations: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowControleModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createControleMutation.isPending}
                  className="px-4 py-2 bg-yellow-500 text-gray-900 rounded-lg font-medium hover:bg-yellow-400 disabled:opacity-50"
                >
                  {createControleMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
