import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import locationService from '../services/location.service';
import camionsService from '../services/camions.service';
import chauffeursService from '../services/chauffeurs.service';
import { exportToCSV, printTable } from '../utils/export';
import { useToast } from '../components/ui/Toast';
import { SkeletonTable, EmptyState, Breadcrumb, Pagination } from '../components/ui';
import { useEscapeKey } from '../hooks/useKeyboardShortcuts';
import { useAuthStore } from '../stores/auth.store';

interface BonLocation {
  id: number;
  numero: string;
  clientId?: number;
  client?: any;
  camionId?: number;
  camion?: any;
  chauffeurId?: number;
  chauffeur?: any;
  dateDebut?: string;
  dateFinPrevue?: string;
  dateFinReelle?: string;
  typeTarif?: 'JOURNALIER' | 'MENSUEL';
  tarifJournalier?: number;
  tarifMensuel?: number;
  nbJoursLocation?: number;
  carburantInclus: boolean;
  litresCarburantInclus?: number;
  prixCarburantInclus?: number;
  supplementCarburant?: number;
  kmDepart?: number;
  kmRetour?: number;
  montantTotal?: number;
  statut: 'BROUILLON' | 'EN_COURS' | 'TERMINE' | 'ANNULE';
  notes?: string;
  createdAt: string;
}

const statutColors: Record<string, string> = {
  BROUILLON: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  EN_COURS: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  TERMINE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  ANNULE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const statutLabels: Record<string, string> = {
  BROUILLON: 'Brouillon',
  EN_COURS: 'En cours',
  TERMINE: 'Terminé',
  ANNULE: 'Annulé',
};

type SortField = 'numero' | 'client' | 'camion' | 'dateDebut' | 'montantTotal' | 'statut';
type SortOrder = 'asc' | 'desc';

export default function LocationPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { canViewFinancialData } = useAuthStore();
  const canSeeFinancial = canViewFinancialData('location');
  const [filterStatut, setFilterStatut] = useState<string>('');

  // Keyboard shortcuts - fermer modals avec Escape
  useEscapeKey(() => {
    if (confirmModal.show) {
      setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
    } else if (errorModal.show) {
      setErrorModal({ show: false, title: '', message: '' });
    } else if (showModal) {
      setShowModal(false);
      setEditingBon(null);
      resetForm();
    } else if (viewingBon) {
      setViewingBon(null);
    }
  });
  const [showModal, setShowModal] = useState(false);
  const [editingBon, setEditingBon] = useState<BonLocation | null>(null);
  const [viewingBon, setViewingBon] = useState<BonLocation | null>(null);

  // Search and Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('dateDebut');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

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

  // Error modal state
  const [errorModal, setErrorModal] = useState<{
    show: boolean;
    title: string;
    message: string;
  }>({ show: false, title: '', message: '' });

  const [formData, setFormData] = useState({
    clientId: undefined as number | undefined,
    camionId: undefined as number | undefined,
    chauffeurId: undefined as number | undefined,
    dateDebut: '',
    dateFinPrevue: '',
    typeTarif: 'JOURNALIER' as 'JOURNALIER' | 'MENSUEL',
    tarifJournalier: 0,
    tarifMensuel: 0,
    nbJoursLocation: 0,
    carburantInclus: false,
    litresCarburantInclus: 0,
    prixCarburantInclus: 0,
    kmDepart: 0,
    notes: '',
  });

  const { data: bons, isLoading } = useQuery({
    queryKey: ['location-bons', filterStatut],
    queryFn: () => locationService.getBons(filterStatut || undefined),
  });

  const { data: stats } = useQuery({
    queryKey: ['location-stats'],
    queryFn: locationService.getStats,
  });

  const { data: clients } = useQuery({
    queryKey: ['location-clients'],
    queryFn: locationService.getClients,
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
    mutationFn: locationService.createBon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-bons'] });
      queryClient.invalidateQueries({ queryKey: ['location-stats'] });
      setShowModal(false);
      resetForm();
      toast.success('Bon de location créé avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la création du bon');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BonLocation> }) =>
      locationService.updateBon(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-bons'] });
      setShowModal(false);
      setEditingBon(null);
      resetForm();
      toast.success('Bon de location modifié avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la modification du bon');
    },
  });

  const statutMutation = useMutation({
    mutationFn: ({ id, statut }: { id: number; statut: string }) =>
      locationService.updateStatut(id, statut),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['location-bons'] });
      queryClient.invalidateQueries({ queryKey: ['location-stats'] });
      queryClient.invalidateQueries({ queryKey: ['camions'] });
      queryClient.invalidateQueries({ queryKey: ['chauffeurs'] });
      toast.success(`Statut changé en "${statutLabels[variables.statut] || variables.statut}"`);
    },
    onError: () => {
      toast.error('Erreur lors du changement de statut');
    },
  });

  const resetForm = () => {
    setFormData({
      clientId: undefined,
      camionId: undefined,
      chauffeurId: undefined,
      dateDebut: '',
      dateFinPrevue: '',
      typeTarif: 'JOURNALIER',
      tarifJournalier: 0,
      tarifMensuel: 0,
      nbJoursLocation: 0,
      carburantInclus: false,
      litresCarburantInclus: 0,
      prixCarburantInclus: 0,
      kmDepart: 0,
      notes: '',
    });
  };

  const handleStatutChange = (bonId: number, newStatut: string, bonNumero: string) => {
    const statutLabel = statutLabels[newStatut] || newStatut;
    setConfirmModal({
      show: true,
      title: 'Confirmer le changement de statut',
      message: `Voulez-vous vraiment changer le statut du bon ${bonNumero} en "${statutLabel}" ?`,
      onConfirm: () => {
        statutMutation.mutate({ id: bonId, statut: newStatut });
        setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
      },
    });
  };

  // Imprimer un bon individuel
  const printBon = (bon: BonLocation) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Calcul de la durée de location
    const dateDebut = bon.dateDebut ? new Date(bon.dateDebut) : null;
    const dateFin = bon.dateFinReelle ? new Date(bon.dateFinReelle) : (bon.dateFinPrevue ? new Date(bon.dateFinPrevue) : null);
    const dureeJours = dateDebut && dateFin ? Math.ceil((dateFin.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0;

    // Calcul du kilométrage parcouru
    const kmParcourus = bon.kmRetour && bon.kmDepart ? bon.kmRetour - bon.kmDepart : 0;

    // Calcul du montant estimé si non défini
    const montantEstime = bon.montantTotal || (bon.tarifJournalier ? bon.tarifJournalier * dureeJours : 0);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bon de Location ${bon.numero}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 3px solid #3B82F6; padding-bottom: 15px; }
          .header h1 { color: #1A1A1A; margin: 0; font-size: 22px; }
          .header p { color: #666; margin: 5px 0; }
          .logo { font-size: 20px; font-weight: bold; color: #3B82F6; margin-bottom: 5px; }
          .bon-numero { font-size: 18px; font-family: monospace; color: #333; font-weight: bold; }
          .two-columns { display: flex; gap: 20px; margin-bottom: 15px; }
          .column { flex: 1; }
          .section { margin-bottom: 15px; background: #fafafa; border-radius: 8px; padding: 12px; }
          .section h3 { background: #3B82F6; color: white; padding: 8px 12px; margin: -12px -12px 12px -12px; border-radius: 8px 8px 0 0; font-size: 13px; }
          .row { display: flex; margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px dotted #e5e5e5; }
          .row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
          .label { font-weight: bold; width: 140px; color: #555; font-size: 11px; }
          .value { flex: 1; color: #1A1A1A; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; }
          .status-BROUILLON { background: #e5e7eb; color: #374151; }
          .status-EN_COURS { background: #dbeafe; color: #1e40af; }
          .status-TERMINE { background: #d1fae5; color: #065f46; }
          .status-ANNULE { background: #fee2e2; color: #991b1b; }
          .period-box { background: linear-gradient(90deg, #DBEAFE 0%, #BFDBFE 100%); padding: 15px; border-radius: 8px; text-align: center; margin: 10px 0; }
          .period-box .dates { display: flex; justify-content: space-around; align-items: center; }
          .period-box .date-block { text-align: center; }
          .period-box .date-label { font-size: 10px; color: #1E40AF; margin-bottom: 5px; }
          .period-box .date-value { font-size: 14px; font-weight: bold; color: #1E3A8A; }
          .period-box .arrow { font-size: 24px; color: #3B82F6; }
          .period-box .duration { margin-top: 10px; font-size: 12px; color: #1E40AF; font-weight: bold; background: white; display: inline-block; padding: 4px 12px; border-radius: 20px; }
          .financial-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .financial-table th, .financial-table td { padding: 8px; text-align: left; border-bottom: 1px solid #e5e5e5; }
          .financial-table th { background: #f5f5f5; font-size: 11px; color: #666; }
          .financial-table .amount { text-align: right; font-family: monospace; }
          .financial-table .total-row { background: #DBEAFE; font-weight: bold; font-size: 14px; }
          .km-box { display: flex; justify-content: space-around; background: #F3F4F6; padding: 12px; border-radius: 8px; margin: 10px 0; }
          .km-item { text-align: center; }
          .km-label { font-size: 10px; color: #6B7280; }
          .km-value { font-size: 16px; font-weight: bold; color: #1F2937; }
          .km-parcourus { color: #059669; }
          .fuel-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
          .fuel-included { background: #D1FAE5; color: #065F46; }
          .fuel-not-included { background: #FEE2E2; color: #991B1B; }
          .footer { margin-top: 30px; text-align: center; color: #999; font-size: 10px; border-top: 1px solid #ddd; padding-top: 15px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; }
          .signature-box { width: 200px; text-align: center; }
          .signature-line { border-top: 1px solid #333; margin-top: 50px; padding-top: 5px; font-size: 11px; }
          @media print {
            body { padding: 10px; }
            .section { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">ACL Platform</div>
          <h1>BON DE LOCATION</h1>
          <div class="bon-numero">N° ${bon.numero}</div>
          <p><span class="status status-${bon.statut}">${statutLabels[bon.statut]}</span></p>
        </div>

        <div class="two-columns">
          <div class="column">
            <div class="section">
              <h3>👤 Client</h3>
              <div class="row"><span class="label">Nom:</span><span class="value"><strong>${bon.client?.nom || bon.client?.raisonSociale || '-'}</strong></span></div>
              ${bon.client?.adresse ? `<div class="row"><span class="label">Adresse:</span><span class="value">${bon.client.adresse}</span></div>` : ''}
              ${bon.client?.telephone ? `<div class="row"><span class="label">Téléphone:</span><span class="value">${bon.client.telephone}</span></div>` : ''}
              ${bon.client?.email ? `<div class="row"><span class="label">Email:</span><span class="value">${bon.client.email}</span></div>` : ''}
            </div>

            <div class="section">
              <h3>🚛 Véhicule</h3>
              <div class="row"><span class="label">Immatriculation:</span><span class="value"><strong>${bon.camion?.immatriculation || '-'}</strong></span></div>
              ${bon.camion?.marque ? `<div class="row"><span class="label">Marque:</span><span class="value">${bon.camion.marque}</span></div>` : ''}
              ${bon.camion?.typeCamion ? `<div class="row"><span class="label">Type:</span><span class="value">${bon.camion.typeCamion}</span></div>` : ''}
            </div>
          </div>

          <div class="column">
            <div class="section">
              <h3>👨‍✈️ Chauffeur</h3>
              <div class="row"><span class="label">Nom complet:</span><span class="value"><strong>${bon.chauffeur ? `${bon.chauffeur.prenom} ${bon.chauffeur.nom}` : '-'}</strong></span></div>
              ${bon.chauffeur?.telephone ? `<div class="row"><span class="label">Téléphone:</span><span class="value">${bon.chauffeur.telephone}</span></div>` : ''}
              ${bon.chauffeur?.numeroPermis ? `<div class="row"><span class="label">N° Permis:</span><span class="value">${bon.chauffeur.numeroPermis}</span></div>` : ''}
            </div>

            <div class="section">
              <h3>⛽ Carburant</h3>
              <div class="row">
                <span class="label">Carburant inclus:</span>
                <span class="value">
                  <span class="fuel-badge ${bon.carburantInclus ? 'fuel-included' : 'fuel-not-included'}">
                    ${bon.carburantInclus ? 'OUI' : 'NON'}
                  </span>
                </span>
              </div>
              ${bon.carburantInclus && bon.litresCarburantInclus ? `
              <div class="row"><span class="label">Litres inclus:</span><span class="value">${bon.litresCarburantInclus} L</span></div>
              ` : ''}
              ${bon.supplementCarburant ? `
              <div class="row"><span class="label">Supplément carburant:</span><span class="value">${Number(bon.supplementCarburant).toLocaleString('fr-FR')} FCFA</span></div>
              ` : ''}
            </div>
          </div>
        </div>

        <div class="period-box">
          <div class="dates">
            <div class="date-block">
              <div class="date-label">DATE DÉBUT</div>
              <div class="date-value">📅 ${bon.dateDebut ? new Date(bon.dateDebut).toLocaleDateString('fr-FR') : '-'}</div>
            </div>
            <div class="arrow">➡️</div>
            <div class="date-block">
              <div class="date-label">${bon.dateFinReelle ? 'DATE FIN RÉELLE' : 'DATE FIN PRÉVUE'}</div>
              <div class="date-value">📅 ${bon.dateFinReelle ? new Date(bon.dateFinReelle).toLocaleDateString('fr-FR') : (bon.dateFinPrevue ? new Date(bon.dateFinPrevue).toLocaleDateString('fr-FR') : '-')}</div>
            </div>
          </div>
          ${dureeJours > 0 ? `<div class="duration">Durée: ${dureeJours} jour${dureeJours > 1 ? 's' : ''}</div>` : ''}
        </div>

        ${(bon.kmDepart || bon.kmRetour) ? `
        <div class="km-box">
          <div class="km-item">
            <div class="km-label">KM DÉPART</div>
            <div class="km-value">${bon.kmDepart ? Number(bon.kmDepart).toLocaleString('fr-FR') : '-'}</div>
          </div>
          <div class="km-item">
            <div class="km-label">KM RETOUR</div>
            <div class="km-value">${bon.kmRetour ? Number(bon.kmRetour).toLocaleString('fr-FR') : '-'}</div>
          </div>
          <div class="km-item">
            <div class="km-label">KM PARCOURUS</div>
            <div class="km-value km-parcourus">${kmParcourus > 0 ? Number(kmParcourus).toLocaleString('fr-FR') : '-'}</div>
          </div>
        </div>
        ` : ''}

        <div class="section">
          <h3>💰 Tarification</h3>
          <table class="financial-table">
            <thead>
              <tr>
                <th>Description</th>
                <th class="amount">Montant (FCFA)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Tarif journalier</td>
                <td class="amount">${bon.tarifJournalier ? Number(bon.tarifJournalier).toLocaleString('fr-FR') : '-'}</td>
              </tr>
              ${dureeJours > 0 ? `
              <tr>
                <td>Nombre de jours</td>
                <td class="amount">× ${dureeJours}</td>
              </tr>
              ` : ''}
              ${bon.supplementCarburant ? `
              <tr>
                <td>Supplément carburant</td>
                <td class="amount">+ ${Number(bon.supplementCarburant).toLocaleString('fr-FR')}</td>
              </tr>
              ` : ''}
              <tr class="total-row">
                <td>MONTANT TOTAL</td>
                <td class="amount">${Number(montantEstime).toLocaleString('fr-FR')} FCFA</td>
              </tr>
            </tbody>
          </table>
        </div>

        ${bon.notes ? `
        <div class="section">
          <h3>📝 Notes</h3>
          <p style="white-space: pre-wrap; margin: 0;">${bon.notes}</p>
        </div>
        ` : ''}

        <div class="signatures">
          <div class="signature-box">
            <div class="signature-line">Signature Chauffeur</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">Signature Client</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">Cachet Entreprise</div>
          </div>
        </div>

        <div class="footer">
          <p>Document généré le ${new Date().toLocaleString('fr-FR')} - ACL Platform</p>
          <p>Ce document fait foi de contrat de location et doit être conservé pour toute réclamation.</p>
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

  const handleEdit = (bon: BonLocation) => {
    // Vérifier si le bon est verrouillé (statut TERMINE ou ANNULE)
    const statutsVerrouilles = ['TERMINE', 'ANNULE'];
    if (statutsVerrouilles.includes(bon.statut)) {
      setErrorModal({
        show: true,
        title: 'Modification impossible',
        message: `Ce bon de location est "${statutLabels[bon.statut]}". Les bons terminés ou annulés ne peuvent plus être modifiés.`,
      });
      return;
    }

    setEditingBon(bon);
    setFormData({
      clientId: bon.clientId,
      camionId: bon.camionId,
      chauffeurId: bon.chauffeurId,
      dateDebut: bon.dateDebut ? bon.dateDebut.split('T')[0] : '',
      dateFinPrevue: bon.dateFinPrevue ? bon.dateFinPrevue.split('T')[0] : '',
      typeTarif: bon.typeTarif || 'JOURNALIER',
      tarifJournalier: bon.tarifJournalier || 0,
      tarifMensuel: bon.tarifMensuel || 0,
      nbJoursLocation: bon.nbJoursLocation || 0,
      carburantInclus: bon.carburantInclus,
      litresCarburantInclus: bon.litresCarburantInclus || 0,
      prixCarburantInclus: bon.prixCarburantInclus || 0,
      kmDepart: bon.kmDepart || 0,
      notes: bon.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBon) {
      // Show confirmation for edits
      setConfirmModal({
        show: true,
        title: 'Confirmer la modification',
        message: `Voulez-vous vraiment modifier le bon de location ${editingBon.numero} ?`,
        onConfirm: () => {
          updateMutation.mutate({ id: editingBon.id, data: formData });
          setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
        },
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Filter camions and chauffeurs based on context
  // En édition: afficher tous (sauf hors service/indisponible) pour pouvoir corriger l'assignation
  // En création: seulement les disponibles
  const camionsDisponibles = camions?.filter(c => {
    if (editingBon) return c.statut !== 'HORS_SERVICE';
    return c.statut === 'DISPONIBLE';
  });
  const chauffeursDisponibles = chauffeurs?.filter(c => {
    if (editingBon) return c.statut !== 'INDISPONIBLE';
    return c.statut === 'DISPONIBLE';
  }) || [];

  // Filter and sort bons
  const filteredAndSortedBons = bons
    ?.filter(bon => {
      // Filter by status first
      if (filterStatut && bon.statut !== filterStatut) return false;

      // Then filter by search query
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        bon.numero?.toLowerCase().includes(query) ||
        bon.client?.nom?.toLowerCase().includes(query) ||
        bon.camion?.immatriculation?.toLowerCase().includes(query) ||
        bon.chauffeur?.nom?.toLowerCase().includes(query) ||
        bon.chauffeur?.prenom?.toLowerCase().includes(query) ||
        statutLabels[bon.statut]?.toLowerCase().includes(query)
      );
    })
    ?.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortField) {
        case 'numero':
          aVal = a.numero || '';
          bVal = b.numero || '';
          break;
        case 'client':
          aVal = a.client?.nom || '';
          bVal = b.client?.nom || '';
          break;
        case 'camion':
          aVal = a.camion?.immatriculation || '';
          bVal = b.camion?.immatriculation || '';
          break;
        case 'dateDebut':
          aVal = a.dateDebut ? new Date(a.dateDebut).getTime() : 0;
          bVal = b.dateDebut ? new Date(b.dateDebut).getTime() : 0;
          break;
        case 'montantTotal':
          aVal = a.montantTotal || 0;
          bVal = b.montantTotal || 0;
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
  const totalItems = filteredAndSortedBons.length;
  const paginatedBons = filteredAndSortedBons.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatut, sortField, sortOrder]);

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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bons de Location</h1>
            <p className="text-gray-600 dark:text-gray-400">Gestion des locations de véhicules</p>
          </div>
        </div>
        <SkeletonTable rows={8} columns={8} />
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb />
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bons de Location</h1>
          <p className="text-gray-600 dark:text-gray-400">Gestion des locations de véhicules</p>
        </div>
        <button
          onClick={() => {
            setEditingBon(null);
            resetForm();
            setShowModal(true);
          }}
          className="bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-yellow-400 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau bon
        </button>
      </div>

      {/* Stats - Clickable filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div
          onClick={() => setFilterStatut('')}
          className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${
            filterStatut === '' ? 'ring-2 ring-gray-400 bg-gray-50 dark:bg-gray-700' : ''
          }`}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.total || 0}</p>
        </div>
        <div
          onClick={() => setFilterStatut(filterStatut === 'EN_COURS' ? '' : 'EN_COURS')}
          className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${
            filterStatut === 'EN_COURS' ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30' : ''
          }`}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">En cours</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats?.enCours || 0}</p>
        </div>
        <div
          onClick={() => setFilterStatut(filterStatut === 'TERMINE' ? '' : 'TERMINE')}
          className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${
            filterStatut === 'TERMINE' ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/30' : ''
          }`}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">Terminés</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats?.termines || 0}</p>
        </div>
        <div
          onClick={() => setFilterStatut(filterStatut === 'BROUILLON' ? '' : 'BROUILLON')}
          className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${
            filterStatut === 'BROUILLON' ? 'ring-2 ring-gray-500 bg-gray-100 dark:bg-gray-700' : ''
          }`}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">Brouillons</p>
          <p className="text-2xl font-bold text-gray-500 dark:text-gray-300">{stats?.brouillons || 0}</p>
        </div>
        {canSeeFinancial && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border-l-4 border-yellow-500">
            <p className="text-sm text-gray-600 dark:text-gray-400">Revenu Total</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {Number(stats?.totalRevenu || 0).toLocaleString('fr-FR')} F
            </p>
          </div>
        )}
      </div>

      {/* Active filter indicator */}
      {filterStatut && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Filtre actif:</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statutColors[filterStatut]}`}>
            {statutLabels[filterStatut]}
          </span>
          <button
            onClick={() => setFilterStatut('')}
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
              placeholder="Rechercher (n°, client, camion...)"
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
              if (!filteredAndSortedBons || filteredAndSortedBons.length === 0) return;
              exportToCSV(
                filteredAndSortedBons.map(b => ({
                  numero: b.numero,
                  client: b.client?.nom || '-',
                  camion: b.camion?.immatriculation || '-',
                  chauffeur: b.chauffeur ? `${b.chauffeur.prenom} ${b.chauffeur.nom}` : '-',
                  dateDebut: b.dateDebut ? new Date(b.dateDebut).toLocaleDateString('fr-FR') : '-',
                  dateFinPrevue: b.dateFinPrevue ? new Date(b.dateFinPrevue).toLocaleDateString('fr-FR') : '-',
                  tarifJournalier: b.tarifJournalier || 0,
                  montantTotal: b.montantTotal || 0,
                  statut: statutLabels[b.statut] || b.statut,
                })),
                'bons_location',
                [
                  { key: 'numero', label: 'N° Bon' },
                  { key: 'client', label: 'Client' },
                  { key: 'camion', label: 'Camion' },
                  { key: 'chauffeur', label: 'Chauffeur' },
                  { key: 'dateDebut', label: 'Date Début' },
                  { key: 'dateFinPrevue', label: 'Date Fin Prévue' },
                  { key: 'tarifJournalier', label: 'Tarif/Jour (FCFA)' },
                  { key: 'montantTotal', label: 'Montant Total (FCFA)' },
                  { key: 'statut', label: 'Statut' },
                ]
              );
            }}
            disabled={!filteredAndSortedBons || filteredAndSortedBons.length === 0}
            className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exporter CSV ({filteredAndSortedBons?.length || 0})
          </button>
          <button
            onClick={() => {
              if (!filteredAndSortedBons || filteredAndSortedBons.length === 0) return;
              printTable(
                'Bons de Location',
                ['N° Bon', 'Client', 'Camion', 'Période', 'Montant', 'Statut'],
                filteredAndSortedBons.map(b => [
                  b.numero,
                  b.client?.nom || '-',
                  b.camion?.immatriculation || '-',
                  `${b.dateDebut ? new Date(b.dateDebut).toLocaleDateString('fr-FR') : '-'} - ${b.dateFinPrevue ? new Date(b.dateFinPrevue).toLocaleDateString('fr-FR') : '-'}`,
                  b.montantTotal ? `${Number(b.montantTotal).toLocaleString()} FCFA` : '-',
                  statutLabels[b.statut] || b.statut,
                ])
              );
            }}
            disabled={!filteredAndSortedBons || filteredAndSortedBons.length === 0}
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
            {filteredAndSortedBons.length} résultat(s) trouvé(s)
          </div>
        )}
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th
                onClick={() => handleSort('numero')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                N° Bon <SortIcon field="numero" />
              </th>
              <th
                onClick={() => handleSort('client')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Client <SortIcon field="client" />
              </th>
              <th
                onClick={() => handleSort('camion')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Camion <SortIcon field="camion" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Chauffeur</th>
              <th
                onClick={() => handleSort('dateDebut')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Période <SortIcon field="dateDebut" />
              </th>
              {canSeeFinancial && (
                <th
                  onClick={() => handleSort('montantTotal')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Montant <SortIcon field="montantTotal" />
                </th>
              )}
              <th
                onClick={() => handleSort('statut')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Statut <SortIcon field="statut" />
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedBons.map((bon) => (
              <tr
                key={bon.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => setViewingBon(bon)}
              >
                <td className="px-6 py-4 font-mono text-sm text-gray-900 dark:text-gray-100">{bon.numero}</td>
                <td className="px-6 py-4 text-gray-900 dark:text-gray-100">{bon.client?.nom || '-'}</td>
                <td className="px-6 py-4 text-gray-900 dark:text-gray-100">{bon.camion?.immatriculation || '-'}</td>
                <td className="px-6 py-4">
                  <div className="text-gray-600 dark:text-gray-300">
                    {bon.chauffeur ? `${bon.chauffeur.nom} ${bon.chauffeur.prenom}` : '-'}
                  </div>
                  {bon.chauffeur?.telephone && (
                    <div className="text-xs text-gray-400 dark:text-gray-500">{bon.chauffeur.telephone}</div>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-600 dark:text-gray-300 text-sm">
                  {bon.dateDebut && (
                    <div>
                      {new Date(bon.dateDebut).toLocaleDateString('fr-FR')}
                      {bon.dateFinPrevue && (
                        <span className="text-gray-400 dark:text-gray-500">
                          {' → '}{new Date(bon.dateFinPrevue).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  )}
                </td>
                {canSeeFinancial && (
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                    {bon.montantTotal ? `${Number(bon.montantTotal).toLocaleString('fr-FR')} F` : '-'}
                  </td>
                )}
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statutColors[bon.statut]}`}>
                    {statutLabels[bon.statut]}
                  </span>
                </td>
                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-2 items-center">
                    <button
                      onClick={() => printBon(bon)}
                      className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                      title="Imprimer ce bon"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                    </button>
                    {bon.statut === 'BROUILLON' && (
                      <>
                        <button
                          onClick={() => handleEdit(bon)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleStatutChange(bon.id, 'EN_COURS', bon.numero)}
                          className="text-green-600 hover:text-green-800 text-sm"
                        >
                          Démarrer
                        </button>
                      </>
                    )}
                    {bon.statut === 'EN_COURS' && (
                      <button
                        onClick={() => handleStatutChange(bon.id, 'TERMINE', bon.numero)}
                        className="text-green-600 hover:text-green-800 text-sm"
                      >
                        Terminer
                      </button>
                    )}
                    {(bon.statut === 'BROUILLON' || bon.statut === 'EN_COURS') && (
                      <button
                        onClick={() => handleStatutChange(bon.id, 'ANNULE', bon.numero)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Annuler
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredAndSortedBons.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12">
                  <EmptyState
                    icon={searchQuery ? 'search' : 'document'}
                    title={
                      searchQuery
                        ? 'Aucun résultat'
                        : filterStatut
                        ? 'Aucun bon trouvé'
                        : 'Aucun bon de location'
                    }
                    description={
                      searchQuery
                        ? `Aucun bon de location trouvé pour "${searchQuery}"`
                        : filterStatut
                        ? `Aucun bon de location avec le statut "${statutLabels[filterStatut]}"`
                        : 'Commencez par créer votre premier bon de location'
                    }
                    actionLabel={!searchQuery && !filterStatut ? 'Nouveau bon' : undefined}
                    onAction={!searchQuery && !filterStatut ? () => {
                      setEditingBon(null);
                      resetForm();
                      setShowModal(true);
                    } : undefined}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {filteredAndSortedBons.length > 0 && (
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingBon ? 'Modifier le bon de location' : 'Nouveau bon de location'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client</label>
                  <select
                    value={formData.clientId || ''}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="">-- Sélectionner --</option>
                    {clients?.map((c) => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Camion *</label>
                  <select
                    value={formData.camionId || ''}
                    onChange={(e) => setFormData({ ...formData, camionId: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                  >
                    <option value="">-- Sélectionner --</option>
                    {camionsDisponibles?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.immatriculation} - {c.typeCamion}
                        {c.statut !== 'DISPONIBLE' ? ` (${c.statut})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chauffeur</label>
                  <select
                    value={formData.chauffeurId || ''}
                    onChange={(e) => setFormData({ ...formData, chauffeurId: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="">-- Sans chauffeur --</option>
                    {chauffeursDisponibles?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom} {c.prenom}
                        {c.statut !== 'DISPONIBLE' ? ` (${c.statut})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {canSeeFinancial && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type de tarif *</label>
                      <select
                        value={formData.typeTarif}
                        onChange={(e) => setFormData({ ...formData, typeTarif: e.target.value as 'JOURNALIER' | 'MENSUEL' })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      >
                        <option value="JOURNALIER">Journalier</option>
                        <option value="MENSUEL">Mensuel</option>
                      </select>
                    </div>
                    {formData.typeTarif === 'JOURNALIER' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tarif journalier (FCFA) *</label>
                        <input
                          type="number"
                          value={formData.tarifJournalier}
                          onChange={(e) => setFormData({ ...formData, tarifJournalier: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                          required={canSeeFinancial}
                          min="0"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tarif mensuel (FCFA) *</label>
                        <input
                          type="number"
                          value={formData.tarifMensuel}
                          onChange={(e) => setFormData({ ...formData, tarifMensuel: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                          required={canSeeFinancial}
                          min="0"
                        />
                      </div>
                    )}
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date début *</label>
                  <input
                    type="date"
                    value={formData.dateDebut}
                    onChange={(e) => setFormData({ ...formData, dateDebut: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date fin prévue *</label>
                  <input
                    type="date"
                    value={formData.dateFinPrevue}
                    onChange={(e) => setFormData({ ...formData, dateFinPrevue: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de jours de location</label>
                  <input
                    type="number"
                    value={formData.nbJoursLocation}
                    onChange={(e) => setFormData({ ...formData, nbJoursLocation: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    min="0"
                    placeholder="Saisie manuelle du nombre de jours"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kilométrage départ</label>
                  <input
                    type="number"
                    value={formData.kmDepart}
                    onChange={(e) => setFormData({ ...formData, kmDepart: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    min="0"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.carburantInclus}
                      onChange={(e) => setFormData({ ...formData, carburantInclus: e.target.checked })}
                      className="w-4 h-4 text-yellow-500 border-gray-300 rounded focus:ring-yellow-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Carburant inclus</span>
                  </label>
                </div>
                {formData.carburantInclus && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Litres inclus</label>
                      <input
                        type="number"
                        value={formData.litresCarburantInclus}
                        onChange={(e) => setFormData({ ...formData, litresCarburantInclus: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        min="0"
                      />
                    </div>
                    {canSeeFinancial && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prix carburant inclus (FCFA)</label>
                        <input
                          type="number"
                          value={formData.prixCarburantInclus}
                          onChange={(e) => setFormData({ ...formData, prixCarburantInclus: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                          min="0"
                          placeholder="Valeur du carburant inclus"
                        />
                      </div>
                    )}
                  </>
                )}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingBon(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
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

      {/* Detail Modal */}
      {viewingBon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bon de Location</h2>
                <p className="text-lg font-mono text-yellow-600 dark:text-yellow-400">{viewingBon.numero}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statutColors[viewingBon.statut]}`}>
                  {statutLabels[viewingBon.statut]}
                </span>
                <button
                  onClick={() => setViewingBon(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Client et Dates */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Informations générales</h3>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Client</label>
                  <p className="text-gray-900 dark:text-gray-100">{viewingBon.client?.nom || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Date de création</label>
                  <p className="text-gray-900 dark:text-gray-100">{new Date(viewingBon.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>

              {/* Période */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Période de location</h3>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Date de début</label>
                  <p className="text-gray-900 dark:text-gray-100">{viewingBon.dateDebut ? new Date(viewingBon.dateDebut).toLocaleDateString('fr-FR') : '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Date de fin prévue</label>
                  <p className="text-gray-900 dark:text-gray-100">{viewingBon.dateFinPrevue ? new Date(viewingBon.dateFinPrevue).toLocaleDateString('fr-FR') : '-'}</p>
                </div>
                {viewingBon.dateFinReelle && (
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Date de fin réelle</label>
                    <p className="text-gray-900 dark:text-gray-100">{new Date(viewingBon.dateFinReelle).toLocaleDateString('fr-FR')}</p>
                  </div>
                )}
              </div>

              {/* Véhicule et chauffeur */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Véhicule & Chauffeur</h3>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Camion</label>
                  <p className="text-gray-900 dark:text-gray-100">{viewingBon.camion?.immatriculation || '-'}</p>
                  {viewingBon.camion?.typeCamion && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{viewingBon.camion.typeCamion}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Chauffeur</label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {viewingBon.chauffeur ? `${viewingBon.chauffeur.prenom} ${viewingBon.chauffeur.nom}` : 'Sans chauffeur'}
                  </p>
                  {viewingBon.chauffeur?.telephone && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{viewingBon.chauffeur.telephone}</p>
                  )}
                </div>
              </div>

              {/* Kilométrage */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Kilométrage</h3>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Km départ</label>
                  <p className="text-gray-900 dark:text-gray-100">{viewingBon.kmDepart ? `${Number(viewingBon.kmDepart).toLocaleString('fr-FR')} km` : '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Km retour</label>
                  <p className="text-gray-900 dark:text-gray-100">{viewingBon.kmRetour ? `${Number(viewingBon.kmRetour).toLocaleString('fr-FR')} km` : '-'}</p>
                </div>
                {viewingBon.kmDepart && viewingBon.kmRetour && (
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Distance parcourue</label>
                    <p className="text-gray-900 font-medium">{Number(viewingBon.kmRetour - viewingBon.kmDepart).toLocaleString('fr-FR')} km</p>
                  </div>
                )}
              </div>

              {/* Carburant */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Carburant</h3>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Carburant inclus</label>
                  <p className="text-gray-900 dark:text-gray-100">{viewingBon.carburantInclus ? 'Oui' : 'Non'}</p>
                </div>
                {viewingBon.carburantInclus && viewingBon.litresCarburantInclus && (
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Litres inclus</label>
                    <p className="text-gray-900 dark:text-gray-100">{viewingBon.litresCarburantInclus} L</p>
                  </div>
                )}
                {viewingBon.supplementCarburant && (
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Supplément carburant</label>
                    <p className="text-gray-900 dark:text-gray-100">{Number(viewingBon.supplementCarburant).toLocaleString('fr-FR')} FCFA</p>
                  </div>
                )}
              </div>

              {/* Facturation - Only visible for users with financial permission */}
              {canSeeFinancial && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Facturation</h3>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Tarif journalier</label>
                    <p className="text-gray-900 dark:text-gray-100">{viewingBon.tarifJournalier ? `${Number(viewingBon.tarifJournalier).toLocaleString('fr-FR')} FCFA/jour` : '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Montant total</label>
                    <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                      {viewingBon.montantTotal ? `${Number(viewingBon.montantTotal).toLocaleString('fr-FR')} FCFA` : '-'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            {viewingBon.notes && (
              <div className="mt-6 pt-4 border-t dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Notes</h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{viewingBon.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t dark:border-gray-700">
              <button
                onClick={() => setViewingBon(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Fermer
              </button>
              {viewingBon.statut === 'BROUILLON' && (
                <button
                  onClick={() => {
                    setViewingBon(null);
                    handleEdit(viewingBon);
                  }}
                  className="px-4 py-2 bg-yellow-500 text-gray-900 rounded-lg font-medium hover:bg-yellow-400"
                >
                  Modifier
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{confirmModal.title}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} })}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
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

      {/* Error Modal */}
      {errorModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{errorModal.title}</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{errorModal.message}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setErrorModal({ show: false, title: '', message: '' })}
                className="px-4 py-2 text-white bg-gray-600 rounded-lg hover:bg-gray-700"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
