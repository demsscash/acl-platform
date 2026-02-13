import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import camionsService from '../services/camions.service';
import type { Camion, TypeCamion, StatutCamion } from '../types';
import FileUpload from '../components/FileUpload';
import { exportToCSV, printTable } from '../utils/export';
import { useToast } from '../components/ui/Toast';
import { SkeletonTable, EmptyState, Breadcrumb, Pagination } from '../components/ui';
import { useEscapeKey } from '../hooks/useKeyboardShortcuts';

interface CreateCamionDto {
  immatriculation: string;
  marque: string;
  modele?: string;
  typeCamion: string;
  typeCarburant?: string;
  capaciteReservoirLitres?: number;
  kilometrageActuel?: number;
  numeroInterne?: string;
  numeroCarteGrise?: string;
  dateExpirationAssurance?: string;
  dateExpirationVisiteTechnique?: string;
  dateExpirationLicence?: string;
  dateMiseEnCirculation?: string;
  notes?: string;
  statut?: 'DISPONIBLE' | 'EN_MISSION' | 'EN_MAINTENANCE' | 'HORS_SERVICE';
}

const typesCamion: TypeCamion[] = ['PLATEAU', 'GRUE', 'BENNE', 'PORTE_CONTENEUR', 'CITERNE', 'FRIGORIFIQUE', 'TRACTEUR', 'PORTE_CHAR', 'VRAC', 'AUTRE'];

const statutColors: Record<StatutCamion, string> = {
  DISPONIBLE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  EN_MISSION: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  EN_MAINTENANCE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  HORS_SERVICE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const statutLabels: Record<StatutCamion, string> = {
  DISPONIBLE: 'Disponible',
  EN_MISSION: 'En mission',
  EN_MAINTENANCE: 'En maintenance',
  HORS_SERVICE: 'Hors service',
};

type SortField = 'immatriculation' | 'typeCamion' | 'marque' | 'kilometrageActuel' | 'statut';
type SortOrder = 'asc' | 'desc';

// Interfaces for detail modals
interface TransportDetail {
  id: number;
  numero: string;
  createdAt: string;
  statut: string;
  lieuDepart?: string;
  lieuArrivee?: string;
  distance?: number;
  marchandise?: string;
  poids?: number;
  montantHt?: number;
  observations?: string;
  client?: { id: number; raisonSociale: string };
  chauffeur?: { id: number; nom: string; prenom: string };
}

interface LocationDetail {
  id: number;
  numero: string;
  createdAt: string;
  statut: string;
  dateDebut?: string;
  dateFinPrevue?: string;
  dateFinEffective?: string;
  lieuMiseDisposition?: string;
  tarifJournalier?: number;
  montantTotal?: number;
  observations?: string;
  client?: { id: number; raisonSociale: string };
  chauffeur?: { id: number; nom: string; prenom: string };
}

interface DotationDetail {
  id: number;
  numeroBon: string;
  dateDotation: string;
  typeSource: string;
  quantiteLitres: number;
  prixUnitaire?: number;
  coutTotal?: number;
  kilometrageCamion?: number;
  stationNom?: string;
  observations?: string;
  chauffeur?: { id: number; nom: string; prenom: string };
  cuve?: { id: number; nom: string; typeCarburant: string };
}

interface PanneDetail {
  id: number;
  numeroPanne: string;
  datePanne: string;
  typePanne: string;
  priorite: string;
  statut: string;
  description?: string;
  diagnostic?: string;
  travauxEffectues?: string;
  coutEstime?: number;
  coutReel?: number;
  typeReparation?: string;
  garageExterne?: string;
  reparateurInterne?: string;
  chauffeur?: { id: number; nom: string; prenom: string };
}

export default function CamionsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');

  const [showModal, setShowModal] = useState(false);
  const [showHistorique, setShowHistorique] = useState(false);
  const [selectedCamion, setSelectedCamion] = useState<Camion | null>(null);
  const [editingCamion, setEditingCamion] = useState<Camion | null>(null);

  // Detail modals for bons
  const [selectedTransport, setSelectedTransport] = useState<TransportDetail | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationDetail | null>(null);
  const [selectedDotation, setSelectedDotation] = useState<DotationDetail | null>(null);
  const [selectedPanne, setSelectedPanne] = useState<PanneDetail | null>(null);

  // Search, Sort and Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('immatriculation');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ show: false, title: '', message: '', onConfirm: () => {} });

  const [formData, setFormData] = useState<CreateCamionDto>({
    immatriculation: '',
    marque: '',
    modele: '',
    typeCamion: 'PLATEAU',
    typeCarburant: 'DIESEL',
    capaciteReservoirLitres: 300,
    kilometrageActuel: 0,
    numeroInterne: '',
    numeroCarteGrise: '',
    dateExpirationAssurance: '',
    dateExpirationVisiteTechnique: '',
    dateExpirationLicence: '',
    dateMiseEnCirculation: '',
    notes: '',
  });

  // Fetch camions
  const { data: camions, isLoading, error } = useQuery({
    queryKey: ['camions'],
    queryFn: camionsService.getAll,
  });

  // Fetch historique when a camion is selected
  const { data: historique, isLoading: loadingHistorique } = useQuery({
    queryKey: ['camion-historique', selectedCamion?.id],
    queryFn: () => camionsService.getHistorique(selectedCamion!.id),
    enabled: !!selectedCamion && showHistorique,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: camionsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camions'] });
      toast.success('Camion ajouté avec succès');
      closeModal();
    },
    onError: () => {
      toast.error('Erreur lors de l\'ajout du camion');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateCamionDto> }) =>
      camionsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camions'] });
      toast.success('Camion modifié avec succès');
      closeModal();
    },
    onError: () => {
      toast.error('Erreur lors de la modification du camion');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: camionsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camions'] });
      toast.success('Camion supprimé avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression du camion');
    },
  });

  // Keyboard shortcuts - Escape to close modals
  useEscapeKey(() => {
    if (confirmModal.show) {
      setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
    } else if (showModal) {
      closeModal();
    } else if (showHistorique) {
      setShowHistorique(false);
    }
  }, showModal || showHistorique || confirmModal.show);

  // Handle highlight from alertes page
  useEffect(() => {
    if (highlightId && camions) {
      const camionToHighlight = camions.find(c => c.id === Number(highlightId));
      if (camionToHighlight) {
        setSelectedCamion(camionToHighlight);
        setShowHistorique(true);
        // Clear the highlight param after showing
        setSearchParams({});
        // Scroll to the row
        setTimeout(() => {
          const row = document.getElementById(`camion-row-${highlightId}`);
          if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            row.classList.add('ring-2', 'ring-yellow-500', 'ring-offset-2');
            setTimeout(() => {
              row.classList.remove('ring-2', 'ring-yellow-500', 'ring-offset-2');
            }, 3000);
          }
        }, 100);
      }
    }
  }, [highlightId, camions, setSearchParams]);

  const formatDateForInput = (date: string | Date | null | undefined): string => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  const openCreateModal = () => {
    setEditingCamion(null);
    setFormData({
      immatriculation: '',
      marque: '',
      modele: '',
      typeCamion: 'PLATEAU',
      typeCarburant: 'DIESEL',
      capaciteReservoirLitres: 300,
      kilometrageActuel: 0,
      numeroInterne: '',
      numeroCarteGrise: '',
      dateExpirationAssurance: '',
      dateExpirationVisiteTechnique: '',
      dateExpirationLicence: '',
      dateMiseEnCirculation: '',
      notes: '',
    });
    setShowModal(true);
  };

  const openEditModal = (camion: Camion) => {
    setEditingCamion(camion);
    setFormData({
      immatriculation: camion.immatriculation,
      marque: camion.marque,
      modele: camion.modele || '',
      typeCamion: camion.typeCamion,
      typeCarburant: camion.typeCarburant,
      capaciteReservoirLitres: camion.capaciteReservoirLitres || 300,
      kilometrageActuel: camion.kilometrageActuel || 0,
      numeroInterne: camion.numeroInterne || '',
      numeroCarteGrise: (camion as any).numeroCarteGrise || '',
      dateExpirationAssurance: formatDateForInput((camion as any).dateExpirationAssurance),
      dateExpirationVisiteTechnique: formatDateForInput((camion as any).dateExpirationVisiteTechnique),
      dateExpirationLicence: formatDateForInput((camion as any).dateExpirationLicence),
      dateMiseEnCirculation: formatDateForInput((camion as any).dateMiseEnCirculation),
      notes: (camion as any).notes || '',
      statut: camion.statut,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCamion(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCamion) {
      // Show confirmation for edits
      setConfirmModal({
        show: true,
        title: 'Confirmer la modification',
        message: `Voulez-vous vraiment modifier le camion ${editingCamion.immatriculation} ?`,
        onConfirm: () => {
          updateMutation.mutate({ id: editingCamion.id, data: formData });
          setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
        },
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (camion: Camion) => {
    setConfirmModal({
      show: true,
      title: 'Confirmer la suppression',
      message: `Voulez-vous vraiment supprimer le camion ${camion.immatriculation} ?`,
      onConfirm: () => {
        deleteMutation.mutate(camion.id);
        setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
      },
    });
  };

  const openHistorique = (camion: Camion) => {
    setSelectedCamion(camion);
    setShowHistorique(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount);
  };

  // Filter and sort camions
  const filteredAndSortedCamions = camions
    ?.filter(camion => {
      // Filter by status first
      if (statusFilter && camion.statut !== statusFilter) return false;

      // Then filter by search query
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        camion.immatriculation?.toLowerCase().includes(query) ||
        camion.numeroInterne?.toLowerCase().includes(query) ||
        camion.marque?.toLowerCase().includes(query) ||
        camion.modele?.toLowerCase().includes(query) ||
        camion.typeCamion?.toLowerCase().includes(query) ||
        statutLabels[camion.statut]?.toLowerCase().includes(query)
      );
    })
    ?.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortField) {
        case 'immatriculation':
          aVal = a.immatriculation || '';
          bVal = b.immatriculation || '';
          break;
        case 'typeCamion':
          aVal = a.typeCamion || '';
          bVal = b.typeCamion || '';
          break;
        case 'marque':
          aVal = a.marque || '';
          bVal = b.marque || '';
          break;
        case 'kilometrageActuel':
          aVal = a.kilometrageActuel || 0;
          bVal = b.kilometrageActuel || 0;
          break;
        case 'statut':
          aVal = a.statut || '';
          bVal = b.statut || '';
          break;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    }) || [];

  // Paginate results
  const totalItems = filteredAndSortedCamions.length;
  const paginatedCamions = filteredAndSortedCamions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <span className="ml-1 inline-block">
      {sortField === field ? (
        sortOrder === 'asc' ? '↑' : '↓'
      ) : (
        <span className="text-gray-300">↕</span>
      )}
    </span>
  );

  if (isLoading) {
    return (
      <div>
        <Breadcrumb />
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des Camions</h1>
            <p className="text-gray-600 dark:text-gray-400">Gérez votre flotte de véhicules</p>
          </div>
        </div>
        <SkeletonTable rows={8} columns={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg">
        Erreur lors du chargement des camions
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Camions</h1>
          <p className="text-gray-600">Gérez votre flotte de véhicules</p>
        </div>
        <button onClick={openCreateModal} className="bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-yellow-400 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau camion
        </button>
      </div>

      {/* Stats */}
      {/* Stats - Clickable filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div
          onClick={() => setStatusFilter(null)}
          className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${
            statusFilter === null ? 'ring-2 ring-gray-400 bg-gray-50 dark:bg-gray-700' : ''
          }`}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{camions?.length || 0}</p>
        </div>
        <div
          onClick={() => setStatusFilter(statusFilter === 'DISPONIBLE' ? null : 'DISPONIBLE')}
          className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${
            statusFilter === 'DISPONIBLE' ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/30' : ''
          }`}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">Disponibles</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {camions?.filter(c => c.statut === 'DISPONIBLE').length || 0}
          </p>
        </div>
        <div
          onClick={() => setStatusFilter(statusFilter === 'EN_MISSION' ? null : 'EN_MISSION')}
          className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${
            statusFilter === 'EN_MISSION' ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30' : ''
          }`}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">En mission</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {camions?.filter(c => c.statut === 'EN_MISSION').length || 0}
          </p>
        </div>
        <div
          onClick={() => setStatusFilter(statusFilter === 'EN_MAINTENANCE' ? null : 'EN_MAINTENANCE')}
          className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${
            statusFilter === 'EN_MAINTENANCE' ? 'ring-2 ring-yellow-500 bg-yellow-50 dark:bg-yellow-900/30' : ''
          }`}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">En maintenance</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {camions?.filter(c => c.statut === 'EN_MAINTENANCE').length || 0}
          </p>
        </div>
        <div
          onClick={() => setStatusFilter(statusFilter === 'HORS_SERVICE' ? null : 'HORS_SERVICE')}
          className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${
            statusFilter === 'HORS_SERVICE' ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-900/30' : ''
          }`}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">Hors service</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {camions?.filter(c => c.statut === 'HORS_SERVICE').length || 0}
          </p>
        </div>
      </div>

      {/* Active filter indicator */}
      {statusFilter && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Filtre actif:</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statutColors[statusFilter as keyof typeof statutColors]}`}>
            {statutLabels[statusFilter as keyof typeof statutLabels]}
          </span>
          <button
            onClick={() => setStatusFilter(null)}
            className="text-gray-400 hover:text-gray-600 ml-2"
            title="Effacer le filtre"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        {/* Search and Export */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Rechercher (immatriculation, marque, type...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>
          {/* Export buttons */}
          <div className="flex gap-2">
          <button
            onClick={() => {
              if (!filteredAndSortedCamions || filteredAndSortedCamions.length === 0) return;
              exportToCSV(
                filteredAndSortedCamions.map(c => ({
                  immatriculation: c.immatriculation,
                  numeroInterne: c.numeroInterne || '-',
                  marque: c.marque,
                  modele: c.modele || '-',
                  typeCamion: c.typeCamion,
                  typeCarburant: c.typeCarburant || '-',
                  kilometrage: c.kilometrage || 0,
                  capaciteReservoir: c.capaciteReservoirLitres || 0,
                  statut: statutLabels[c.statut] || c.statut,
                })),
                'camions',
                [
                  { key: 'immatriculation', label: 'Immatriculation' },
                  { key: 'numeroInterne', label: 'N° Interne' },
                  { key: 'marque', label: 'Marque' },
                  { key: 'modele', label: 'Modèle' },
                  { key: 'typeCamion', label: 'Type' },
                  { key: 'typeCarburant', label: 'Carburant' },
                  { key: 'kilometrage', label: 'Kilométrage' },
                  { key: 'capaciteReservoir', label: 'Réservoir (L)' },
                  { key: 'statut', label: 'Statut' },
                ]
              );
            }}
            disabled={!filteredAndSortedCamions || filteredAndSortedCamions.length === 0}
            className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exporter CSV ({filteredAndSortedCamions?.length || 0})
          </button>
          <button
            onClick={() => {
              if (!filteredAndSortedCamions || filteredAndSortedCamions.length === 0) return;
              printTable(
                'Liste des Camions',
                ['Immatriculation', 'Type', 'Marque/Modèle', 'Kilométrage', 'Statut'],
                filteredAndSortedCamions.map(c => [
                  c.immatriculation,
                  c.typeCamion,
                  `${c.marque} ${c.modele || ''}`,
                  c.kilometrage ? `${c.kilometrage.toLocaleString()} km` : '-',
                  statutLabels[c.statut] || c.statut,
                ])
              );
            }}
            disabled={!filteredAndSortedCamions || filteredAndSortedCamions.length === 0}
            className="px-3 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimer
          </button>
          </div>
        </div>
        {/* Results count */}
        {searchQuery && (
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 text-sm text-gray-600 dark:text-gray-300">
            {filteredAndSortedCamions.length} résultat(s) trouvé(s)
          </div>
        )}
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th
                onClick={() => handleSort('immatriculation')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Immatriculation <SortIcon field="immatriculation" />
              </th>
              <th
                onClick={() => handleSort('typeCamion')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Type <SortIcon field="typeCamion" />
              </th>
              <th
                onClick={() => handleSort('marque')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Marque / Modèle <SortIcon field="marque" />
              </th>
              <th
                onClick={() => handleSort('kilometrageActuel')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Kilométrage <SortIcon field="kilometrageActuel" />
              </th>
              <th
                onClick={() => handleSort('statut')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Statut <SortIcon field="statut" />
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Voyages</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedCamions.map((camion) => (
              <tr key={camion.id} id={`camion-row-${camion.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{camion.immatriculation}</div>
                  {camion.numeroInterne && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">N° {camion.numeroInterne}</div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm">
                    {camion.typeCamion}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-gray-900 dark:text-gray-100">{camion.marque}</div>
                  {camion.modele && <div className="text-sm text-gray-500 dark:text-gray-400">{camion.modele}</div>}
                </td>
                <td className="px-6 py-4 text-gray-900 dark:text-gray-100">
                  {camion.kilometrageActuel?.toLocaleString()} km
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statutColors[camion.statut]}`}>
                    {statutLabels[camion.statut]}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center justify-center px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {camion.nombreVoyages || 0}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => openHistorique(camion)}
                    className="text-green-600 hover:text-green-800 mr-3"
                  >
                    Fiche
                  </button>
                  <button
                    onClick={() => openEditModal(camion)}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(camion)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
            {filteredAndSortedCamions.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon={searchQuery ? 'search' : 'truck'}
                    title={searchQuery ? 'Aucun résultat' : 'Aucun camion enregistré'}
                    description={
                      searchQuery
                        ? `Aucun camion trouvé pour "${searchQuery}"`
                        : 'Commencez par ajouter votre premier camion à la flotte.'
                    }
                    actionLabel={!searchQuery ? 'Ajouter un camion' : undefined}
                    onAction={!searchQuery ? openCreateModal : undefined}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {filteredAndSortedCamions.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingCamion ? 'Modifier le camion' : 'Nouveau camion'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Immatriculation *
                  </label>
                  <input
                    type="text"
                    value={formData.immatriculation}
                    onChange={(e) => setFormData({ ...formData, immatriculation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="DK-1234-AB"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Marque *
                    </label>
                    <input
                      type="text"
                      value={formData.marque}
                      onChange={(e) => setFormData({ ...formData, marque: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      placeholder="Mercedes"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Modèle
                    </label>
                    <input
                      type="text"
                      value={formData.modele}
                      onChange={(e) => setFormData({ ...formData, modele: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      placeholder="Actros"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type de camion *
                  </label>
                  <select
                    value={formData.typeCamion}
                    onChange={(e) => setFormData({ ...formData, typeCamion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    {typesCamion.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Carburant
                    </label>
                    <select
                      value={formData.typeCarburant}
                      onChange={(e) => setFormData({ ...formData, typeCarburant: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                      <option value="DIESEL">Diesel</option>
                      <option value="ESSENCE">Essence</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Réservoir (L)
                    </label>
                    <input
                      type="number"
                      value={formData.capaciteReservoirLitres}
                      onChange={(e) => setFormData({ ...formData, capaciteReservoirLitres: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kilométrage actuel
                    </label>
                    <input
                      type="number"
                      value={formData.kilometrageActuel || 0}
                      onChange={(e) => setFormData({ ...formData, kilometrageActuel: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Numéro interne
                    </label>
                    <input
                      type="text"
                      value={formData.numeroInterne}
                      onChange={(e) => setFormData({ ...formData, numeroInterne: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      placeholder="CAM-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      N° Carte grise
                    </label>
                    <input
                      type="text"
                      value={formData.numeroCarteGrise}
                      onChange={(e) => setFormData({ ...formData, numeroCarteGrise: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      placeholder="CG-12345"
                    />
                  </div>
                </div>

                {/* Documents réglementaires */}
                <div className="border-t pt-4 mt-2">
                  <p className="text-sm font-medium text-gray-700 mb-3">Dates d'expiration des documents</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Assurance
                      </label>
                      <input
                        type="date"
                        value={formData.dateExpirationAssurance}
                        onChange={(e) => setFormData({ ...formData, dateExpirationAssurance: e.target.value })}
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Visite technique
                      </label>
                      <input
                        type="date"
                        value={formData.dateExpirationVisiteTechnique}
                        onChange={(e) => setFormData({ ...formData, dateExpirationVisiteTechnique: e.target.value })}
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Licence
                      </label>
                      <input
                        type="date"
                        value={formData.dateExpirationLicence}
                        onChange={(e) => setFormData({ ...formData, dateExpirationLicence: e.target.value })}
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Date mise en circulation
                      </label>
                      <input
                        type="date"
                        value={formData.dateMiseEnCirculation}
                        onChange={(e) => setFormData({ ...formData, dateMiseEnCirculation: e.target.value })}
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    rows={3}
                    placeholder="Notes ou observations..."
                  />
                </div>

                {/* Statut - only shown when editing */}
                {editingCamion && (
                  <div className="border-t pt-4 mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Statut du véhicule</label>
                    <select
                      value={formData.statut || 'DISPONIBLE'}
                      onChange={(e) => setFormData({ ...formData, statut: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                      <option value="DISPONIBLE">Disponible (en service)</option>
                      <option value="EN_MAINTENANCE">En maintenance</option>
                      <option value="HORS_SERVICE">Hors service</option>
                      {formData.statut === 'EN_MISSION' && (
                        <option value="EN_MISSION">En mission (automatique)</option>
                      )}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.statut === 'EN_MISSION'
                        ? "Ce camion est actuellement en mission. Le statut changera automatiquement à la fin de la mission."
                        : formData.statut === 'EN_MAINTENANCE'
                        ? "Le camion est en maintenance et ne peut pas être assigné à des missions."
                        : formData.statut === 'HORS_SERVICE'
                        ? "Le camion est hors service (panne majeure, accident, etc.)."
                        : "Le camion est disponible pour des missions."
                      }
                    </p>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
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

      {/* Fiche d'information Modal */}
      {showHistorique && selectedCamion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-4">
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-yellow-500 to-yellow-400">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
                  <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedCamion.immatriculation}
                  </h2>
                  <p className="text-sm text-gray-700">{selectedCamion.marque} {selectedCamion.modele} • {selectedCamion.typeCamion}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${statutColors[selectedCamion.statut]}`}>
                    {statutLabels[selectedCamion.statut]}
                  </span>
                </div>
              </div>
              <button onClick={() => setShowHistorique(false)} className="text-gray-800 hover:text-gray-900">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {loadingHistorique ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
              </div>
            ) : historique && (
              <div className="flex-1 overflow-y-auto p-6">
                {/* Informations véhicule */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Informations véhicule</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500">N° Interne</p>
                      <p className="font-medium">{selectedCamion.numeroInterne || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Kilométrage</p>
                      <p className="font-medium">{selectedCamion.kilometrageActuel?.toLocaleString() || 0} km</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Carburant</p>
                      <p className="font-medium">{selectedCamion.typeCarburant || 'DIESEL'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Réservoir</p>
                      <p className="font-medium">{selectedCamion.capaciteReservoirLitres || '-'} L</p>
                    </div>
                  </div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mt-4 mb-2">Documents réglementaires</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Carte grise</p>
                      <p className="font-medium">{selectedCamion.numeroCarteGrise || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Assurance</p>
                      <p className={`font-medium ${selectedCamion.dateExpirationAssurance && new Date(selectedCamion.dateExpirationAssurance) < new Date() ? 'text-red-600' : ''}`}>
                        {selectedCamion.dateExpirationAssurance
                          ? new Date(selectedCamion.dateExpirationAssurance).toLocaleDateString('fr-FR')
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Visite technique</p>
                      <p className={`font-medium ${selectedCamion.dateExpirationVisiteTechnique && new Date(selectedCamion.dateExpirationVisiteTechnique) < new Date() ? 'text-red-600' : ''}`}>
                        {selectedCamion.dateExpirationVisiteTechnique
                          ? new Date(selectedCamion.dateExpirationVisiteTechnique).toLocaleDateString('fr-FR')
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Licence</p>
                      <p className={`font-medium ${selectedCamion.dateExpirationLicence && new Date(selectedCamion.dateExpirationLicence) < new Date() ? 'text-red-600' : ''}`}>
                        {selectedCamion.dateExpirationLicence
                          ? new Date(selectedCamion.dateExpirationLicence).toLocaleDateString('fr-FR')
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Date mise en circulation</p>
                      <p className="font-medium">
                        {selectedCamion.dateMiseEnCirculation
                          ? new Date(selectedCamion.dateMiseEnCirculation).toLocaleDateString('fr-FR')
                          : '-'}
                      </p>
                    </div>
                  </div>
                  {/* Notes */}
                  {selectedCamion.notes && (
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Notes</h4>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">{selectedCamion.notes}</p>
                    </div>
                  )}
                </div>

                {/* Stats Row 1 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-600">Missions</p>
                    <p className="text-2xl font-bold text-blue-700">{historique.stats.totalMissions}</p>
                    <p className="text-xs text-blue-500">{historique.stats.missionsTerminees} terminées</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-600">Revenus confirmés</p>
                    <p className="text-2xl font-bold text-green-700">{formatCurrency(historique.stats.totalRevenus)}</p>
                    {historique.stats.totalRevenusEnCours > 0 && (
                      <p className="text-xs text-orange-600">+ {formatCurrency(historique.stats.totalRevenusEnCours)} en cours</p>
                    )}
                    {!historique.stats.totalRevenusEnCours && (
                      <p className="text-xs text-green-500">Transport + Location</p>
                    )}
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-orange-600">Carburant</p>
                    <p className="text-2xl font-bold text-orange-700">{historique.stats.totalCarburantLitres?.toLocaleString() || 0} L</p>
                    <p className="text-xs text-orange-500">Coût: {formatCurrency(historique.stats.coutCarburant || 0)}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-purple-600">Sorties Pièces</p>
                    <p className="text-2xl font-bold text-purple-700">{historique.stats.nombreSortiesPieces}</p>
                  </div>
                </div>
                {/* Stats Row 2 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-red-600">Pannes</p>
                    <p className="text-2xl font-bold text-red-700">{historique.stats.totalPannes || 0}</p>
                    <p className="text-xs text-red-500">{historique.stats.pannesActives || 0} actives</p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-sm text-yellow-600">Coût pannes</p>
                    <p className="text-2xl font-bold text-yellow-700">{formatCurrency(historique.stats.coutPannes || 0)}</p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <p className="text-sm text-indigo-600">Revenus location</p>
                    <p className="text-2xl font-bold text-indigo-700">{formatCurrency(historique.stats.revenusLocation || 0)}</p>
                    {historique.stats.revenusLocationEnCours > 0 && (
                      <p className="text-xs text-orange-600">+ {formatCurrency(historique.stats.revenusLocationEnCours)} en cours</p>
                    )}
                  </div>
                  <div className="bg-cyan-50 p-4 rounded-lg">
                    <p className="text-sm text-cyan-600">Dotations</p>
                    <p className="text-2xl font-bold text-cyan-700">{historique.dotations?.length || 0}</p>
                  </div>
                </div>

                {/* Transports */}
                {historique.transports.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                      Bons de Transport ({historique.transports.length})
                    </h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">N°</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Client</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Chauffeur</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Statut</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Montant</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {historique.transports.map((t: any) => (
                            <tr
                              key={t.id}
                              className="hover:bg-blue-50 cursor-pointer transition-colors"
                              onClick={() => setSelectedTransport(t)}
                            >
                              <td className="px-4 py-2 text-sm">{new Date(t.createdAt).toLocaleDateString('fr-FR')}</td>
                              <td className="px-4 py-2 text-sm font-medium">
                                <span className="text-blue-600 hover:text-blue-800">
                                  {t.numero}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-sm">{t.client?.raisonSociale || '-'}</td>
                              <td className="px-4 py-2 text-sm">{t.chauffeur ? `${t.chauffeur.prenom} ${t.chauffeur.nom}` : '-'}</td>
                              <td className="px-4 py-2"><span className="px-2 py-1 bg-gray-100 text-xs rounded">{t.statut}</span></td>
                              <td className="px-4 py-2 text-sm text-right">{formatCurrency(t.montantHt || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Locations */}
                {historique.locations.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-green-500"></span>
                      Bons de Location ({historique.locations.length})
                    </h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">N°</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Client</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Chauffeur</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Période</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Montant</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {historique.locations.map((l: any) => (
                            <tr
                              key={l.id}
                              className="hover:bg-green-50 cursor-pointer transition-colors"
                              onClick={() => setSelectedLocation(l)}
                            >
                              <td className="px-4 py-2 text-sm">{new Date(l.createdAt).toLocaleDateString('fr-FR')}</td>
                              <td className="px-4 py-2 text-sm font-medium">
                                <span className="text-green-600 hover:text-green-800">
                                  {l.numero}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-sm">{l.client?.raisonSociale || '-'}</td>
                              <td className="px-4 py-2 text-sm">{l.chauffeur ? `${l.chauffeur.prenom} ${l.chauffeur.nom}` : '-'}</td>
                              <td className="px-4 py-2 text-sm">
                                {l.dateDebut ? new Date(l.dateDebut).toLocaleDateString('fr-FR') : '-'} - {l.dateFinPrevue ? new Date(l.dateFinPrevue).toLocaleDateString('fr-FR') : '-'}
                              </td>
                              <td className="px-4 py-2 text-sm text-right">{formatCurrency(l.montantTotal || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Dotations Carburant */}
                {historique.dotations.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                      Dotations Carburant ({historique.dotations.length})
                    </h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">N° Bon</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Chauffeur</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Litres</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Coût</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {historique.dotations.map((d: any) => (
                            <tr
                              key={d.id}
                              className="hover:bg-orange-50 cursor-pointer transition-colors"
                              onClick={() => setSelectedDotation(d)}
                            >
                              <td className="px-4 py-2 text-sm">{new Date(d.dateDotation).toLocaleDateString('fr-FR')}</td>
                              <td className="px-4 py-2 text-sm font-medium">
                                <span className="text-orange-600 hover:text-orange-800">
                                  {d.numeroBon}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-sm">{d.chauffeur ? `${d.chauffeur.prenom} ${d.chauffeur.nom}` : '-'}</td>
                              <td className="px-4 py-2 text-sm text-right">{d.quantiteLitres} L</td>
                              <td className="px-4 py-2 text-sm text-right">{formatCurrency(d.coutTotal || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Pannes */}
                {historique.pannes && historique.pannes.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500"></span>
                      Historique des Pannes ({historique.pannes.length})
                    </h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">N°</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Priorité</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Statut</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Coût</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {historique.pannes.map((p: PanneDetail) => (
                            <tr
                              key={p.id}
                              className="hover:bg-red-50 cursor-pointer transition-colors"
                              onClick={() => setSelectedPanne(p)}
                            >
                              <td className="px-4 py-2 text-sm">{new Date(p.datePanne).toLocaleDateString('fr-FR')}</td>
                              <td className="px-4 py-2 text-sm font-medium">
                                <span className="text-red-600 hover:text-red-800">
                                  {p.numeroPanne}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-sm">{p.typePanne}</td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  p.priorite === 'URGENTE' ? 'bg-red-100 text-red-800' :
                                  p.priorite === 'HAUTE' ? 'bg-orange-100 text-orange-800' :
                                  p.priorite === 'NORMALE' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {p.priorite}
                                </span>
                              </td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  p.statut === 'REPAREE' || p.statut === 'CLOTUREE' ? 'bg-green-100 text-green-800' :
                                  p.statut === 'EN_REPARATION' ? 'bg-blue-100 text-blue-800' :
                                  p.statut === 'DECLAREE' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {p.statut === 'EN_DIAGNOSTIC' ? 'Diagnostic' :
                                   p.statut === 'EN_ATTENTE_PIECES' ? 'Attente pièces' :
                                   p.statut === 'EN_REPARATION' ? 'En réparation' :
                                   p.statut === 'REPAREE' ? 'Réparée' :
                                   p.statut === 'CLOTUREE' ? 'Clôturée' :
                                   p.statut}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-sm text-right">
                                {p.coutReel ? (
                                  <span className="text-green-600 font-medium">{formatCurrency(p.coutReel)}</span>
                                ) : p.coutEstime ? (
                                  <span className="text-gray-500">{formatCurrency(p.coutEstime)} (est.)</span>
                                ) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {historique.transports.length === 0 && historique.locations.length === 0 && historique.dotations.length === 0 && (!historique.pannes || historique.pannes.length === 0) && (
                  <div className="text-center py-12 text-gray-500">
                    Aucun historique pour ce véhicule
                  </div>
                )}

                {/* Documents du véhicule */}
                <div className="border-t pt-6 mt-6">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Documents du véhicule
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Carte grise, assurance, contrôle technique, photos du véhicule...
                  </p>
                  <FileUpload
                    entiteType="camion"
                    entiteId={selectedCamion.id}
                    accept="image/*,application/pdf,.doc,.docx"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transport Detail Modal */}
      {selectedTransport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">Bon de Transport</h2>
                <p className="text-blue-100 font-medium">{selectedTransport.numero}</p>
              </div>
              <button onClick={() => setSelectedTransport(null)} className="text-white hover:text-blue-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Date création</p>
                  <p className="text-lg font-semibold">
                    {new Date(selectedTransport.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Statut</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedTransport.statut === 'TERMINE' ? 'bg-green-100 text-green-800' :
                    selectedTransport.statut === 'EN_COURS' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedTransport.statut}
                  </span>
                </div>
              </div>
              {selectedTransport.client && (
                <div className="mb-6 p-4 border border-purple-200 rounded-lg bg-purple-50">
                  <h3 className="font-semibold text-purple-900 mb-2">Client</h3>
                  <p className="text-lg">{selectedTransport.client.raisonSociale}</p>
                </div>
              )}
              {selectedTransport.chauffeur && (
                <div className="mb-6 p-4 border border-green-200 rounded-lg bg-green-50">
                  <h3 className="font-semibold text-green-900 mb-2">Chauffeur</h3>
                  <p className="text-lg">{selectedTransport.chauffeur.prenom} {selectedTransport.chauffeur.nom}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">Lieu de départ</p>
                  <p className="font-semibold">{selectedTransport.lieuDepart || '-'}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">Lieu d'arrivée</p>
                  <p className="font-semibold">{selectedTransport.lieuArrivee || '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-500">Distance</p>
                  <p className="text-xl font-bold">{selectedTransport.distance || '-'} km</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-500">Marchandise</p>
                  <p className="text-xl font-bold">{selectedTransport.marchandise || '-'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-500">Poids</p>
                  <p className="text-xl font-bold">{selectedTransport.poids || '-'} T</p>
                </div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-center">
                <p className="text-sm text-green-600">Montant HT</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(selectedTransport.montantHt || 0)}</p>
              </div>
              {selectedTransport.observations && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Observations</p>
                  <p className="text-gray-700">{selectedTransport.observations}</p>
                </div>
              )}
            </div>
            <div className="border-t px-6 py-4 bg-gray-50 flex justify-between">
              <Link
                to="/transport"
                onClick={() => { setSelectedTransport(null); setShowHistorique(false); }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500"
              >
                Voir tous les transports
              </Link>
              <button onClick={() => setSelectedTransport(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Location Detail Modal */}
      {selectedLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-green-600 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">Bon de Location</h2>
                <p className="text-green-100 font-medium">{selectedLocation.numero}</p>
              </div>
              <button onClick={() => setSelectedLocation(null)} className="text-white hover:text-green-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Date création</p>
                  <p className="text-lg font-semibold">
                    {new Date(selectedLocation.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Statut</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedLocation.statut === 'TERMINE' ? 'bg-green-100 text-green-800' :
                    selectedLocation.statut === 'EN_COURS' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedLocation.statut}
                  </span>
                </div>
              </div>
              {selectedLocation.client && (
                <div className="mb-6 p-4 border border-purple-200 rounded-lg bg-purple-50">
                  <h3 className="font-semibold text-purple-900 mb-2">Client</h3>
                  <p className="text-lg">{selectedLocation.client.raisonSociale}</p>
                </div>
              )}
              {selectedLocation.chauffeur && (
                <div className="mb-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
                  <h3 className="font-semibold text-blue-900 mb-2">Chauffeur assigné</h3>
                  <p className="text-lg">{selectedLocation.chauffeur.prenom} {selectedLocation.chauffeur.nom}</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <p className="text-sm text-green-600">Début</p>
                  <p className="font-semibold">{selectedLocation.dateDebut ? new Date(selectedLocation.dateDebut).toLocaleDateString('fr-FR') : '-'}</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg text-center">
                  <p className="text-sm text-yellow-600">Fin prévue</p>
                  <p className="font-semibold">{selectedLocation.dateFinPrevue ? new Date(selectedLocation.dateFinPrevue).toLocaleDateString('fr-FR') : '-'}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <p className="text-sm text-blue-600">Fin effective</p>
                  <p className="font-semibold">{selectedLocation.dateFinEffective ? new Date(selectedLocation.dateFinEffective).toLocaleDateString('fr-FR') : '-'}</p>
                </div>
              </div>
              {selectedLocation.lieuMiseDisposition && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Lieu de mise à disposition</p>
                  <p className="font-semibold">{selectedLocation.lieuMiseDisposition}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-500">Tarif journalier</p>
                  <p className="text-xl font-bold">{formatCurrency(selectedLocation.tarifJournalier || 0)}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center border border-green-200">
                  <p className="text-sm text-green-600">Montant Total</p>
                  <p className="text-2xl font-bold text-green-700">{formatCurrency(selectedLocation.montantTotal || 0)}</p>
                </div>
              </div>
              {selectedLocation.observations && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Observations</p>
                  <p className="text-gray-700">{selectedLocation.observations}</p>
                </div>
              )}
            </div>
            <div className="border-t px-6 py-4 bg-gray-50 flex justify-between">
              <Link
                to="/location"
                onClick={() => { setSelectedLocation(null); setShowHistorique(false); }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-500"
              >
                Voir toutes les locations
              </Link>
              <button onClick={() => setSelectedLocation(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dotation Detail Modal */}
      {selectedDotation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-orange-500 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">Dotation Carburant</h2>
                <p className="text-orange-100 font-medium">{selectedDotation.numeroBon}</p>
              </div>
              <button onClick={() => setSelectedDotation(null)} className="text-white hover:text-orange-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Date dotation</p>
                  <p className="text-lg font-semibold">
                    {new Date(selectedDotation.dateDotation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Source</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedDotation.typeSource === 'CUVE_INTERNE' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {selectedDotation.typeSource === 'CUVE_INTERNE' ? 'Cuve interne' : 'Station externe'}
                  </span>
                </div>
              </div>
              {selectedDotation.chauffeur && (
                <div className="mb-6 p-4 border border-green-200 rounded-lg bg-green-50">
                  <h3 className="font-semibold text-green-900 mb-2">Chauffeur</h3>
                  <p className="text-lg">{selectedDotation.chauffeur.prenom} {selectedDotation.chauffeur.nom}</p>
                </div>
              )}
              {selectedDotation.cuve && (
                <div className="mb-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
                  <h3 className="font-semibold text-blue-900 mb-2">Cuve</h3>
                  <p className="text-lg">{selectedDotation.cuve.nom} <span className="text-sm text-gray-500">({selectedDotation.cuve.typeCarburant})</span></p>
                </div>
              )}
              {selectedDotation.stationNom && (
                <div className="mb-6 p-4 border border-purple-200 rounded-lg bg-purple-50">
                  <h3 className="font-semibold text-purple-900 mb-2">Station externe</h3>
                  <p className="text-lg">{selectedDotation.stationNom}</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-orange-50 rounded-lg text-center border border-orange-200">
                  <p className="text-sm text-orange-600">Quantité</p>
                  <p className="text-2xl font-bold text-orange-700">{selectedDotation.quantiteLitres} L</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-500">Prix unitaire</p>
                  <p className="text-xl font-bold">{selectedDotation.prixUnitaire ? `${Number(selectedDotation.prixUnitaire).toLocaleString()} FCFA` : '-'}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg text-center border border-red-200">
                  <p className="text-sm text-red-600">Coût total</p>
                  <p className="text-2xl font-bold text-red-700">{formatCurrency(selectedDotation.coutTotal || 0)}</p>
                </div>
              </div>
              {selectedDotation.kilometrageCamion && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Kilométrage au moment de la dotation</p>
                  <p className="text-lg font-semibold">{Number(selectedDotation.kilometrageCamion).toLocaleString()} km</p>
                </div>
              )}
              {selectedDotation.observations && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Observations</p>
                  <p className="text-gray-700">{selectedDotation.observations}</p>
                </div>
              )}
            </div>
            <div className="border-t px-6 py-4 bg-gray-50 flex justify-between">
              <Link
                to="/carburant"
                onClick={() => { setSelectedDotation(null); setShowHistorique(false); }}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-400"
              >
                Voir toutes les dotations
              </Link>
              <button onClick={() => setSelectedDotation(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panne Detail Modal */}
      {selectedPanne && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-red-600 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">Détail de la Panne</h2>
                <p className="text-red-100 font-medium">{selectedPanne.numeroPanne}</p>
              </div>
              <button onClick={() => setSelectedPanne(null)} className="text-white hover:text-red-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Date de la panne</p>
                  <p className="text-lg font-semibold">
                    {new Date(selectedPanne.datePanne).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Statut</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedPanne.statut === 'REPAREE' || selectedPanne.statut === 'CLOTUREE' ? 'bg-green-100 text-green-800' :
                    selectedPanne.statut === 'EN_REPARATION' ? 'bg-blue-100 text-blue-800' :
                    selectedPanne.statut === 'DECLAREE' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedPanne.statut === 'EN_DIAGNOSTIC' ? 'En diagnostic' :
                     selectedPanne.statut === 'EN_ATTENTE_PIECES' ? 'Attente pièces' :
                     selectedPanne.statut === 'EN_REPARATION' ? 'En réparation' :
                     selectedPanne.statut === 'REPAREE' ? 'Réparée' :
                     selectedPanne.statut === 'CLOTUREE' ? 'Clôturée' :
                     selectedPanne.statut}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-600">Type de panne</p>
                  <p className="font-semibold">{selectedPanne.typePanne}</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-sm text-orange-600">Priorité</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedPanne.priorite === 'URGENTE' ? 'bg-red-100 text-red-800' :
                    selectedPanne.priorite === 'HAUTE' ? 'bg-orange-100 text-orange-800' :
                    selectedPanne.priorite === 'NORMALE' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedPanne.priorite}
                  </span>
                </div>
              </div>

              {selectedPanne.chauffeur && (
                <div className="mb-6 p-4 border border-green-200 rounded-lg bg-green-50">
                  <h3 className="font-semibold text-green-900 mb-2">Déclaré par</h3>
                  <p className="text-lg">{selectedPanne.chauffeur.prenom} {selectedPanne.chauffeur.nom}</p>
                </div>
              )}

              {selectedPanne.description && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Description</p>
                  <p className="text-gray-700">{selectedPanne.description}</p>
                </div>
              )}

              {selectedPanne.diagnostic && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-600 mb-1">Diagnostic</p>
                  <p className="text-gray-700">{selectedPanne.diagnostic}</p>
                </div>
              )}

              {selectedPanne.travauxEffectues && (
                <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-600 mb-1">Travaux effectués</p>
                  <p className="text-gray-700">{selectedPanne.travauxEffectues}</p>
                </div>
              )}

              {/* Réparation info */}
              {(selectedPanne.typeReparation || selectedPanne.garageExterne || selectedPanne.reparateurInterne) && (
                <div className={`mb-6 p-4 rounded-lg border ${
                  selectedPanne.typeReparation === 'INTERNE' ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'
                }`}>
                  <h4 className="font-semibold mb-2">
                    Réparation {selectedPanne.typeReparation === 'INTERNE' ? 'interne' : 'externe'}
                  </h4>
                  {selectedPanne.typeReparation === 'INTERNE' && selectedPanne.reparateurInterne && (
                    <p className="text-sm"><span className="text-gray-500">Technicien:</span> {selectedPanne.reparateurInterne}</p>
                  )}
                  {selectedPanne.typeReparation === 'EXTERNE' && selectedPanne.garageExterne && (
                    <p className="text-sm"><span className="text-gray-500">Garage:</span> {selectedPanne.garageExterne}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                {(selectedPanne.coutEstime !== null && selectedPanne.coutEstime !== undefined) && (
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-500">Coût estimé</p>
                    <p className="text-xl font-bold">{formatCurrency(selectedPanne.coutEstime)}</p>
                  </div>
                )}
                {(selectedPanne.coutReel !== null && selectedPanne.coutReel !== undefined) && (
                  <div className="p-4 bg-green-50 rounded-lg text-center border border-green-200">
                    <p className="text-sm text-green-600">Coût réel</p>
                    <p className="text-2xl font-bold text-green-700">{formatCurrency(selectedPanne.coutReel)}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="border-t px-6 py-4 bg-gray-50 flex justify-between">
              <Link
                to="/pannes"
                onClick={() => { setSelectedPanne(null); setShowHistorique(false); }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-500"
              >
                Voir toutes les pannes
              </Link>
              <button onClick={() => setSelectedPanne(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300">
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
            <h2 className="text-xl font-bold text-gray-900 mb-4">{confirmModal.title}</h2>
            <p className="text-gray-600 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} })}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
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
