import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import chauffeursService from '../services/chauffeurs.service';
import FileUpload from '../components/FileUpload';
import { exportToCSV, printTable } from '../utils/export';
import { useToast } from '../components/ui/Toast';
import { SkeletonTable, Breadcrumb } from '../components/ui';
import { useEscapeKey } from '../hooks/useKeyboardShortcuts';

interface Chauffeur {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  telephone?: string;
  numeroPermis: string;
  typePermis: string;
  dateExpirationPermis?: string;
  statut: 'DISPONIBLE' | 'EN_MISSION' | 'CONGE' | 'INDISPONIBLE';
  actif: boolean;
  nombreVoyages?: number;
}

interface CreateChauffeurDto {
  matricule: string;
  nom: string;
  prenom: string;
  telephone?: string;
  numeroPermis: string;
  typePermis: string;
  statut?: 'DISPONIBLE' | 'EN_MISSION' | 'CONGE' | 'INDISPONIBLE';
}

const typesPermis = ['B', 'C', 'D', 'EC', 'ED'];

const statutColors = {
  DISPONIBLE: 'bg-green-100 text-green-800',
  EN_MISSION: 'bg-blue-100 text-blue-800',
  CONGE: 'bg-yellow-100 text-yellow-800',
  INDISPONIBLE: 'bg-red-100 text-red-800',
};

const statutLabels = {
  DISPONIBLE: 'Disponible',
  EN_MISSION: 'En mission',
  CONGE: 'En congé',
  INDISPONIBLE: 'Indisponible',
};

type SortField = 'nom' | 'matricule' | 'telephone' | 'typePermis' | 'statut';
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
  camion?: { id: number; immatriculation: string; numeroInterne?: string };
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
  camion?: { id: number; immatriculation: string; numeroInterne?: string };
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
  camion?: { id: number; immatriculation: string; numeroInterne?: string };
  cuve?: { id: number; nom: string; typeCarburant: string };
}

interface PanneDetail {
  id: number;
  numeroPanne: string;
  description?: string;
  datePanne: string;
  typePanne: string;
  priorite: string;
  statut: string;
  diagnostic?: string;
  travauxEffectues?: string;
  coutEstime?: number;
  coutReel?: number;
  typeReparation?: string;
  garageExterne?: string;
  reparateurInterne?: string;
  camion?: { id: number; immatriculation: string; numeroInterne?: string };
}

export default function ChauffeursPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');

  const [showModal, setShowModal] = useState(false);
  const [showHistorique, setShowHistorique] = useState(false);
  const [selectedChauffeur, setSelectedChauffeur] = useState<Chauffeur | null>(null);
  const [editingChauffeur, setEditingChauffeur] = useState<Chauffeur | null>(null);

  // Detail modals for bons
  const [selectedTransport, setSelectedTransport] = useState<TransportDetail | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationDetail | null>(null);
  const [selectedDotation, setSelectedDotation] = useState<DotationDetail | null>(null);
  const [selectedPanne, setSelectedPanne] = useState<PanneDetail | null>(null);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ show: false, title: '', message: '', onConfirm: () => {} });

  const [formData, setFormData] = useState<CreateChauffeurDto>({
    matricule: '',
    nom: '',
    prenom: '',
    telephone: '',
    numeroPermis: '',
    typePermis: 'C',
  });

  // Search, Sort and Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('nom');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const { data: chauffeurs, isLoading, error } = useQuery({
    queryKey: ['chauffeurs'],
    queryFn: chauffeursService.getAll,
  });

  const { data: historique, isLoading: loadingHistorique } = useQuery({
    queryKey: ['chauffeur-historique', selectedChauffeur?.id],
    queryFn: () => chauffeursService.getHistorique(selectedChauffeur!.id),
    enabled: !!selectedChauffeur && showHistorique,
  });

  const createMutation = useMutation({
    mutationFn: chauffeursService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chauffeurs'] });
      closeModal();
      toast.success('Chauffeur créé avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la création du chauffeur');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateChauffeurDto> }) =>
      chauffeursService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chauffeurs'] });
      closeModal();
      toast.success('Chauffeur modifié avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la modification du chauffeur');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: chauffeursService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chauffeurs'] });
      toast.success('Chauffeur supprimé avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression du chauffeur');
    },
  });

  // Handle highlight from alertes page
  useEffect(() => {
    if (highlightId && chauffeurs) {
      const chauffeurToHighlight = chauffeurs.find(c => c.id === Number(highlightId));
      if (chauffeurToHighlight) {
        setSelectedChauffeur(chauffeurToHighlight);
        setShowHistorique(true);
        // Clear the highlight param after showing
        setSearchParams({});
        // Scroll to the row
        setTimeout(() => {
          const row = document.getElementById(`chauffeur-row-${highlightId}`);
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
  }, [highlightId, chauffeurs, setSearchParams]);

  const openCreateModal = () => {
    setEditingChauffeur(null);
    setFormData({
      matricule: '',
      nom: '',
      prenom: '',
      telephone: '',
      numeroPermis: '',
      typePermis: 'C',
    });
    setShowModal(true);
  };

  const openEditModal = (chauffeur: Chauffeur) => {
    setEditingChauffeur(chauffeur);
    setFormData({
      matricule: chauffeur.matricule,
      nom: chauffeur.nom,
      prenom: chauffeur.prenom,
      telephone: chauffeur.telephone || '',
      numeroPermis: chauffeur.numeroPermis,
      typePermis: chauffeur.typePermis,
      statut: chauffeur.statut,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingChauffeur(null);
  };

  // Keyboard shortcuts - fermer modals avec Escape
  useEscapeKey(() => {
    if (confirmModal.show) {
      setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
    } else if (selectedTransport) {
      setSelectedTransport(null);
    } else if (selectedLocation) {
      setSelectedLocation(null);
    } else if (selectedDotation) {
      setSelectedDotation(null);
    } else if (selectedPanne) {
      setSelectedPanne(null);
    } else if (showHistorique) {
      setShowHistorique(false);
      setSelectedChauffeur(null);
    } else if (showModal) {
      closeModal();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingChauffeur) {
      // Show confirmation for edits
      setConfirmModal({
        show: true,
        title: 'Confirmer la modification',
        message: `Voulez-vous vraiment modifier le chauffeur ${editingChauffeur.prenom} ${editingChauffeur.nom} ?`,
        onConfirm: () => {
          updateMutation.mutate({ id: editingChauffeur.id, data: formData });
          setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
        },
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (chauffeur: Chauffeur) => {
    setConfirmModal({
      show: true,
      title: 'Confirmer la suppression',
      message: `Voulez-vous vraiment supprimer le chauffeur ${chauffeur.prenom} ${chauffeur.nom} ?`,
      onConfirm: () => {
        deleteMutation.mutate(chauffeur.id);
        setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
      },
    });
  };

  const openHistorique = (chauffeur: Chauffeur) => {
    setSelectedChauffeur(chauffeur);
    setShowHistorique(true);
  };

  const formatCurrency = (amount: number) => {
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount)} FCFA`;
  };

  // Filter and sort chauffeurs
  const filteredAndSortedChauffeurs = chauffeurs
    ?.filter(chauffeur => {
      // Filter by status first
      if (statusFilter && chauffeur.statut !== statusFilter) return false;

      // Then filter by search query
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        chauffeur.nom?.toLowerCase().includes(query) ||
        chauffeur.prenom?.toLowerCase().includes(query) ||
        chauffeur.matricule?.toLowerCase().includes(query) ||
        chauffeur.telephone?.toLowerCase().includes(query) ||
        chauffeur.typePermis?.toLowerCase().includes(query) ||
        chauffeur.numeroPermis?.toLowerCase().includes(query) ||
        statutLabels[chauffeur.statut]?.toLowerCase().includes(query)
      );
    })
    ?.sort((a, b) => {
      let aVal: string = '';
      let bVal: string = '';

      switch (sortField) {
        case 'nom':
          aVal = `${a.nom} ${a.prenom}`;
          bVal = `${b.nom} ${b.prenom}`;
          break;
        case 'matricule':
          aVal = a.matricule || '';
          bVal = b.matricule || '';
          break;
        case 'telephone':
          aVal = a.telephone || '';
          bVal = b.telephone || '';
          break;
        case 'typePermis':
          aVal = a.typePermis || '';
          bVal = b.typePermis || '';
          break;
        case 'statut':
          aVal = a.statut || '';
          bVal = b.statut || '';
          break;
      }

      return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }) || [];

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

  const exportHistoriqueCSV = (chauffeur: Chauffeur, data: any) => {
    const lines: string[] = [];

    // Header
    lines.push(`Historique des missions - ${chauffeur.prenom} ${chauffeur.nom} (${chauffeur.matricule})`);
    lines.push(`Exporté le ${new Date().toLocaleDateString('fr-FR')}`);
    lines.push('');

    // Stats summary
    lines.push('=== RÉSUMÉ ===');
    lines.push(`Total missions;${data.stats.totalMissions}`);
    lines.push(`Missions terminées;${data.stats.missionsTerminees}`);
    lines.push(`Taux de complétion;${data.stats.tauxCompletion}%`);
    lines.push(`Revenus totaux;${data.stats.totalRevenus} FCFA`);
    lines.push(`Km parcourus;${data.stats.totalKmParcourus}`);
    lines.push(`Carburant consommé;${data.stats.totalCarburantLitres} L`);
    lines.push('');

    // Transports
    if (data.transports.length > 0) {
      lines.push('=== BONS DE TRANSPORT ===');
      lines.push('Date;N°;Client;Trajet;Nature;Camion;Poids (kg);Statut;Montant (FCFA)');
      data.transports.forEach((t: any) => {
        const date = new Date(t.dateChargement || t.createdAt).toLocaleDateString('fr-FR');
        const trajet = `${t.lieuChargement || '?'} → ${t.lieuDechargement || '?'}`;
        const isProvisoire = t.statut === 'EN_COURS' || t.statut === 'BROUILLON';
        const montant = isProvisoire ? `~${t.montantHt || 0} (provisoire)` : (t.montantHt || 0);
        lines.push(`${date};${t.numero};${t.client?.raisonSociale || '-'};${trajet};${t.natureChargement || '-'};${t.camion?.immatriculation || '-'};${t.poidsKg || 0};${t.statut};${montant}`);
      });
      lines.push('');
    }

    // Locations
    if (data.locations.length > 0) {
      lines.push('=== BONS DE LOCATION ===');
      lines.push('Date début;Date fin;N°;Client;Camion;Durée (j);Km parcourus;Tarif/jour (FCFA);Statut;Montant (FCFA)');
      data.locations.forEach((l: any) => {
        const dateDebut = l.dateDebut ? new Date(l.dateDebut).toLocaleDateString('fr-FR') : '-';
        const dateFin = (l.dateFinReelle || l.dateFinPrevue) ? new Date(l.dateFinReelle || l.dateFinPrevue).toLocaleDateString('fr-FR') : '-';
        const duree = l.dateDebut && (l.dateFinReelle || l.dateFinPrevue)
          ? Math.ceil((new Date(l.dateFinReelle || l.dateFinPrevue).getTime() - new Date(l.dateDebut).getTime()) / (1000 * 60 * 60 * 24))
          : '-';
        const km = l.kmDepart && l.kmRetour ? Number(l.kmRetour) - Number(l.kmDepart) : '-';
        const isProvisoire = l.statut === 'EN_COURS' || l.statut === 'BROUILLON';
        const montant = isProvisoire ? `~${l.montantTotal || 0} (provisoire)` : (l.montantTotal || 0);
        lines.push(`${dateDebut};${dateFin};${l.numero};${l.client?.raisonSociale || '-'};${l.camion?.immatriculation || '-'};${duree};${km};${l.tarifJournalier || '-'};${l.statut};${montant}`);
      });
      lines.push('');
    }

    // Dotations
    if (data.dotations.length > 0) {
      lines.push('=== DOTATIONS CARBURANT ===');
      lines.push('Date;N° Bon;Camion;Litres');
      data.dotations.forEach((d: any) => {
        const date = new Date(d.dateDotation).toLocaleDateString('fr-FR');
        lines.push(`${date};${d.numeroBon};${d.camion?.immatriculation || '-'};${d.quantiteLitres}`);
      });
      lines.push('');
    }

    // Pannes
    if (data.pannes && data.pannes.length > 0) {
      lines.push('=== PANNES SIGNALÉES ===');
      lines.push('Date;N°;Camion;Type;Description;Priorité;Statut;Coût (FCFA)');
      data.pannes.forEach((p: any) => {
        const date = new Date(p.datePanne).toLocaleDateString('fr-FR');
        const description = (p.description || '').replace(/;/g, ',').replace(/\n/g, ' ');
        lines.push(`${date};${p.numeroPanne};${p.camion?.immatriculation || '-'};${p.typePanne};${description};${p.priorite};${p.statut};${p.coutReel || p.coutEstime || '-'}`);
      });
    }

    // Create and download CSV
    const BOM = '\uFEFF';
    const csvContent = BOM + lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historique_${chauffeur.matricule}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printHistorique = (chauffeur: Chauffeur, data: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Historique - ${chauffeur.prenom} ${chauffeur.nom}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
          h1 { color: #1f2937; font-size: 18px; margin-bottom: 5px; }
          h2 { color: #374151; font-size: 14px; margin-top: 20px; border-bottom: 2px solid #f5b800; padding-bottom: 5px; }
          .subtitle { color: #6b7280; margin-bottom: 15px; }
          .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
          .stat-box { background: #f3f4f6; padding: 10px; border-radius: 5px; text-align: center; }
          .stat-value { font-size: 18px; font-weight: bold; color: #1f2937; }
          .stat-label { font-size: 10px; color: #6b7280; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
          th { background: #f3f4f6; padding: 8px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
          td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
          tr:hover { background: #f9fafb; }
          .badge { padding: 2px 6px; border-radius: 3px; font-size: 10px; }
          .badge-green { background: #d1fae5; color: #065f46; }
          .badge-blue { background: #dbeafe; color: #1e40af; }
          .badge-red { background: #fee2e2; color: #991b1b; }
          .badge-yellow { background: #fef3c7; color: #92400e; }
          .text-right { text-align: right; }
          .footer { margin-top: 30px; text-align: center; color: #9ca3af; font-size: 10px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Historique des Missions</h1>
        <div class="subtitle">${chauffeur.prenom} ${chauffeur.nom} - Matricule: ${chauffeur.matricule}</div>

        <div class="stats">
          <div class="stat-box">
            <div class="stat-value">${data.stats.totalMissions}</div>
            <div class="stat-label">Missions (${data.stats.tauxCompletion}% terminées)</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${new Intl.NumberFormat('fr-FR').format(data.stats.totalRevenus)} FCFA</div>
            <div class="stat-label">Revenus générés</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${new Intl.NumberFormat('fr-FR').format(data.stats.totalKmParcourus)} km</div>
            <div class="stat-label">Km parcourus</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${new Intl.NumberFormat('fr-FR').format(data.stats.totalCarburantLitres)} L</div>
            <div class="stat-label">Carburant</div>
          </div>
        </div>

        ${data.transports.length > 0 ? `
          <h2>Bons de Transport (${data.transports.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>N°</th>
                <th>Client</th>
                <th>Trajet</th>
                <th>Nature</th>
                <th>Camion</th>
                <th class="text-right">Poids</th>
                <th>Statut</th>
                <th class="text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              ${data.transports.map((t: any) => `
                <tr>
                  <td>${new Date(t.dateChargement || t.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td>${t.numero}</td>
                  <td>${t.client?.raisonSociale || '-'}</td>
                  <td>${t.lieuChargement || '?'} → ${t.lieuDechargement || '?'}</td>
                  <td>${t.natureChargement ? t.natureChargement.replace(/_/g, ' ') : '-'}</td>
                  <td>${t.camion?.immatriculation || '-'}</td>
                  <td class="text-right">${t.poidsKg ? Number(t.poidsKg).toLocaleString() + ' kg' : '-'}</td>
                  <td><span class="badge ${t.statut === 'LIVRE' || t.statut === 'FACTURE' ? 'badge-green' : t.statut === 'EN_COURS' ? 'badge-blue' : 'badge-yellow'}">${t.statut}</span></td>
                  <td class="text-right">${new Intl.NumberFormat('fr-FR').format(t.montantHt || 0)} FCFA</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        ${data.locations.length > 0 ? `
          <h2>Bons de Location (${data.locations.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Période</th>
                <th>N°</th>
                <th>Client</th>
                <th>Camion</th>
                <th class="text-right">Durée</th>
                <th class="text-right">Km</th>
                <th>Statut</th>
                <th class="text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              ${data.locations.map((l: any) => {
                const dateDebut = l.dateDebut ? new Date(l.dateDebut) : null;
                const dateFin = l.dateFinReelle || l.dateFinPrevue ? new Date(l.dateFinReelle || l.dateFinPrevue) : null;
                const duree = dateDebut && dateFin ? Math.ceil((dateFin.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24)) : null;
                const km = l.kmDepart && l.kmRetour ? Number(l.kmRetour) - Number(l.kmDepart) : null;
                return `
                <tr>
                  <td>${dateDebut ? dateDebut.toLocaleDateString('fr-FR') : '-'} → ${dateFin ? dateFin.toLocaleDateString('fr-FR') : '-'}</td>
                  <td>${l.numero}</td>
                  <td>${l.client?.raisonSociale || '-'}</td>
                  <td>${l.camion?.immatriculation || '-'}</td>
                  <td class="text-right">${duree !== null ? duree + ' j' : '-'}</td>
                  <td class="text-right">${km !== null ? km.toLocaleString() + ' km' : '-'}</td>
                  <td><span class="badge ${l.statut === 'LIVRE' || l.statut === 'FACTURE' ? 'badge-green' : l.statut === 'EN_COURS' ? 'badge-blue' : 'badge-yellow'}">${l.statut}</span></td>
                  <td class="text-right">${new Intl.NumberFormat('fr-FR').format(l.montantTotal || 0)} FCFA</td>
                </tr>
              `}).join('')}
            </tbody>
          </table>
        ` : ''}

        ${data.pannes && data.pannes.length > 0 ? `
          <h2>Pannes Signalées (${data.pannes.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>N°</th>
                <th>Camion</th>
                <th>Type</th>
                <th>Priorité</th>
                <th>Statut</th>
                <th class="text-right">Coût</th>
              </tr>
            </thead>
            <tbody>
              ${data.pannes.map((p: any) => `
                <tr>
                  <td>${new Date(p.datePanne).toLocaleDateString('fr-FR')}</td>
                  <td>${p.numeroPanne}</td>
                  <td>${p.camion?.immatriculation || '-'}</td>
                  <td>${p.typePanne}</td>
                  <td><span class="badge ${p.priorite === 'URGENTE' ? 'badge-red' : p.priorite === 'HAUTE' ? 'badge-yellow' : 'badge-blue'}">${p.priorite}</span></td>
                  <td><span class="badge ${p.statut === 'REPAREE' || p.statut === 'CLOTUREE' ? 'badge-green' : 'badge-yellow'}">${p.statut.replace(/_/g, ' ')}</span></td>
                  <td class="text-right">${p.coutReel ? new Intl.NumberFormat('fr-FR').format(p.coutReel) + ' FCFA' : p.coutEstime ? '~' + new Intl.NumberFormat('fr-FR').format(p.coutEstime) + ' FCFA' : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        <div class="footer">
          Imprimé le ${new Date().toLocaleString('fr-FR')} - ACL Platform
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  if (isLoading) {
    return (
      <div>
        <Breadcrumb />
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des Chauffeurs</h1>
            <p className="text-gray-600">Gérez les profils administratifs des chauffeurs</p>
          </div>
        </div>
        <SkeletonTable rows={8} columns={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg">
        Erreur lors du chargement des chauffeurs
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb />
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Chauffeurs</h1>
          <p className="text-gray-600">Gérez les profils administratifs des chauffeurs</p>
        </div>
        <button onClick={openCreateModal} className="bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-yellow-400 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau chauffeur
        </button>
      </div>

      {/* Stats - Clickable filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div
          onClick={() => setStatusFilter(null)}
          className={`bg-white p-4 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${
            statusFilter === null ? 'ring-2 ring-gray-400 bg-gray-50' : ''
          }`}
        >
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold text-gray-900">{chauffeurs?.length || 0}</p>
        </div>
        <div
          onClick={() => setStatusFilter(statusFilter === 'DISPONIBLE' ? null : 'DISPONIBLE')}
          className={`bg-white p-4 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${
            statusFilter === 'DISPONIBLE' ? 'ring-2 ring-green-500 bg-green-50' : ''
          }`}
        >
          <p className="text-sm text-gray-600">Disponibles</p>
          <p className="text-2xl font-bold text-green-600">
            {chauffeurs?.filter(c => c.statut === 'DISPONIBLE').length || 0}
          </p>
        </div>
        <div
          onClick={() => setStatusFilter(statusFilter === 'EN_MISSION' ? null : 'EN_MISSION')}
          className={`bg-white p-4 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${
            statusFilter === 'EN_MISSION' ? 'ring-2 ring-blue-500 bg-blue-50' : ''
          }`}
        >
          <p className="text-sm text-gray-600">En mission</p>
          <p className="text-2xl font-bold text-blue-600">
            {chauffeurs?.filter(c => c.statut === 'EN_MISSION').length || 0}
          </p>
        </div>
        <div
          onClick={() => setStatusFilter(statusFilter === 'CONGE' ? null : 'CONGE')}
          className={`bg-white p-4 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${
            statusFilter === 'CONGE' ? 'ring-2 ring-yellow-500 bg-yellow-50' : ''
          }`}
        >
          <p className="text-sm text-gray-600">En congé</p>
          <p className="text-2xl font-bold text-yellow-600">
            {chauffeurs?.filter(c => c.statut === 'CONGE').length || 0}
          </p>
        </div>
        <div
          onClick={() => setStatusFilter(statusFilter === 'INDISPONIBLE' ? null : 'INDISPONIBLE')}
          className={`bg-white p-4 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${
            statusFilter === 'INDISPONIBLE' ? 'ring-2 ring-red-500 bg-red-50' : ''
          }`}
        >
          <p className="text-sm text-gray-600">Indisponibles</p>
          <p className="text-2xl font-bold text-red-600">
            {chauffeurs?.filter(c => c.statut === 'INDISPONIBLE').length || 0}
          </p>
        </div>
      </div>

      {/* Active filter indicator */}
      {statusFilter && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-gray-600">Filtre actif:</span>
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
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Search and Export */}
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Rechercher (nom, matricule, permis...)"
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
              if (!filteredAndSortedChauffeurs || filteredAndSortedChauffeurs.length === 0) return;
              exportToCSV(
                filteredAndSortedChauffeurs.map(c => ({
                  matricule: c.matricule,
                  nom: c.nom,
                  prenom: c.prenom,
                  telephone: c.telephone || '-',
                  numeroPermis: c.numeroPermis,
                  typePermis: c.typePermis,
                  statut: statutLabels[c.statut] || c.statut,
                })),
                'chauffeurs',
                [
                  { key: 'matricule', label: 'Matricule' },
                  { key: 'prenom', label: 'Prénom' },
                  { key: 'nom', label: 'Nom' },
                  { key: 'telephone', label: 'Téléphone' },
                  { key: 'numeroPermis', label: 'N° Permis' },
                  { key: 'typePermis', label: 'Type Permis' },
                  { key: 'statut', label: 'Statut' },
                ]
              );
            }}
            disabled={!filteredAndSortedChauffeurs || filteredAndSortedChauffeurs.length === 0}
            className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exporter CSV ({filteredAndSortedChauffeurs?.length || 0})
          </button>
          <button
            onClick={() => {
              if (!filteredAndSortedChauffeurs || filteredAndSortedChauffeurs.length === 0) return;
              printTable(
                'Liste des Chauffeurs',
                ['Matricule', 'Nom Complet', 'Téléphone', 'Permis', 'Statut'],
                filteredAndSortedChauffeurs.map(c => [
                  c.matricule,
                  `${c.prenom} ${c.nom}`,
                  c.telephone || '-',
                  `${c.typePermis} - ${c.numeroPermis}`,
                  statutLabels[c.statut] || c.statut,
                ])
              );
            }}
            disabled={!filteredAndSortedChauffeurs || filteredAndSortedChauffeurs.length === 0}
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
          <div className="px-4 py-2 bg-gray-50 text-sm text-gray-600">
            {filteredAndSortedChauffeurs.length} résultat(s) trouvé(s)
          </div>
        )}
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                onClick={() => handleSort('nom')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
              >
                Chauffeur <SortIcon field="nom" />
              </th>
              <th
                onClick={() => handleSort('matricule')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
              >
                Matricule <SortIcon field="matricule" />
              </th>
              <th
                onClick={() => handleSort('telephone')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
              >
                Téléphone <SortIcon field="telephone" />
              </th>
              <th
                onClick={() => handleSort('typePermis')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
              >
                Permis <SortIcon field="typePermis" />
              </th>
              <th
                onClick={() => handleSort('statut')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
              >
                Statut <SortIcon field="statut" />
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Voyages</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredAndSortedChauffeurs.map((chauffeur) => (
              <tr key={chauffeur.id} id={`chauffeur-row-${chauffeur.id}`} className="hover:bg-gray-50 transition-all duration-300">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-medium">
                        {chauffeur.prenom[0]}{chauffeur.nom[0]}
                      </span>
                    </div>
                    <div className="ml-3">
                      <div className="font-medium text-gray-900">{chauffeur.prenom} {chauffeur.nom}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-900">{chauffeur.matricule}</td>
                <td className="px-6 py-4 text-gray-900">{chauffeur.telephone || '-'}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                    {chauffeur.typePermis}
                  </span>
                  <div className="text-xs text-gray-500 mt-1">{chauffeur.numeroPermis}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statutColors[chauffeur.statut]}`}>
                    {statutLabels[chauffeur.statut]}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center justify-center px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {chauffeur.nombreVoyages || 0}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => openHistorique(chauffeur)}
                    className="text-green-600 hover:text-green-800 mr-3"
                  >
                    Fiche
                  </button>
                  <button
                    onClick={() => openEditModal(chauffeur)}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(chauffeur)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
            {filteredAndSortedChauffeurs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  {searchQuery
                    ? `Aucun chauffeur trouvé pour "${searchQuery}"`
                    : 'Aucun chauffeur enregistré. Cliquez sur "Nouveau chauffeur" pour en ajouter un.'
                  }
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingChauffeur ? 'Modifier le chauffeur' : 'Nouveau chauffeur'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Matricule *</label>
                  <input
                    type="text"
                    value={formData.matricule}
                    onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="CHF-001"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prénom *</label>
                    <input
                      type="text"
                      value={formData.prenom}
                      onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom *</label>
                    <input
                      type="text"
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Téléphone</label>
                  <input
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="+221 77 123 45 67"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type permis *</label>
                    <select
                      value={formData.typePermis}
                      onChange={(e) => setFormData({ ...formData, typePermis: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      {typesPermis.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">N° Permis *</label>
                    <input
                      type="text"
                      value={formData.numeroPermis}
                      onChange={(e) => setFormData({ ...formData, numeroPermis: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>
                </div>

                {/* Statut - only shown when editing */}
                {editingChauffeur && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Statut</label>
                    <select
                      value={formData.statut || 'DISPONIBLE'}
                      onChange={(e) => setFormData({ ...formData, statut: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="DISPONIBLE">Disponible (en service)</option>
                      <option value="CONGE">En congé</option>
                      <option value="INDISPONIBLE">Indisponible</option>
                      {formData.statut === 'EN_MISSION' && (
                        <option value="EN_MISSION">En mission (automatique)</option>
                      )}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.statut === 'EN_MISSION'
                        ? "Ce chauffeur est actuellement en mission. Le statut changera automatiquement à la fin de la mission."
                        : "Changez le statut pour mettre le chauffeur en congé ou le rendre indisponible."
                      }
                    </p>
                  </div>
                )}
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

      {/* Fiche d'information Modal */}
      {showHistorique && selectedChauffeur && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-4">
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-yellow-500 to-yellow-400">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-2xl font-bold text-yellow-600">
                  {selectedChauffeur.prenom[0]}{selectedChauffeur.nom[0]}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedChauffeur.prenom} {selectedChauffeur.nom}
                  </h2>
                  <p className="text-sm text-gray-700">Matricule: {selectedChauffeur.matricule}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${statutColors[selectedChauffeur.statut]}`}>
                    {statutLabels[selectedChauffeur.statut]}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {historique && (
                  <>
                    <button
                      onClick={() => exportHistoriqueCSV(selectedChauffeur, historique)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-500"
                      title="Exporter en CSV"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      CSV
                    </button>
                    <button
                      onClick={() => printHistorique(selectedChauffeur, historique)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500"
                      title="Imprimer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Imprimer
                    </button>
                  </>
                )}
                <button onClick={() => setShowHistorique(false)} className="text-gray-500 hover:text-gray-700 ml-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {loadingHistorique ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
              </div>
            ) : historique && (
              <div className="flex-1 overflow-y-auto p-6">
                {/* Informations personnelles */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Informations personnelles</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Téléphone</p>
                      <p className="font-medium">{selectedChauffeur.telephone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Type de permis</p>
                      <p className="font-medium">{selectedChauffeur.typePermis}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">N° Permis</p>
                      <p className="font-medium">{selectedChauffeur.numeroPermis}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Expiration permis</p>
                      <p className={`font-medium ${selectedChauffeur.dateExpirationPermis && new Date(selectedChauffeur.dateExpirationPermis) < new Date() ? 'text-red-600' : ''}`}>
                        {selectedChauffeur.dateExpirationPermis
                          ? new Date(selectedChauffeur.dateExpirationPermis).toLocaleDateString('fr-FR')
                          : '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stats - Row 1 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-600">Missions</p>
                    <p className="text-2xl font-bold text-blue-700">{historique.stats.totalMissions}</p>
                    <p className="text-xs text-blue-500 mt-1">
                      {historique.stats.tauxCompletion}% terminées
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-600">Terminées</p>
                    <p className="text-2xl font-bold text-green-700">{historique.stats.missionsTerminees}</p>
                    <p className="text-xs text-green-500 mt-1">
                      {historique.stats.moyenneParMission > 0 ? `Moy. ${formatCurrency(historique.stats.moyenneParMission)}/mission` : '-'}
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-sm text-yellow-600">Revenus générés</p>
                    <p className="text-2xl font-bold text-yellow-700">{formatCurrency(historique.stats.totalRevenus)}</p>
                    <p className="text-xs text-yellow-600 mt-1">
                      Transport: {formatCurrency(historique.stats.revenusTransport)} | Location: {formatCurrency(historique.stats.revenusLocation)}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-orange-600">Carburant</p>
                    <p className="text-2xl font-bold text-orange-700">{historique.stats.totalCarburantLitres.toLocaleString()} L</p>
                    <p className="text-xs text-orange-500 mt-1">{historique.dotations.length} dotations</p>
                  </div>
                </div>
                {/* Stats - Row 2 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-purple-600">Km parcourus</p>
                    <p className="text-2xl font-bold text-purple-700">{historique.stats.totalKmParcourus.toLocaleString()} km</p>
                    <p className="text-xs text-purple-500 mt-1">Locations uniquement</p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <p className="text-sm text-indigo-600">Poids transporté</p>
                    <p className="text-2xl font-bold text-indigo-700">{(historique.stats.totalPoidsTransporte / 1000).toFixed(1)} T</p>
                    <p className="text-xs text-indigo-500 mt-1">{historique.stats.totalPoidsTransporte.toLocaleString()} kg</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-red-600">Pannes signalées</p>
                    <p className="text-2xl font-bold text-red-700">{historique.stats.totalPannes}</p>
                    <p className="text-xs text-red-500 mt-1">{historique.stats.pannesResolues} résolues</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Clients servis</p>
                    <p className="text-2xl font-bold text-gray-700">
                      {new Set([
                        ...historique.transports.map((t: any) => t.clientId).filter(Boolean),
                        ...historique.locations.map((l: any) => l.clientId).filter(Boolean)
                      ]).size}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Clients uniques</p>
                  </div>
                </div>

                {/* Transports */}
                {historique.transports.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                      Bons de Transport ({historique.transports.length})
                    </h3>
                    <div className="border rounded-lg overflow-hidden overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">N°</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Client</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Trajet</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Nature</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Camion</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Poids</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Statut</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Montant</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {historique.transports.map((t: any) => (
                            <tr
                              key={t.id}
                              className="hover:bg-blue-50 cursor-pointer transition-colors"
                              onClick={() => setSelectedTransport(t)}
                            >
                              <td className="px-4 py-2 text-sm whitespace-nowrap">{new Date(t.createdAt).toLocaleDateString('fr-FR')}</td>
                              <td className="px-4 py-2 text-sm font-medium">
                                <span className="text-blue-600 hover:text-blue-800">
                                  {t.numero}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-sm">{t.client?.raisonSociale || '-'}</td>
                              <td className="px-4 py-2 text-sm">
                                {t.lieuChargement || t.lieuDechargement ? (
                                  <span className="flex items-center gap-1">
                                    <span className="truncate max-w-[100px]" title={t.lieuChargement}>{t.lieuChargement || '?'}</span>
                                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                    <span className="truncate max-w-[100px]" title={t.lieuDechargement}>{t.lieuDechargement || '?'}</span>
                                  </span>
                                ) : '-'}
                              </td>
                              <td className="px-4 py-2 text-sm">
                                {t.natureChargement ? (
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                                    {t.natureChargement.replace(/_/g, ' ')}
                                  </span>
                                ) : '-'}
                              </td>
                              <td className="px-4 py-2 text-sm">{t.camion?.immatriculation || '-'}</td>
                              <td className="px-4 py-2 text-sm text-right">{t.poidsKg ? `${Number(t.poidsKg).toLocaleString()} kg` : '-'}</td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-1 text-xs rounded ${
                                  t.statut === 'LIVRE' || t.statut === 'FACTURE' ? 'bg-green-100 text-green-800' :
                                  t.statut === 'EN_COURS' ? 'bg-blue-100 text-blue-800' :
                                  t.statut === 'ANNULE' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {t.statut}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-sm text-right font-medium">
                                {t.statut === 'EN_COURS' || t.statut === 'BROUILLON' ? (
                                  <span className="text-blue-600" title="Montant provisoire - transport en cours">
                                    ~{formatCurrency(t.montantHt || 0)}
                                    <span className="text-xs ml-1">*</span>
                                  </span>
                                ) : (
                                  <span className="text-gray-900">{formatCurrency(t.montantHt || 0)}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 border-t">
                        <span className="text-blue-600">*</span> Montant provisoire (en cours)
                      </div>
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
                    <div className="border rounded-lg overflow-hidden overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Période</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">N°</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Client</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Camion</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Durée</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Km</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Tarif/jour</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Statut</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Montant</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {historique.locations.map((l: any) => {
                            const dateDebut = l.dateDebut ? new Date(l.dateDebut) : null;
                            const dateFin = l.dateFinReelle || l.dateFinPrevue ? new Date(l.dateFinReelle || l.dateFinPrevue) : null;
                            const dureeJours = dateDebut && dateFin ? Math.ceil((dateFin.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24)) : null;
                            const kmParcourus = l.kmDepart && l.kmRetour ? Number(l.kmRetour) - Number(l.kmDepart) : null;
                            return (
                              <tr
                                key={l.id}
                                className="hover:bg-green-50 cursor-pointer transition-colors"
                                onClick={() => setSelectedLocation(l)}
                              >
                                <td className="px-4 py-2 text-sm whitespace-nowrap">
                                  {dateDebut ? dateDebut.toLocaleDateString('fr-FR') : '-'}
                                  {dateFin && <span className="text-gray-400"> → {dateFin.toLocaleDateString('fr-FR')}</span>}
                                </td>
                                <td className="px-4 py-2 text-sm font-medium">
                                  <span className="text-green-600 hover:text-green-800">
                                    {l.numero}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-sm">{l.client?.raisonSociale || '-'}</td>
                                <td className="px-4 py-2 text-sm">{l.camion?.immatriculation || '-'}</td>
                                <td className="px-4 py-2 text-sm text-right">
                                  {dureeJours !== null ? `${dureeJours} j` : '-'}
                                </td>
                                <td className="px-4 py-2 text-sm text-right">
                                  {kmParcourus !== null ? (
                                    <span title={`Départ: ${l.kmDepart} km - Retour: ${l.kmRetour} km`}>
                                      {kmParcourus.toLocaleString()} km
                                    </span>
                                  ) : '-'}
                                </td>
                                <td className="px-4 py-2 text-sm text-right">
                                  {l.tarifJournalier ? formatCurrency(l.tarifJournalier) : '-'}
                                </td>
                                <td className="px-4 py-2">
                                  <span className={`px-2 py-1 text-xs rounded ${
                                    l.statut === 'LIVRE' || l.statut === 'FACTURE' ? 'bg-green-100 text-green-800' :
                                    l.statut === 'EN_COURS' ? 'bg-blue-100 text-blue-800' :
                                    l.statut === 'ANNULE' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {l.statut}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-sm text-right font-medium">
                                  {l.statut === 'EN_COURS' || l.statut === 'BROUILLON' ? (
                                    <span className="text-blue-600" title="Montant provisoire - location en cours">
                                      ~{formatCurrency(l.montantTotal || 0)}
                                      <span className="text-xs ml-1">*</span>
                                    </span>
                                  ) : (
                                    <span className="text-gray-900">{formatCurrency(l.montantTotal || 0)}</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 border-t">
                        <span className="text-blue-600">*</span> Montant provisoire (location en cours)
                      </div>
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
                    <div className="border rounded-lg overflow-hidden overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">N° Bon</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Camion</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Litres</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {historique.dotations.map((d: any) => (
                            <tr
                              key={d.id}
                              className="hover:bg-orange-50 cursor-pointer transition-colors"
                              onClick={() => setSelectedDotation(d)}
                            >
                              <td className="px-4 py-2 text-sm whitespace-nowrap">{new Date(d.dateDotation).toLocaleDateString('fr-FR')}</td>
                              <td className="px-4 py-2 text-sm font-medium">
                                <span className="text-orange-600 hover:text-orange-800">
                                  {d.numeroBon}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-sm">{d.camion?.immatriculation || '-'}</td>
                              <td className="px-4 py-2 text-sm text-right font-medium">{d.quantiteLitres} L</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Pannes signalées */}
                {historique.pannes && historique.pannes.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500"></span>
                      Pannes signalées ({historique.pannes.length})
                    </h3>
                    <div className="border rounded-lg overflow-hidden overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">N°</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Camion</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Priorité</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Statut</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Coût</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {historique.pannes.map((p: any) => (
                            <tr
                              key={p.id}
                              className="hover:bg-red-50 cursor-pointer transition-colors"
                              onClick={() => setSelectedPanne(p)}
                            >
                              <td className="px-4 py-2 text-sm whitespace-nowrap">{new Date(p.datePanne).toLocaleDateString('fr-FR')}</td>
                              <td className="px-4 py-2 text-sm font-medium">
                                <span className="text-red-600 hover:text-red-800">
                                  {p.numeroPanne}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-sm">{p.camion?.immatriculation || '-'}</td>
                              <td className="px-4 py-2 text-sm">
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-800 text-xs rounded">
                                  {p.typePanne}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-sm max-w-[200px] truncate" title={p.description}>
                                {p.description || '-'}
                              </td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-1 text-xs rounded ${
                                  p.priorite === 'URGENTE' ? 'bg-red-100 text-red-800' :
                                  p.priorite === 'HAUTE' ? 'bg-orange-100 text-orange-800' :
                                  p.priorite === 'NORMALE' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {p.priorite}
                                </span>
                              </td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-1 text-xs rounded ${
                                  p.statut === 'REPAREE' || p.statut === 'CLOTUREE' ? 'bg-green-100 text-green-800' :
                                  p.statut === 'EN_REPARATION' ? 'bg-blue-100 text-blue-800' :
                                  p.statut === 'EN_ATTENTE_PIECES' ? 'bg-purple-100 text-purple-800' :
                                  p.statut === 'EN_DIAGNOSTIC' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {p.statut.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-sm text-right">
                                {p.coutReel ? formatCurrency(p.coutReel) : p.coutEstime ? `~${formatCurrency(p.coutEstime)}` : '-'}
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
                    Aucun historique pour ce chauffeur
                  </div>
                )}

                {/* Documents du chauffeur */}
                <div className="border-t pt-6 mt-6">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Documents du chauffeur
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Permis de conduire, pièce d'identité, photo du chauffeur...
                  </p>
                  <FileUpload
                    entiteType="chauffeur"
                    entiteId={selectedChauffeur.id}
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
                    selectedTransport.statut === 'LIVRE' || selectedTransport.statut === 'FACTURE' ? 'bg-green-100 text-green-800' :
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
              {selectedTransport.camion && (
                <div className="mb-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
                  <h3 className="font-semibold text-blue-900 mb-2">Camion</h3>
                  <p className="text-lg">{selectedTransport.camion.immatriculation} {selectedTransport.camion.numeroInterne && `(${selectedTransport.camion.numeroInterne})`}</p>
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
                    selectedLocation.statut === 'LIVRE' || selectedLocation.statut === 'FACTURE' ? 'bg-green-100 text-green-800' :
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
              {selectedLocation.camion && (
                <div className="mb-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
                  <h3 className="font-semibold text-blue-900 mb-2">Camion</h3>
                  <p className="text-lg">{selectedLocation.camion.immatriculation} {selectedLocation.camion.numeroInterne && `(${selectedLocation.camion.numeroInterne})`}</p>
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
              {selectedDotation.camion && (
                <div className="mb-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
                  <h3 className="font-semibold text-blue-900 mb-2">Camion</h3>
                  <p className="text-lg">{selectedDotation.camion.immatriculation} {selectedDotation.camion.numeroInterne && `(${selectedDotation.camion.numeroInterne})`}</p>
                </div>
              )}
              {selectedDotation.cuve && (
                <div className="mb-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
                  <h3 className="font-semibold text-blue-900 mb-2">Cuve</h3>
                  <p className="text-lg">{selectedDotation.cuve.nom} <span className="text-sm text-gray-500">({selectedDotation.cuve.typeCarburant})</span></p>
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
                    selectedPanne.statut === 'EN_ATTENTE_PIECES' ? 'bg-purple-100 text-purple-800' :
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

              {selectedPanne.camion && (
                <div className="mb-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
                  <h3 className="font-semibold text-blue-900 mb-2">Camion concerné</h3>
                  <p className="text-lg">{selectedPanne.camion.immatriculation} {selectedPanne.camion.numeroInterne && `(${selectedPanne.camion.numeroInterne})`}</p>
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
