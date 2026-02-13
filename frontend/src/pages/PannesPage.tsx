import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import pannesService from '../services/pannes.service';
import type { CreatePanneDto, UpdatePanneDto, Panne, StatutPanne, TypePanne, PrioritePanne, TypeReparation } from '../services/pannes.service';
import camionsService from '../services/camions.service';
import chauffeursService from '../services/chauffeurs.service';
import FileUpload from '../components/FileUpload';
import { exportToCSV, printTable } from '../utils/export';
import { useAuthStore } from '../stores/auth.store';

type PanneFilter = 'en-cours' | 'toutes' | 'reparees';

export default function PannesPage() {
  const queryClient = useQueryClient();
  const { canViewFinancialData } = useAuthStore();
  const canSeeFinancial = canViewFinancialData('pannes');
  const [activeTab, setActiveTab] = useState<'en-cours' | 'toutes'>('en-cours');
  const [activeFilter, setActiveFilter] = useState<PanneFilter>('en-cours');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTypePanne, setFilterTypePanne] = useState<TypePanne | ''>('');
  const [filterCamionId, setFilterCamionId] = useState<number | ''>('');
  const [filterStatut, setFilterStatut] = useState<StatutPanne | ''>('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [selectedPanne, setSelectedPanne] = useState<Panne | null>(null);
  const [repairFormData, setRepairFormData] = useState<{
    typeReparation: TypeReparation;
    reparateurInterne: string;
    reparateurExterne: string;
    garageExterne: string;
    telephoneGarage: string;
    coutEstime: string;
    coutReel: string;
    diagnostic: string;
    travauxEffectues: string;
    notes: string;
  }>({
    typeReparation: 'INTERNE',
    reparateurInterne: '',
    reparateurExterne: '',
    garageExterne: '',
    telephoneGarage: '',
    coutEstime: '',
    coutReel: '',
    diagnostic: '',
    travauxEffectues: '',
    notes: '',
  });
  const [formData, setFormData] = useState<CreatePanneDto>({
    camionId: 0,
    datePanne: new Date().toISOString().slice(0, 16),
    typePanne: 'MECANIQUE',
    priorite: 'NORMALE',
    description: '',
  });

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ show: false, title: '', message: '', onConfirm: () => {} });

  const { data: pannesEnCours, isLoading: loadingEnCours } = useQuery({
    queryKey: ['pannes', 'en-cours'],
    queryFn: pannesService.getEnCours,
  });

  const { data: toutesPannes, isLoading: loadingToutes } = useQuery({
    queryKey: ['pannes', 'toutes'],
    queryFn: pannesService.getAll,
  });

  const { data: stats } = useQuery({
    queryKey: ['pannes', 'stats'],
    queryFn: pannesService.getStats,
  });

  const { data: camions } = useQuery({
    queryKey: ['camions'],
    queryFn: camionsService.getAll,
  });

  const { data: chauffeurs } = useQuery({
    queryKey: ['chauffeurs'],
    queryFn: chauffeursService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: pannesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pannes'] });
      queryClient.invalidateQueries({ queryKey: ['camions'] });
      setShowCreateModal(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePanneDto }) =>
      pannesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pannes'] });
      queryClient.invalidateQueries({ queryKey: ['camions'] });
      setShowDetailModal(false);
      setSelectedPanne(null);
    },
  });

  const resetForm = () => {
    setFormData({
      camionId: 0,
      datePanne: new Date().toISOString().slice(0, 16),
      typePanne: 'MECANIQUE',
      priorite: 'NORMALE',
      description: '',
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleUpdateStatut = (panne: Panne, newStatut: StatutPanne) => {
    // Open repair modal for repair-related status changes
    if (newStatut === 'EN_REPARATION' || newStatut === 'REPAREE') {
      setSelectedPanne(panne);
      setRepairFormData({
        typeReparation: panne.typeReparation || 'INTERNE',
        reparateurInterne: panne.reparateurInterne || '',
        reparateurExterne: panne.reparateurExterne || '',
        garageExterne: panne.garageExterne || '',
        telephoneGarage: panne.telephoneGarage || '',
        coutEstime: panne.coutEstime?.toString() || '',
        coutReel: panne.coutReel?.toString() || '',
        diagnostic: panne.diagnostic || '',
        travauxEffectues: panne.travauxEffectues || '',
        notes: panne.notes || '',
      });
      setShowRepairModal(true);
    } else {
      const statutLabels: Record<string, string> = {
        DECLAREE: 'Déclarée',
        EN_DIAGNOSTIC: 'En diagnostic',
        EN_ATTENTE_PIECES: 'Attente pièces',
        EN_REPARATION: 'En réparation',
        REPAREE: 'Réparée',
        CLOTUREE: 'Clôturée',
      };
      setConfirmModal({
        show: true,
        title: 'Confirmer le changement de statut',
        message: `Voulez-vous vraiment changer le statut de la panne ${panne.numeroPanne} en "${statutLabels[newStatut] || newStatut}" ?`,
        onConfirm: () => {
          updateMutation.mutate({ id: panne.id, data: { statut: newStatut } });
          setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
        },
      });
    }
  };

  const handleSaveRepairInfo = () => {
    if (!selectedPanne) return;

    const updateData: UpdatePanneDto = {
      statut: 'REPAREE',
      typeReparation: repairFormData.typeReparation,
      diagnostic: repairFormData.diagnostic || undefined,
      travauxEffectues: repairFormData.travauxEffectues || undefined,
      notes: repairFormData.notes || undefined,
      coutEstime: repairFormData.coutEstime ? parseFloat(repairFormData.coutEstime) : undefined,
      coutReel: repairFormData.coutReel ? parseFloat(repairFormData.coutReel) : undefined,
    };

    if (repairFormData.typeReparation === 'INTERNE') {
      updateData.reparateurInterne = repairFormData.reparateurInterne || undefined;
    } else {
      updateData.reparateurExterne = repairFormData.reparateurExterne || undefined;
      updateData.garageExterne = repairFormData.garageExterne || undefined;
      updateData.telephoneGarage = repairFormData.telephoneGarage || undefined;
    }

    updateMutation.mutate({ id: selectedPanne.id, data: updateData });
    setShowRepairModal(false);
    setSelectedPanne(null);
  };

  const openDetail = (panne: Panne) => {
    setSelectedPanne(panne);
    setShowDetailModal(true);
  };

  const basePannes = activeTab === 'en-cours' ? pannesEnCours : toutesPannes;
  const filteredByStatus = activeFilter === 'reparees'
    ? basePannes?.filter(p => p.statut === 'REPAREE' || p.statut === 'CLOTUREE')
    : basePannes;

  // Apply search and filters
  const pannes = filteredByStatus?.filter(p => {
    // Text search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        p.numeroPanne.toLowerCase().includes(term) ||
        p.camion?.immatriculation?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term) ||
        p.chauffeur?.nom?.toLowerCase().includes(term) ||
        p.chauffeur?.prenom?.toLowerCase().includes(term);
      if (!matchesSearch) return false;
    }
    // Filter by type
    if (filterTypePanne && p.typePanne !== filterTypePanne) return false;
    // Filter by camion
    if (filterCamionId && p.camionId !== filterCamionId) return false;
    // Filter by statut
    if (filterStatut && p.statut !== filterStatut) return false;
    return true;
  });
  const isLoading = activeTab === 'en-cours' ? loadingEnCours : loadingToutes;

  const getPrioriteBadge = (priorite: PrioritePanne) => {
    switch (priorite) {
      case 'URGENTE': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'HAUTE': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'NORMALE': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'BASSE': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatutBadge = (statut: StatutPanne) => {
    switch (statut) {
      case 'DECLAREE': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'EN_DIAGNOSTIC': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'EN_ATTENTE_PIECES': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'EN_REPARATION': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'REPAREE': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'CLOTUREE': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatutLabel = (statut: StatutPanne) => {
    switch (statut) {
      case 'DECLAREE': return 'Déclarée';
      case 'EN_DIAGNOSTIC': return 'En diagnostic';
      case 'EN_ATTENTE_PIECES': return 'Attente pièces';
      case 'EN_REPARATION': return 'En réparation';
      case 'REPAREE': return 'Réparée';
      case 'CLOTUREE': return 'Clôturée';
    }
  };

  const getTypeLabel = (type: TypePanne) => {
    switch (type) {
      case 'MECANIQUE': return 'Mécanique';
      case 'ELECTRIQUE': return 'Électrique';
      case 'PNEUMATIQUE': return 'Pneumatique';
      case 'HYDRAULIQUE': return 'Hydraulique';
      case 'CARROSSERIE': return 'Carrosserie';
      case 'ACCIDENT': return 'Accident';
      case 'AUTRE': return 'Autre';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des Pannes</h1>
          <p className="text-gray-600 dark:text-gray-400">Déclaration et suivi des pannes véhicules</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-500 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Déclarer une panne
        </button>
      </div>

      {/* Stats - Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div
          onClick={() => { setActiveFilter('en-cours'); setActiveTab('en-cours'); }}
          className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border-l-4 border-red-500 cursor-pointer transition-all hover:shadow-md ${
            activeFilter === 'en-cours' ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-900/30' : ''
          }`}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">Pannes en cours</p>
          <p className="text-2xl font-bold text-red-600">{stats?.enCours || 0}</p>
        </div>
        <div
          onClick={() => { setActiveFilter('toutes'); setActiveTab('toutes'); }}
          className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${
            activeFilter === 'toutes' ? 'ring-2 ring-gray-500 bg-gray-50 dark:bg-gray-700' : ''
          }`}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">Total pannes</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.total || 0}</p>
        </div>
        <div
          onClick={() => { setActiveFilter('reparees'); setActiveTab('toutes'); }}
          className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${
            activeFilter === 'reparees' ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/30' : ''
          }`}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">Réparées</p>
          <p className="text-2xl font-bold text-green-600">
            {(stats?.parStatut?.REPAREE || 0) + (stats?.parStatut?.CLOTUREE || 0)}
          </p>
        </div>
        {canSeeFinancial && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600 dark:text-gray-400">Coût total réparations</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {(stats?.coutTotal || 0).toLocaleString()} FCFA
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex">
            <button
              onClick={() => { setActiveTab('en-cours'); setActiveFilter('en-cours'); }}
              className={`px-6 py-4 font-medium ${
                activeFilter === 'en-cours'
                  ? 'text-red-600 border-b-2 border-red-500'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              En cours ({pannesEnCours?.length || 0})
            </button>
            <button
              onClick={() => { setActiveTab('toutes'); setActiveFilter('toutes'); }}
              className={`px-6 py-4 font-medium ${
                activeFilter === 'toutes'
                  ? 'text-red-600 border-b-2 border-red-500'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Toutes les pannes
            </button>
            <button
              onClick={() => { setActiveTab('toutes'); setActiveFilter('reparees'); }}
              className={`px-6 py-4 font-medium ${
                activeFilter === 'reparees'
                  ? 'text-green-600 border-b-2 border-green-500'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Réparées ({(stats?.parStatut?.REPAREE || 0) + (stats?.parStatut?.CLOTUREE || 0)})
            </button>
          </nav>
        </div>

        {/* Search and Filters */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Rechercher (n° panne, immatriculation, description...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            {/* Filter by Type */}
            <select
              value={filterTypePanne}
              onChange={(e) => setFilterTypePanne(e.target.value as TypePanne | '')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Tous les types</option>
              <option value="MECANIQUE">Mécanique</option>
              <option value="ELECTRIQUE">Électrique</option>
              <option value="PNEUMATIQUE">Pneumatique</option>
              <option value="HYDRAULIQUE">Hydraulique</option>
              <option value="CARROSSERIE">Carrosserie</option>
              <option value="ACCIDENT">Accident</option>
              <option value="AUTRE">Autre</option>
            </select>
            {/* Filter by Camion */}
            <select
              value={filterCamionId}
              onChange={(e) => setFilterCamionId(e.target.value ? Number(e.target.value) : '')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Tous les camions</option>
              {camions?.map((c) => (
                <option key={c.id} value={c.id}>{c.immatriculation} - {c.marque}</option>
              ))}
            </select>
            {/* Filter by Statut */}
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value as StatutPanne | '')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Tous les statuts</option>
              <option value="DECLAREE">Déclarée</option>
              <option value="EN_DIAGNOSTIC">En diagnostic</option>
              <option value="EN_ATTENTE_PIECES">Attente pièces</option>
              <option value="EN_REPARATION">En réparation</option>
              <option value="REPAREE">Réparée</option>
              <option value="CLOTUREE">Clôturée</option>
            </select>
            {/* Clear filters */}
            {(searchTerm || filterTypePanne || filterCamionId || filterStatut) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterTypePanne('');
                  setFilterCamionId('');
                  setFilterStatut('');
                }}
                className="px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
              >
                Effacer filtres
              </button>
            )}
          </div>
        </div>

        {/* Export buttons */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            onClick={() => {
              if (!pannes || pannes.length === 0) return;
              exportToCSV(
                pannes.map(p => ({
                  numero: p.numeroPanne,
                  camion: p.camion?.immatriculation || '-',
                  chauffeur: p.chauffeur ? `${p.chauffeur.prenom} ${p.chauffeur.nom}` : '-',
                  type: p.typePanne,
                  priorite: p.priorite,
                  statut: p.statut,
                  date: new Date(p.datePanne).toLocaleDateString('fr-FR'),
                  description: p.description || '-',
                  coutEstime: p.coutEstime || 0,
                  coutReel: p.coutReel || 0,
                })),
                'pannes',
                [
                  { key: 'numero', label: 'N° Panne' },
                  { key: 'camion', label: 'Camion' },
                  { key: 'chauffeur', label: 'Chauffeur' },
                  { key: 'type', label: 'Type' },
                  { key: 'priorite', label: 'Priorité' },
                  { key: 'statut', label: 'Statut' },
                  { key: 'date', label: 'Date' },
                  { key: 'description', label: 'Description' },
                  { key: 'coutEstime', label: 'Coût Estimé (FCFA)' },
                  { key: 'coutReel', label: 'Coût Réel (FCFA)' },
                ]
              );
            }}
            disabled={!pannes || pannes.length === 0}
            className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exporter CSV
          </button>
          <button
            onClick={() => {
              if (!pannes || pannes.length === 0) return;
              printTable(
                'Liste des Pannes',
                ['N° Panne', 'Camion', 'Chauffeur', 'Type', 'Priorité', 'Statut', 'Date', 'Coût (FCFA)'],
                pannes.map(p => [
                  p.numeroPanne,
                  p.camion?.immatriculation || '-',
                  p.chauffeur ? `${p.chauffeur.prenom} ${p.chauffeur.nom}` : '-',
                  p.typePanne,
                  p.priorite,
                  p.statut,
                  new Date(p.datePanne).toLocaleDateString('fr-FR'),
                  p.coutReel ? Number(p.coutReel).toLocaleString() : (p.coutEstime ? `${Number(p.coutEstime).toLocaleString()} (est.)` : '-'),
                ])
              );
            }}
            disabled={!pannes || pannes.length === 0}
            className="px-3 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimer
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">N° Panne</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Camion</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Chauffeur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Priorité</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                  {canSeeFinancial && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Coût</th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {pannes?.map((panne) => (
                  <tr
                    key={panne.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => openDetail(panne)}
                  >
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{panne.numeroPanne}</td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{panne.camion?.immatriculation}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{panne.camion?.marque}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {panne.chauffeur ? (
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{panne.chauffeur.prenom} {panne.chauffeur.nom}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{panne.chauffeur.telephone || ''}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{getTypeLabel(panne.typePanne)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPrioriteBadge(panne.priorite)}`}>
                        {panne.priorite}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatutBadge(panne.statut)}`}>
                        {getStatutLabel(panne.statut)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                      {new Date(panne.datePanne).toLocaleDateString('fr-FR')}
                    </td>
                    {canSeeFinancial && (
                      <td className="px-6 py-4 text-right">
                        {panne.coutReel ? (
                          <span className="font-medium text-green-600">{Number(panne.coutReel).toLocaleString()} FCFA</span>
                        ) : panne.coutEstime ? (
                          <span className="text-gray-500 dark:text-gray-400">{Number(panne.coutEstime).toLocaleString()} FCFA <span className="text-xs">(est.)</span></span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openDetail(panne)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Voir détails"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {panne.statut !== 'CLOTUREE' && panne.statut !== 'REPAREE' && (
                          <select
                            value=""
                            onChange={(e) => e.target.value && handleUpdateStatut(panne, e.target.value as StatutPanne)}
                            className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded px-2 py-1"
                          >
                            <option value="">Changer statut...</option>
                            {panne.statut === 'DECLAREE' && <option value="EN_DIAGNOSTIC">En diagnostic</option>}
                            {['DECLAREE', 'EN_DIAGNOSTIC'].includes(panne.statut) && <option value="EN_ATTENTE_PIECES">Attente pièces</option>}
                            {['DECLAREE', 'EN_DIAGNOSTIC', 'EN_ATTENTE_PIECES'].includes(panne.statut) && <option value="EN_REPARATION">En réparation</option>}
                            {panne.statut === 'EN_REPARATION' && <option value="REPAREE">Réparée</option>}
                          </select>
                        )}
                        {panne.statut === 'REPAREE' && (
                          <button
                            onClick={() => handleUpdateStatut(panne, 'CLOTUREE')}
                            className="text-green-600 hover:text-green-800 text-sm"
                          >
                            Clôturer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {pannes?.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      Aucune panne {activeFilter === 'en-cours' ? 'en cours' : activeFilter === 'reparees' ? 'réparée' : 'enregistrée'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Déclarer une panne</h2>
            <form onSubmit={handleCreate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Camion *</label>
                  <select
                    value={formData.camionId}
                    onChange={(e) => setFormData({ ...formData, camionId: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  >
                    <option value="">Sélectionner un camion</option>
                    {camions?.map((c) => (
                      <option key={c.id} value={c.id}>{c.immatriculation} - {c.marque}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chauffeur déclarant</label>
                  <select
                    value={formData.chauffeurId || ''}
                    onChange={(e) => setFormData({ ...formData, chauffeurId: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Sélectionner un chauffeur</option>
                    {chauffeurs?.map((c) => (
                      <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date/heure panne *</label>
                    <input
                      type="datetime-local"
                      value={formData.datePanne}
                      onChange={(e) => setFormData({ ...formData, datePanne: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kilométrage</label>
                    <input
                      type="number"
                      value={formData.kilometragePanne || ''}
                      onChange={(e) => setFormData({ ...formData, kilometragePanne: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type de panne *</label>
                    <select
                      value={formData.typePanne}
                      onChange={(e) => setFormData({ ...formData, typePanne: e.target.value as TypePanne })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    >
                      <option value="MECANIQUE">Mécanique</option>
                      <option value="ELECTRIQUE">Électrique</option>
                      <option value="PNEUMATIQUE">Pneumatique</option>
                      <option value="HYDRAULIQUE">Hydraulique</option>
                      <option value="CARROSSERIE">Carrosserie</option>
                      <option value="ACCIDENT">Accident</option>
                      <option value="AUTRE">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priorité *</label>
                    <select
                      value={formData.priorite}
                      onChange={(e) => setFormData({ ...formData, priorite: e.target.value as PrioritePanne })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    >
                      <option value="URGENTE">Urgente</option>
                      <option value="HAUTE">Haute</option>
                      <option value="NORMALE">Normale</option>
                      <option value="BASSE">Basse</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Localisation</label>
                  <input
                    type="text"
                    value={formData.localisation || ''}
                    onChange={(e) => setFormData({ ...formData, localisation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Lieu où la panne s'est produite"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description de la panne *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    rows={3}
                    required
                    placeholder="Décrivez les symptômes, bruits, comportement du véhicule..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-500 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Enregistrement...' : 'Déclarer la panne'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedPanne && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedPanne.numeroPanne}</h2>
                <p className="text-gray-600 dark:text-gray-400">{selectedPanne.camion?.immatriculation} - {selectedPanne.camion?.marque}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatutBadge(selectedPanne.statut)}`}>
                {getStatutLabel(selectedPanne.statut)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Type</p>
                <p className="font-medium dark:text-white">{getTypeLabel(selectedPanne.typePanne)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Priorité</p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPrioriteBadge(selectedPanne.priorite)}`}>
                  {selectedPanne.priorite}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Date panne</p>
                <p className="font-medium dark:text-white">{new Date(selectedPanne.datePanne).toLocaleString('fr-FR')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Kilométrage</p>
                <p className="font-medium dark:text-white">{selectedPanne.kilometragePanne?.toLocaleString() || '-'} km</p>
              </div>
              {selectedPanne.localisation && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Localisation</p>
                  <p className="font-medium dark:text-white">{selectedPanne.localisation}</p>
                </div>
              )}
              {selectedPanne.chauffeur && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Déclaré par</p>
                  <p className="font-medium dark:text-white">{selectedPanne.chauffeur.prenom} {selectedPanne.chauffeur.nom}</p>
                </div>
              )}
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Description</p>
              <p className="bg-gray-50 dark:bg-gray-700 dark:text-gray-300 p-3 rounded-lg">{selectedPanne.description}</p>
            </div>

            {selectedPanne.diagnostic && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Diagnostic</p>
                <p className="bg-blue-50 dark:bg-blue-900/30 dark:text-blue-200 p-3 rounded-lg">{selectedPanne.diagnostic}</p>
              </div>
            )}

            {selectedPanne.travauxEffectues && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Travaux effectués</p>
                <p className="bg-green-50 dark:bg-green-900/30 dark:text-green-200 p-3 rounded-lg">{selectedPanne.travauxEffectues}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
              {canSeeFinancial && selectedPanne.coutEstime !== null && selectedPanne.coutEstime !== undefined && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Coût estimé</p>
                  <p className="font-medium dark:text-white">{Number(selectedPanne.coutEstime).toLocaleString()} FCFA</p>
                </div>
              )}
              {canSeeFinancial && selectedPanne.coutReel !== null && selectedPanne.coutReel !== undefined && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Coût réel</p>
                  <p className="font-medium text-green-600">{Number(selectedPanne.coutReel).toLocaleString()} FCFA</p>
                </div>
              )}
              {selectedPanne.dateDebutReparation && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Début réparation</p>
                  <p className="font-medium dark:text-white">{new Date(selectedPanne.dateDebutReparation).toLocaleString('fr-FR')}</p>
                </div>
              )}
              {selectedPanne.dateFinReparation && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Fin réparation</p>
                  <p className="font-medium dark:text-white">{new Date(selectedPanne.dateFinReparation).toLocaleString('fr-FR')}</p>
                </div>
              )}
            </div>

            {/* Informations réparateur */}
            {(selectedPanne.typeReparation || selectedPanne.reparateurInterne || selectedPanne.reparateurExterne) && (
              <div className={`p-4 rounded-lg mb-4 ${selectedPanne.typeReparation === 'INTERNE' ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700' : 'bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700'}`}>
                <h4 className="font-semibold mb-2 flex items-center gap-2 dark:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Réparation {selectedPanne.typeReparation === 'INTERNE' ? 'interne' : 'externe'}
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedPanne.typeReparation === 'INTERNE' && selectedPanne.reparateurInterne && (
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Technicien interne</p>
                      <p className="font-medium dark:text-white">{selectedPanne.reparateurInterne}</p>
                    </div>
                  )}
                  {selectedPanne.typeReparation === 'EXTERNE' && (
                    <>
                      {selectedPanne.garageExterne && (
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Garage / Atelier</p>
                          <p className="font-medium dark:text-white">{selectedPanne.garageExterne}</p>
                        </div>
                      )}
                      {selectedPanne.reparateurExterne && (
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Réparateur</p>
                          <p className="font-medium dark:text-white">{selectedPanne.reparateurExterne}</p>
                        </div>
                      )}
                      {selectedPanne.telephoneGarage && (
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Téléphone</p>
                          <p className="font-medium dark:text-white">{selectedPanne.telephoneGarage}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Photos et documents */}
            <div className="border-t dark:border-gray-700 pt-4 mt-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Photos et documents
              </h3>
              <FileUpload
                entiteType="panne"
                entiteId={selectedPanne.id}
                categorie="PHOTO_PANNE"
                accept="image/*,video/*,application/pdf"
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowDetailModal(false); setSelectedPanne(null); }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Repair Info Modal */}
      {showRepairModal && selectedPanne && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Informations de réparation</h2>
                <p className="text-gray-600 dark:text-gray-400">{selectedPanne.numeroPanne} - {selectedPanne.camion?.immatriculation}</p>
              </div>
              <button
                onClick={() => { setShowRepairModal(false); setSelectedPanne(null); }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Type de réparation */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type de réparation *</label>
              <div className="flex gap-4">
                <label className={`flex-1 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  repairFormData.typeReparation === 'INTERNE'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
                }`}>
                  <input
                    type="radio"
                    name="typeReparation"
                    value="INTERNE"
                    checked={repairFormData.typeReparation === 'INTERNE'}
                    onChange={(e) => setRepairFormData(prev => ({ ...prev, typeReparation: e.target.value as TypeReparation }))}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="font-medium dark:text-white">Interne</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Réparée par notre équipe</p>
                </label>

                <label className={`flex-1 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  repairFormData.typeReparation === 'EXTERNE'
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30'
                    : 'border-gray-200 dark:border-gray-600 hover:border-orange-300 dark:hover:border-orange-500'
                }`}>
                  <input
                    type="radio"
                    name="typeReparation"
                    value="EXTERNE"
                    checked={repairFormData.typeReparation === 'EXTERNE'}
                    onChange={(e) => setRepairFormData(prev => ({ ...prev, typeReparation: e.target.value as TypeReparation }))}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                    </svg>
                    <span className="font-medium dark:text-white">Externe</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Réparée par un garage externe</p>
                </label>
              </div>
            </div>

            {/* Champs selon le type */}
            {repairFormData.typeReparation === 'INTERNE' ? (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Technicien / Mécanicien *</label>
                <input
                  type="text"
                  value={repairFormData.reparateurInterne}
                  onChange={(e) => setRepairFormData(prev => ({ ...prev, reparateurInterne: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-lg px-3 py-2"
                  placeholder="Nom du technicien interne"
                  required
                />
              </div>
            ) : (
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom du garage / Atelier *</label>
                  <input
                    type="text"
                    value={repairFormData.garageExterne}
                    onChange={(e) => setRepairFormData(prev => ({ ...prev, garageExterne: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-lg px-3 py-2"
                    placeholder="Ex: Garage Central Dakar"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Réparateur / Contact</label>
                  <input
                    type="text"
                    value={repairFormData.reparateurExterne}
                    onChange={(e) => setRepairFormData(prev => ({ ...prev, reparateurExterne: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-lg px-3 py-2"
                    placeholder="Nom du mécanicien"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Téléphone du garage</label>
                  <input
                    type="tel"
                    value={repairFormData.telephoneGarage}
                    onChange={(e) => setRepairFormData(prev => ({ ...prev, telephoneGarage: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-lg px-3 py-2"
                    placeholder="Ex: +221 XX XXX XX XX"
                  />
                </div>
              </div>
            )}

            {/* Diagnostic */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Diagnostic</label>
              <textarea
                value={repairFormData.diagnostic}
                onChange={(e) => setRepairFormData(prev => ({ ...prev, diagnostic: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-lg px-3 py-2"
                rows={2}
                placeholder="Problème identifié..."
              />
            </div>

            {/* Travaux effectués */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Travaux effectués</label>
              <textarea
                value={repairFormData.travauxEffectues}
                onChange={(e) => setRepairFormData(prev => ({ ...prev, travauxEffectues: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-lg px-3 py-2"
                rows={2}
                placeholder="Détail des travaux..."
              />
            </div>

            {/* Coûts */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Coût estimé (FCFA)</label>
                <input
                  type="number"
                  value={repairFormData.coutEstime}
                  onChange={(e) => setRepairFormData(prev => ({ ...prev, coutEstime: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-lg px-3 py-2"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Coût réel (FCFA)</label>
                <input
                  type="number"
                  value={repairFormData.coutReel}
                  onChange={(e) => setRepairFormData(prev => ({ ...prev, coutReel: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-lg px-3 py-2"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes additionnelles</label>
              <textarea
                value={repairFormData.notes}
                onChange={(e) => setRepairFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-lg px-3 py-2"
                rows={2}
                placeholder="Remarques diverses..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowRepairModal(false); setSelectedPanne(null); }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveRepairInfo}
                disabled={updateMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-500 disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Enregistrement...' : 'Marquer comme réparée'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{confirmModal.title}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} })}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Annuler
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
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
