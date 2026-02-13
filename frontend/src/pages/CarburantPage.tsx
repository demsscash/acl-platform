import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import carburantService from '../services/carburant.service';
import type { CreateApprovisionnementDto } from '../services/carburant.service';
import camionsService from '../services/camions.service';
import { exportToCSV, printTable } from '../utils/export';

interface Cuve {
  id: number;
  nom: string;
  typeCarburant: 'DIESEL' | 'ESSENCE';
  capaciteLitres: number;
  niveauActuelLitres: number;
  seuilAlerteBas: number;
  emplacement?: string;
  actif: boolean;
}

interface CreateDotationDto {
  camionId: number;
  chauffeurId?: number;
  typeSource: 'CUVE_INTERNE' | 'STATION_EXTERNE';
  cuveId?: number;
  stationPartenaireId?: number;
  stationNom?: string;
  quantiteLitres: number;
  prixUnitaire?: number;
  kilometrageCamion?: number;
  dateDotation?: string;
}

interface CreateCuveDto {
  nom: string;
  typeCarburant: 'DIESEL' | 'ESSENCE';
  capaciteLitres: number;
  niveauActuelLitres: number;
  seuilAlerteBas: number;
  emplacement?: string;
}

interface Dotation {
  id: number;
  numeroBon: string;
  dateDotation: string;
  typeSource: 'CUVE_INTERNE' | 'STATION_EXTERNE';
  quantiteLitres: number;
  prixUnitaire?: number;
  coutTotal?: number;
  kilometrageCamion?: number;
  stationNom?: string;
  observations?: string;
  camion?: {
    id: number;
    immatriculation: string;
    marque: string;
    modele?: string;
    numeroInterne?: string;
  };
  chauffeur?: {
    id: number;
    nom: string;
    prenom: string;
    matricule?: string;
  };
  cuve?: {
    id: number;
    nom: string;
    typeCarburant: string;
  };
}

interface Approvisionnement {
  id: number;
  numeroBon: string;
  dateApprovisionnement: string;
  quantiteLitres: number;
  prixUnitaire: number;
  coutTotal: number;
  numeroFacture?: string;
  numeroBonLivraison?: string;
  observations?: string;
  cuve?: {
    id: number;
    nom: string;
    typeCarburant: string;
  };
  fournisseur?: {
    id: number;
    raisonSociale: string;
    telephone?: string;
    email?: string;
  };
}

export default function CarburantPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'cuves' | 'dotations' | 'approvisionnements'>('cuves');
  const [showDotationModal, setShowDotationModal] = useState(false);

  // Open dotation modal if action=dotation in URL
  useEffect(() => {
    if (searchParams.get('action') === 'dotation') {
      setActiveTab('dotations');
      setShowDotationModal(true);
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const [showApproModal, setShowApproModal] = useState(false);
  const [showCuveModal, setShowCuveModal] = useState(false);

  // Detail modals
  const [selectedDotation, setSelectedDotation] = useState<Dotation | null>(null);
  const [selectedAppro, setSelectedAppro] = useState<Approvisionnement | null>(null);

  // Search states
  const [searchDotation, setSearchDotation] = useState('');
  const [searchAppro, setSearchAppro] = useState('');

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ show: false, title: '', message: '', onConfirm: () => {} });

  const [dotationForm, setDotationForm] = useState<CreateDotationDto>({
    camionId: 0,
    typeSource: 'CUVE_INTERNE',
    quantiteLitres: 0,
    dateDotation: new Date().toISOString().split('T')[0],
  });
  const [approForm, setApproForm] = useState<CreateApprovisionnementDto>({
    cuveId: 0,
    fournisseurId: 0,
    quantiteLitres: 0,
    prixUnitaire: 0,
  });
  const [cuveForm, setCuveForm] = useState<CreateCuveDto>({
    nom: '',
    typeCarburant: 'DIESEL',
    capaciteLitres: 0,
    niveauActuelLitres: 0,
    seuilAlerteBas: 2000,
  });

  const { data: cuves, isLoading: loadingCuves } = useQuery({
    queryKey: ['cuves'],
    queryFn: carburantService.getCuves,
  });

  const { data: dotations, isLoading: loadingDotations } = useQuery({
    queryKey: ['dotations'],
    queryFn: carburantService.getDotations,
  });

  const { data: camions } = useQuery({
    queryKey: ['camions'],
    queryFn: camionsService.getAll,
  });

  const { data: approvisionnements, isLoading: loadingAppros } = useQuery({
    queryKey: ['approvisionnements'],
    queryFn: carburantService.getApprovisionnements,
  });

  const { data: fournisseurs } = useQuery({
    queryKey: ['fournisseurs'],
    queryFn: carburantService.getFournisseurs,
  });

  const { data: stationsPartenaires } = useQuery({
    queryKey: ['stations-partenaires'],
    queryFn: carburantService.getStationsPartenaires,
  });

  const createDotationMutation = useMutation({
    mutationFn: carburantService.createDotation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dotations'] });
      queryClient.invalidateQueries({ queryKey: ['cuves'] });
      setShowDotationModal(false);
    },
  });

  const createApproMutation = useMutation({
    mutationFn: carburantService.createApprovisionnement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvisionnements'] });
      queryClient.invalidateQueries({ queryKey: ['cuves'] });
      setShowApproModal(false);
      setApproForm({ cuveId: 0, fournisseurId: 0, quantiteLitres: 0, prixUnitaire: 0 });
    },
  });

  const createCuveMutation = useMutation({
    mutationFn: carburantService.createCuve,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuves'] });
      setShowCuveModal(false);
      setCuveForm({ nom: '', typeCarburant: 'DIESEL', capaciteLitres: 0, niveauActuelLitres: 0, seuilAlerteBas: 2000 });
    },
  });

  const deleteCuveMutation = useMutation({
    mutationFn: carburantService.deleteCuve,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuves'] });
    },
  });

  const handleDeleteCuve = (cuve: Cuve) => {
    setConfirmModal({
      show: true,
      title: 'Confirmer la suppression',
      message: `Voulez-vous vraiment supprimer la cuve "${cuve.nom}" ?`,
      onConfirm: () => {
        deleteCuveMutation.mutate(cuve.id);
        setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
      },
    });
  };

  const handleSubmitDotation = (e: React.FormEvent) => {
    e.preventDefault();
    createDotationMutation.mutate(dotationForm);
  };

  const handleSubmitAppro = (e: React.FormEvent) => {
    e.preventDefault();
    createApproMutation.mutate(approForm);
  };

  const handleSubmitCuve = (e: React.FormEvent) => {
    e.preventDefault();
    createCuveMutation.mutate(cuveForm);
  };

  const totalStock = cuves?.reduce((sum, c) => sum + (Number(c.niveauActuelLitres) || 0), 0) || 0;
  const totalCapacite = cuves?.reduce((sum, c) => sum + (Number(c.capaciteLitres) || 0), 0) || 0;

  // Filtered dotations
  const filteredDotations = dotations?.filter(d => {
    if (!searchDotation) return true;
    const search = searchDotation.toLowerCase();
    return (
      d.numeroBon?.toLowerCase().includes(search) ||
      d.camion?.immatriculation?.toLowerCase().includes(search) ||
      d.camion?.marque?.toLowerCase().includes(search) ||
      d.chauffeur?.nom?.toLowerCase().includes(search) ||
      d.chauffeur?.prenom?.toLowerCase().includes(search) ||
      d.cuve?.nom?.toLowerCase().includes(search) ||
      d.stationNom?.toLowerCase().includes(search)
    );
  });

  // Filtered approvisionnements
  const filteredAppros = approvisionnements?.filter(a => {
    if (!searchAppro) return true;
    const search = searchAppro.toLowerCase();
    return (
      a.numeroBon?.toLowerCase().includes(search) ||
      a.cuve?.nom?.toLowerCase().includes(search) ||
      a.fournisseur?.raisonSociale?.toLowerCase().includes(search) ||
      a.numeroFacture?.toLowerCase().includes(search) ||
      a.numeroBonLivraison?.toLowerCase().includes(search)
    );
  });

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion du Carburant</h1>
          <p className="text-gray-600">Cuves, approvisionnements et dotations</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCuveModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-500 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle cuve
          </button>
          <button
            onClick={() => setShowApproModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-500 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            Approvisionner
          </button>
          <button
            onClick={() => setShowDotationModal(true)}
            className="bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-yellow-400 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle dotation
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600">Stock total</p>
          <p className="text-2xl font-bold text-gray-900">{totalStock.toLocaleString()} L</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600">Capacité totale</p>
          <p className="text-2xl font-bold text-gray-600">{totalCapacite.toLocaleString()} L</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600">Taux remplissage</p>
          <p className="text-2xl font-bold text-blue-600">
            {totalCapacite > 0 ? Math.round((totalStock / totalCapacite) * 100) : 0}%
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600">Cuves actives</p>
          <p className="text-2xl font-bold text-green-600">{cuves?.filter(c => c.actif).length || 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('cuves')}
              className={`px-6 py-4 font-medium ${
                activeTab === 'cuves'
                  ? 'text-yellow-600 border-b-2 border-yellow-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Cuves internes
            </button>
            <button
              onClick={() => setActiveTab('approvisionnements')}
              className={`px-6 py-4 font-medium ${
                activeTab === 'approvisionnements'
                  ? 'text-yellow-600 border-b-2 border-yellow-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Approvisionnements
            </button>
            <button
              onClick={() => setActiveTab('dotations')}
              className={`px-6 py-4 font-medium ${
                activeTab === 'dotations'
                  ? 'text-yellow-600 border-b-2 border-yellow-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Dotations (sorties)
            </button>
          </nav>
        </div>

        {/* Cuves Tab */}
        {activeTab === 'cuves' && (
          <div className="p-6">
            {loadingCuves ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
              </div>
            ) : cuves?.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Aucune cuve enregistrée</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cuves?.map((cuve) => (
                  <CuveCard key={cuve.id} cuve={cuve} onDelete={handleDeleteCuve} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Dotations Tab */}
        {activeTab === 'dotations' && (
          <div>
            {/* Search and Export */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center gap-4">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Rechercher par n° bon, camion, chauffeur, cuve..."
                  value={searchDotation}
                  onChange={(e) => setSearchDotation(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                />
                {searchDotation && (
                  <button
                    onClick={() => setSearchDotation('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {/* Export buttons */}
              <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!filteredDotations || filteredDotations.length === 0) return;
                  exportToCSV(
                    filteredDotations.map(d => ({
                      numeroBon: d.numeroBon,
                      date: new Date(d.dateDotation).toLocaleDateString('fr-FR'),
                      camion: d.camion?.immatriculation || '-',
                      chauffeur: d.chauffeur ? `${d.chauffeur.prenom} ${d.chauffeur.nom}` : '-',
                      source: d.typeSource === 'CUVE_INTERNE' ? 'Cuve interne' : 'Station externe',
                      cuve: d.cuve?.nom || d.stationNom || '-',
                      quantite: d.quantiteLitres,
                      prixUnitaire: d.prixUnitaire || 0,
                      coutTotal: d.coutTotal || 0,
                    })),
                    'dotations_carburant',
                    [
                      { key: 'numeroBon', label: 'N° Bon' },
                      { key: 'date', label: 'Date' },
                      { key: 'camion', label: 'Camion' },
                      { key: 'chauffeur', label: 'Chauffeur' },
                      { key: 'source', label: 'Source' },
                      { key: 'cuve', label: 'Cuve/Station' },
                      { key: 'quantite', label: 'Quantité (L)' },
                      { key: 'prixUnitaire', label: 'Prix/L (FCFA)' },
                      { key: 'coutTotal', label: 'Coût Total (FCFA)' },
                    ]
                  );
                }}
                disabled={!filteredDotations || filteredDotations.length === 0}
                className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Exporter CSV ({filteredDotations?.length || 0})
              </button>
              <button
                onClick={() => {
                  if (!filteredDotations || filteredDotations.length === 0) return;
                  printTable(
                    'Dotations Carburant',
                    ['N° Bon', 'Date', 'Camion', 'Source', 'Quantité', 'Coût'],
                    filteredDotations.map(d => [
                      d.numeroBon,
                      new Date(d.dateDotation).toLocaleDateString('fr-FR'),
                      d.camion?.immatriculation || '-',
                      d.typeSource === 'CUVE_INTERNE' ? 'Cuve interne' : 'Station externe',
                      `${d.quantiteLitres} L`,
                      d.coutTotal ? `${Number(d.coutTotal).toLocaleString()} FCFA` : '-',
                    ])
                  );
                }}
                disabled={!filteredDotations || filteredDotations.length === 0}
                className="px-3 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimer
              </button>
              </div>
            </div>
            <div className="overflow-x-auto">
            {loadingDotations ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Bon</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Camion</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chauffeur</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantité</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Coût</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDotations?.map((dotation) => (
                    <tr
                      key={dotation.id}
                      className="hover:bg-yellow-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedDotation(dotation as Dotation)}
                    >
                      <td className="px-6 py-4">
                        <span className="font-medium text-yellow-600 hover:text-yellow-800">
                          {dotation.numeroBon}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(dotation.dateDotation).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        {dotation.camion?.immatriculation || '-'}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {dotation.chauffeur ? `${dotation.chauffeur.prenom} ${dotation.chauffeur.nom}` : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          dotation.typeSource === 'CUVE_INTERNE'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {dotation.typeSource === 'CUVE_INTERNE' ? 'Cuve interne' : 'Station externe'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{dotation.quantiteLitres} L</td>
                      <td className="px-6 py-4 text-gray-600">
                        {dotation.coutTotal ? `${Number(dotation.coutTotal).toLocaleString()} FCFA` : '-'}
                      </td>
                    </tr>
                  ))}
                  {filteredDotations?.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        {searchDotation ? 'Aucun résultat pour cette recherche' : 'Aucune dotation enregistrée'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
            </div>
          </div>
        )}

        {/* Approvisionnements Tab */}
        {activeTab === 'approvisionnements' && (
          <div>
            {/* Search and Export */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center gap-4">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Rechercher par n° bon, cuve, fournisseur, facture..."
                  value={searchAppro}
                  onChange={(e) => setSearchAppro(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                />
                {searchAppro && (
                  <button
                    onClick={() => setSearchAppro('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {/* Export buttons */}
              <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!filteredAppros || filteredAppros.length === 0) return;
                  exportToCSV(
                    filteredAppros.map(a => ({
                      numeroBon: a.numeroBon,
                      date: new Date(a.dateApprovisionnement).toLocaleDateString('fr-FR'),
                      cuve: a.cuve?.nom || '-',
                      fournisseur: a.fournisseur?.raisonSociale || 'Autres',
                      quantite: Number(a.quantiteLitres) || 0,
                      prixUnitaire: Number(a.prixUnitaire) || 0,
                      coutTotal: Number(a.coutTotal) || 0,
                      numeroFacture: a.numeroFacture || '-',
                    })),
                    'approvisionnements_carburant',
                    [
                      { key: 'numeroBon', label: 'N° Bon' },
                      { key: 'date', label: 'Date' },
                      { key: 'cuve', label: 'Cuve' },
                      { key: 'fournisseur', label: 'Fournisseur' },
                      { key: 'quantite', label: 'Quantité (L)' },
                      { key: 'prixUnitaire', label: 'Prix/L (FCFA)' },
                      { key: 'coutTotal', label: 'Coût Total (FCFA)' },
                      { key: 'numeroFacture', label: 'N° Facture' },
                    ]
                  );
                }}
                disabled={!filteredAppros || filteredAppros.length === 0}
                className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Exporter CSV ({filteredAppros?.length || 0})
              </button>
              <button
                onClick={() => {
                  if (!filteredAppros || filteredAppros.length === 0) return;
                  printTable(
                    'Approvisionnements Carburant',
                    ['N° Bon', 'Date', 'Cuve', 'Fournisseur', 'Quantité', 'Prix/L', 'Coût Total'],
                    filteredAppros.map(a => [
                      a.numeroBon,
                      new Date(a.dateApprovisionnement).toLocaleDateString('fr-FR'),
                      a.cuve?.nom || '-',
                      a.fournisseur?.raisonSociale || 'Autres',
                      `${Number(a.quantiteLitres).toLocaleString()} L`,
                      `${Number(a.prixUnitaire).toLocaleString()} FCFA`,
                      `${Number(a.coutTotal).toLocaleString()} FCFA`,
                    ])
                  );
                }}
                disabled={!filteredAppros || filteredAppros.length === 0}
                className="px-3 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimer
              </button>
              </div>
            </div>
            <div className="overflow-x-auto">
            {loadingAppros ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Bon</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cuve</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fournisseur</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantité</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix/L</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Coût total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAppros?.map((appro) => (
                    <tr
                      key={appro.id}
                      className="hover:bg-green-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedAppro(appro as Approvisionnement)}
                    >
                      <td className="px-6 py-4">
                        <span className="font-medium text-green-600 hover:text-green-800">
                          {appro.numeroBon}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(appro.dateApprovisionnement).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{appro.cuve?.nom || '-'}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {appro.fournisseur?.raisonSociale || 'Autres'}
                      </td>
                      <td className="px-6 py-4 font-medium text-green-600">+{Number(appro.quantiteLitres).toLocaleString()} L</td>
                      <td className="px-6 py-4 text-gray-600">{Number(appro.prixUnitaire).toLocaleString()} FCFA</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{Number(appro.coutTotal).toLocaleString()} FCFA</td>
                    </tr>
                  ))}
                  {filteredAppros?.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        {searchAppro ? 'Aucun résultat pour cette recherche' : 'Aucun approvisionnement enregistré'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
            </div>
          </div>
        )}
      </div>

      {/* Dotation Modal */}
      {showDotationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Nouvelle dotation carburant</h2>
            <form onSubmit={handleSubmitDotation}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date de dotation *</label>
                  <input
                    type="date"
                    value={dotationForm.dateDotation || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setDotationForm({ ...dotationForm, dateDotation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Camion *</label>
                  <select
                    value={dotationForm.camionId}
                    onChange={(e) => setDotationForm({ ...dotationForm, camionId: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  >
                    <option value="">Sélectionner un camion</option>
                    {camions?.map((c) => (
                      <option key={c.id} value={c.id}>{c.immatriculation} - {c.marque}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Source *</label>
                  <select
                    value={dotationForm.typeSource}
                    onChange={(e) => setDotationForm({ ...dotationForm, typeSource: e.target.value as 'CUVE_INTERNE' | 'STATION_EXTERNE' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="CUVE_INTERNE">Cuve interne</option>
                    <option value="STATION_EXTERNE">Station externe</option>
                  </select>
                </div>
                {dotationForm.typeSource === 'CUVE_INTERNE' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cuve *</label>
                    <select
                      value={dotationForm.cuveId || ''}
                      onChange={(e) => setDotationForm({ ...dotationForm, cuveId: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    >
                      <option value="">Sélectionner une cuve</option>
                      {cuves?.filter(c => c.actif).map((c) => (
                        <option key={c.id} value={c.id}>{c.nom} ({c.niveauActuelLitres} L dispo)</option>
                      ))}
                    </select>
                  </div>
                )}
                {dotationForm.typeSource === 'STATION_EXTERNE' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Station partenaire *</label>
                    <select
                      value={dotationForm.stationPartenaireId || ''}
                      onChange={(e) => {
                        const stationId = e.target.value ? Number(e.target.value) : undefined;
                        const station = stationsPartenaires?.find(s => s.id === stationId);
                        setDotationForm({
                          ...dotationForm,
                          stationPartenaireId: stationId,
                          stationNom: station?.nom,
                          prixUnitaire: station?.tarifNegocie || dotationForm.prixUnitaire,
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    >
                      <option value="">Sélectionner une station</option>
                      {stationsPartenaires?.filter(s => s.actif).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nom} {s.ville ? `- ${s.ville}` : ''} {s.tarifNegocie ? `(${s.tarifNegocie} FCFA/L)` : ''}
                        </option>
                      ))}
                    </select>
                    {stationsPartenaires?.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">Aucune station partenaire configurée</p>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantité (L) *</label>
                    <input
                      type="number"
                      value={dotationForm.quantiteLitres}
                      onChange={(e) => setDotationForm({ ...dotationForm, quantiteLitres: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prix/L (FCFA)</label>
                    <input
                      type="number"
                      value={dotationForm.prixUnitaire || ''}
                      onChange={(e) => setDotationForm({ ...dotationForm, prixUnitaire: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kilométrage camion</label>
                  <input
                    type="number"
                    value={dotationForm.kilometrageCamion || ''}
                    onChange={(e) => setDotationForm({ ...dotationForm, kilometrageCamion: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowDotationModal(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createDotationMutation.isPending}
                  className="px-4 py-2 bg-yellow-500 text-gray-900 rounded-lg font-medium hover:bg-yellow-400 disabled:opacity-50"
                >
                  {createDotationMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approvisionnement Modal */}
      {showApproModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Nouvel approvisionnement cuve</h2>
            <form onSubmit={handleSubmitAppro}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cuve *</label>
                  <select
                    value={approForm.cuveId}
                    onChange={(e) => setApproForm({ ...approForm, cuveId: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  >
                    <option value="">Sélectionner une cuve</option>
                    {cuves?.filter(c => c.actif).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom} ({c.niveauActuelLitres} L / {c.capaciteLitres} L)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fournisseur *</label>
                  <select
                    value={approForm.fournisseurId}
                    onChange={(e) => setApproForm({ ...approForm, fournisseurId: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  >
                    <option value="">Sélectionner un fournisseur</option>
                    {fournisseurs?.map((f) => (
                      <option key={f.id} value={f.id}>{f.raisonSociale}</option>
                    ))}
                    <option value={-1}>Autres</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantité (L) *</label>
                    <input
                      type="number"
                      value={approForm.quantiteLitres || ''}
                      onChange={(e) => setApproForm({ ...approForm, quantiteLitres: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prix/L (FCFA) *</label>
                    <input
                      type="number"
                      value={approForm.prixUnitaire || ''}
                      onChange={(e) => setApproForm({ ...approForm, prixUnitaire: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                      min="1"
                    />
                  </div>
                </div>
                {approForm.quantiteLitres > 0 && approForm.prixUnitaire > 0 && (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm text-green-800">
                      Coût total: <span className="font-bold">{(approForm.quantiteLitres * approForm.prixUnitaire).toLocaleString()} FCFA</span>
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">N° Facture</label>
                  <input
                    type="text"
                    value={approForm.numeroFacture || ''}
                    onChange={(e) => setApproForm({ ...approForm, numeroFacture: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="FAC-2026-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">N° Bon de livraison</label>
                  <input
                    type="text"
                    value={approForm.numeroBonLivraison || ''}
                    onChange={(e) => setApproForm({ ...approForm, numeroBonLivraison: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="BL-2026-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observations</label>
                  <textarea
                    value={approForm.observations || ''}
                    onChange={(e) => setApproForm({ ...approForm, observations: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    rows={2}
                    placeholder="Notes ou observations..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowApproModal(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createApproMutation.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-500 disabled:opacity-50"
                >
                  {createApproMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dotation Detail Modal */}
      {selectedDotation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-yellow-500 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Dotation Carburant</h2>
                <p className="text-yellow-800 font-medium">{selectedDotation.numeroBon}</p>
              </div>
              <button
                onClick={() => setSelectedDotation(null)}
                className="text-gray-900 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Date et Source */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="text-lg font-semibold">
                    {new Date(selectedDotation.dateDotation).toLocaleDateString('fr-FR', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Source</p>
                  <p className="text-lg font-semibold">
                    {selectedDotation.typeSource === 'CUVE_INTERNE' ? (
                      <span className="text-blue-600">Cuve interne - {selectedDotation.cuve?.nom || 'N/A'}</span>
                    ) : (
                      <span className="text-purple-600">Station externe - {selectedDotation.stationNom || 'N/A'}</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Camion */}
              {selectedDotation.camion && (
                <div className="mb-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
                  <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Camion
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Immatriculation:</span>
                      <span className="ml-2 font-medium">{selectedDotation.camion.immatriculation}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">N° Interne:</span>
                      <span className="ml-2 font-medium">{selectedDotation.camion.numeroInterne || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Marque:</span>
                      <span className="ml-2 font-medium">{selectedDotation.camion.marque}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Modèle:</span>
                      <span className="ml-2 font-medium">{selectedDotation.camion.modele || '-'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Chauffeur */}
              {selectedDotation.chauffeur && (
                <div className="mb-6 p-4 border border-green-200 rounded-lg bg-green-50">
                  <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Chauffeur
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Nom complet:</span>
                      <span className="ml-2 font-medium">{selectedDotation.chauffeur.prenom} {selectedDotation.chauffeur.nom}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Matricule:</span>
                      <span className="ml-2 font-medium">{selectedDotation.chauffeur.matricule || '-'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Détails quantité et coût */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-yellow-50 p-4 rounded-lg text-center border border-yellow-200">
                  <p className="text-sm text-yellow-700">Quantité</p>
                  <p className="text-2xl font-bold text-yellow-800">{selectedDotation.quantiteLitres} L</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-500">Prix unitaire</p>
                  <p className="text-2xl font-bold text-gray-700">
                    {selectedDotation.prixUnitaire ? `${Number(selectedDotation.prixUnitaire).toLocaleString()} FCFA` : '-'}
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center border border-red-200">
                  <p className="text-sm text-red-700">Coût total</p>
                  <p className="text-2xl font-bold text-red-800">
                    {selectedDotation.coutTotal ? `${Number(selectedDotation.coutTotal).toLocaleString()} FCFA` : '-'}
                  </p>
                </div>
              </div>

              {/* Kilométrage */}
              {selectedDotation.kilometrageCamion && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Kilométrage au moment de la dotation</p>
                  <p className="text-lg font-semibold">{Number(selectedDotation.kilometrageCamion).toLocaleString()} km</p>
                </div>
              )}

              {/* Observations */}
              {selectedDotation.observations && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Observations</p>
                  <p className="text-gray-700">{selectedDotation.observations}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t px-6 py-4 bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelectedDotation(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approvisionnement Detail Modal */}
      {selectedAppro && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-green-600 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">Approvisionnement Cuve</h2>
                <p className="text-green-100 font-medium">{selectedAppro.numeroBon}</p>
              </div>
              <button
                onClick={() => setSelectedAppro(null)}
                className="text-white hover:text-green-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Date */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <p className="text-sm text-gray-500">Date de l'approvisionnement</p>
                <p className="text-lg font-semibold">
                  {new Date(selectedAppro.dateApprovisionnement).toLocaleDateString('fr-FR', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                  })}
                </p>
              </div>

              {/* Cuve */}
              {selectedAppro.cuve && (
                <div className="mb-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
                  <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Cuve approvisionnée
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Nom:</span>
                      <span className="ml-2 font-medium">{selectedAppro.cuve.nom}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                        selectedAppro.cuve.typeCarburant === 'DIESEL'
                          ? 'bg-gray-200 text-gray-800'
                          : 'bg-green-200 text-green-800'
                      }`}>
                        {selectedAppro.cuve.typeCarburant}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Fournisseur */}
              <div className="mb-6 p-4 border border-purple-200 rounded-lg bg-purple-50">
                <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Fournisseur
                </h3>
                <div className="text-sm">
                  {selectedAppro.fournisseur ? (
                    <>
                      <div className="mb-1">
                        <span className="text-gray-500">Raison sociale:</span>
                        <span className="ml-2 font-medium">{selectedAppro.fournisseur.raisonSociale}</span>
                      </div>
                      {selectedAppro.fournisseur.telephone && (
                        <div className="mb-1">
                          <span className="text-gray-500">Téléphone:</span>
                          <span className="ml-2">{selectedAppro.fournisseur.telephone}</span>
                        </div>
                      )}
                      {selectedAppro.fournisseur.email && (
                        <div>
                          <span className="text-gray-500">Email:</span>
                          <span className="ml-2">{selectedAppro.fournisseur.email}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="mb-1">
                      <span className="font-medium">Autres</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Détails financiers */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 p-4 rounded-lg text-center border border-green-200">
                  <p className="text-sm text-green-700">Quantité</p>
                  <p className="text-2xl font-bold text-green-800">+{Number(selectedAppro.quantiteLitres).toLocaleString()} L</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-500">Prix unitaire</p>
                  <p className="text-2xl font-bold text-gray-700">{Number(selectedAppro.prixUnitaire).toLocaleString()} FCFA/L</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center border border-red-200">
                  <p className="text-sm text-red-700">Coût total</p>
                  <p className="text-2xl font-bold text-red-800">{Number(selectedAppro.coutTotal).toLocaleString()} FCFA</p>
                </div>
              </div>

              {/* Documents */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">N° Facture</p>
                  <p className="text-lg font-semibold">{selectedAppro.numeroFacture || '-'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">N° Bon de livraison</p>
                  <p className="text-lg font-semibold">{selectedAppro.numeroBonLivraison || '-'}</p>
                </div>
              </div>

              {/* Observations */}
              {selectedAppro.observations && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Observations</p>
                  <p className="text-gray-700">{selectedAppro.observations}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t px-6 py-4 bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelectedAppro(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cuve Modal */}
      {showCuveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Nouvelle cuve</h2>
            <form onSubmit={handleSubmitCuve}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom de la cuve *</label>
                  <input
                    type="text"
                    value={cuveForm.nom}
                    onChange={(e) => setCuveForm({ ...cuveForm, nom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                    placeholder="Ex: Cuve principale Diesel"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type de carburant *</label>
                  <select
                    value={cuveForm.typeCarburant}
                    onChange={(e) => setCuveForm({ ...cuveForm, typeCarburant: e.target.value as 'DIESEL' | 'ESSENCE' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  >
                    <option value="DIESEL">Diesel</option>
                    <option value="ESSENCE">Essence</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Capacité (L) *</label>
                    <input
                      type="number"
                      value={cuveForm.capaciteLitres || ''}
                      onChange={(e) => setCuveForm({ ...cuveForm, capaciteLitres: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                      min="1"
                      placeholder="10000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Niveau actuel (L)</label>
                    <input
                      type="number"
                      value={cuveForm.niveauActuelLitres || ''}
                      onChange={(e) => setCuveForm({ ...cuveForm, niveauActuelLitres: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      min="0"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seuil d'alerte bas (L) *</label>
                  <input
                    type="number"
                    value={cuveForm.seuilAlerteBas || ''}
                    onChange={(e) => setCuveForm({ ...cuveForm, seuilAlerteBas: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                    min="0"
                    placeholder="2000"
                  />
                  <p className="text-xs text-gray-500 mt-1">Alerte quand le niveau passe sous ce seuil</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Emplacement</label>
                  <input
                    type="text"
                    value={cuveForm.emplacement || ''}
                    onChange={(e) => setCuveForm({ ...cuveForm, emplacement: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Ex: Dépôt principal, Zone A"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowCuveModal(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createCuveMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 disabled:opacity-50"
                >
                  {createCuveMutation.isPending ? 'Enregistrement...' : 'Créer la cuve'}
                </button>
              </div>
            </form>
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

// Cuve Card Component
function CuveCard({ cuve, onDelete }: { cuve: Cuve; onDelete: (cuve: Cuve) => void }) {
  const pourcentage = Math.round((cuve.niveauActuelLitres / cuve.capaciteLitres) * 100);
  const isLow = cuve.niveauActuelLitres <= cuve.seuilAlerteBas;

  return (
    <div className={`bg-white border rounded-lg p-4 ${isLow ? 'border-red-300' : 'border-gray-200'}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{cuve.nom}</h3>
          <p className="text-sm text-gray-500">{cuve.emplacement || 'Non spécifié'}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            cuve.typeCarburant === 'DIESEL' ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
          }`}>
            {cuve.typeCarburant}
          </span>
          <button
            onClick={() => onDelete(cuve)}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="Supprimer la cuve"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">{cuve.niveauActuelLitres.toLocaleString()} L</span>
          <span className="text-gray-400">/ {cuve.capaciteLitres.toLocaleString()} L</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full ${isLow ? 'bg-red-500' : pourcentage > 50 ? 'bg-green-500' : 'bg-yellow-500'}`}
            style={{ width: `${pourcentage}%` }}
          ></div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <span className={`text-sm font-medium ${isLow ? 'text-red-600' : 'text-gray-600'}`}>
          {pourcentage}%
        </span>
        {isLow && (
          <span className="text-xs text-red-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Niveau bas
          </span>
        )}
      </div>
    </div>
  );
}
