import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import transportService from '../services/transport.service';
import camionsService from '../services/camions.service';
import chauffeursService from '../services/chauffeurs.service';
import carburantService from '../services/carburant.service';
import { exportToCSV, printTable } from '../utils/export';
import { useToast } from '../components/ui/Toast';
import { SkeletonTable, Breadcrumb, Pagination } from '../components/ui';
import { useEscapeKey } from '../hooks/useKeyboardShortcuts';
import { useAuthStore } from '../stores/auth.store';

interface BonTransport {
  id: number;
  numero: string;
  dateCreation: string;
  clientId?: number;
  client?: any;
  camionId?: number;
  camion?: any;
  chauffeurId?: number;
  chauffeur?: any;
  natureChargement?: string;
  lieuChargement?: string;
  lieuDechargement?: string;
  dateLivraison?: string;
  montantHt?: number;
  tonnage?: number;
  prixTonne?: number;
  // Frais de route et dépenses
  fraisRoute?: number;
  fraisDepannage?: number;
  fraisAutres?: number;
  fraisAutresDescription?: string;
  statut: 'BROUILLON' | 'EN_COURS' | 'LIVRE' | 'TERMINE' | 'ANNULE' | 'FACTURE';
  notes?: string;
}

interface CreateBonDto {
  clientId?: number;
  camionId?: number;
  chauffeurId?: number;
  natureChargement?: string;
  lieuChargement?: string;
  lieuDechargement?: string;
  dateChargement?: string;
  poidsKg?: number;
  montantHt?: number;
  tonnage?: number;
  prixTonne?: number;
  // Frais de route et dépenses
  fraisRoute?: number;
  fraisDepannage?: number;
  fraisAutres?: number;
  fraisAutresDescription?: string;
  notes?: string;
}

const naturesChargement = [
  'CONTENEUR_20', 'CONTENEUR_40', 'CONTENEUR_40_HC', 'CONTENEUR_2X20', 'VRAC',
  'PALETTE', 'COLIS', 'VEHICULE', 'MATERIEL_BTP', 'ENGIN', 'PORTE_ENGIN', 'AUTRE'
];

const statutColors: Record<string, string> = {
  BROUILLON: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  EN_COURS: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  LIVRE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  ANNULE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  FACTURE: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

const statutLabels: Record<string, string> = {
  BROUILLON: 'Brouillon',
  EN_COURS: 'En cours',
  LIVRE: 'Livré',
  ANNULE: 'Annulé',
  FACTURE: 'Facturé',
};

type SortField = 'numero' | 'dateCreation' | 'camion' | 'trajet' | 'montant' | 'statut';
type SortOrder = 'asc' | 'desc';

export default function TransportPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { canViewFinancialData } = useAuthStore();
  const canSeeFinancial = canViewFinancialData('transport');
  const [searchParams, setSearchParams] = useSearchParams();
  const [showModal, setShowModal] = useState(false);

  // Handle URL params for actions and filters
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setShowModal(true);
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
    const statutParam = searchParams.get('statut');
    if (statutParam) {
      setStatusFilter(statutParam);
      searchParams.delete('statut');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const [editingBon, setEditingBon] = useState<BonTransport | null>(null);
  const [viewingBon, setViewingBon] = useState<BonTransport | null>(null);
  const [formData, setFormData] = useState<CreateBonDto>({
    camionId: undefined,
    chauffeurId: undefined,
    natureChargement: 'VRAC',
    lieuChargement: '',
    lieuDechargement: '',
    montantHt: undefined,
    fraisRoute: undefined,
    fraisDepannage: undefined,
    fraisAutres: undefined,
    fraisAutresDescription: '',
    notes: '',
  });

  // Search, Sort and Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('dateCreation');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
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

  // Error modal state
  const [errorModal, setErrorModal] = useState<{
    show: boolean;
    title: string;
    message: string;
  }>({ show: false, title: '', message: '' });

  const { data: bons, isLoading } = useQuery({
    queryKey: ['transport-bons'],
    queryFn: transportService.getBons,
  });

  const { data: camions } = useQuery({
    queryKey: ['camions'],
    queryFn: camionsService.getAll,
  });

  const { data: chauffeurs } = useQuery({
    queryKey: ['chauffeurs'],
    queryFn: chauffeursService.getAll,
  });

  const { data: cuves } = useQuery({
    queryKey: ['cuves'],
    queryFn: carburantService.getCuves,
  });

  const { data: stationsPartenaires } = useQuery({
    queryKey: ['stations-partenaires'],
    queryFn: carburantService.getStationsPartenaires,
  });

  // State for optional fuel allocation when creating transport voucher
  const [includeDotation, setIncludeDotation] = useState(false);
  const [dotationData, setDotationData] = useState({
    typeSource: 'CUVE_INTERNE' as 'CUVE_INTERNE' | 'STATION_EXTERNE',
    cuveId: undefined as number | undefined,
    stationPartenaireId: undefined as number | undefined,
    stationNom: '',
    quantiteLitres: 0,
    prixUnitaire: undefined as number | undefined,
    dateDotation: new Date().toISOString().split('T')[0],
  });

  const createDotationMutation = useMutation({
    mutationFn: carburantService.createDotation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dotations'] });
      queryClient.invalidateQueries({ queryKey: ['cuves'] });
      toast.success('Dotation carburant créée');
    },
    onError: (error: any) => {
      console.error('Erreur création dotation:', error);
      toast.error(error?.response?.data?.message || 'Erreur lors de la création de la dotation');
    },
  });

  const createMutation = useMutation({
    mutationFn: transportService.createBon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-bons'] });
      queryClient.invalidateQueries({ queryKey: ['transport-stats'] });
      toast.success('Bon de transport créé avec succès');
      closeModal();
    },
    onError: () => {
      toast.error('Erreur lors de la création du bon');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateBonDto> }) =>
      transportService.updateBon(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-bons'] });
      toast.success('Bon de transport modifié avec succès');
      closeModal();
    },
    onError: () => {
      toast.error('Erreur lors de la modification du bon');
    },
  });

  const updateStatutMutation = useMutation({
    mutationFn: ({ id, statut }: { id: number; statut: string }) =>
      transportService.updateStatut(id, statut),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-bons'] });
      queryClient.invalidateQueries({ queryKey: ['transport-stats'] });
      toast.success('Statut mis à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour du statut');
    },
  });

  const openCreateModal = () => {
    setEditingBon(null);
    setFormData({
      camionId: undefined,
      chauffeurId: undefined,
      natureChargement: 'VRAC',
      lieuChargement: '',
      lieuDechargement: '',
      montantHt: undefined,
      tonnage: undefined,
      prixTonne: undefined,
      fraisRoute: undefined,
      fraisDepannage: undefined,
      fraisAutres: undefined,
      fraisAutresDescription: '',
      notes: '',
    });
    // Reset dotation data
    setIncludeDotation(false);
    setDotationData({
      typeSource: 'CUVE_INTERNE',
      cuveId: undefined,
      stationPartenaireId: undefined,
      stationNom: '',
      quantiteLitres: 0,
      prixUnitaire: undefined,
      dateDotation: new Date().toISOString().split('T')[0],
    });
    setShowModal(true);
  };

  const openEditModal = (bon: BonTransport) => {
    // Vérifier si le bon est verrouillé (statut LIVRE, ANNULE ou FACTURE)
    const statutsVerrouilles = ['LIVRE', 'ANNULE', 'FACTURE'];
    if (statutsVerrouilles.includes(bon.statut)) {
      setErrorModal({
        show: true,
        title: 'Modification impossible',
        message: `Ce bon de transport est "${statutLabels[bon.statut]}". Les bons livrés, annulés ou facturés ne peuvent plus être modifiés.`,
      });
      return;
    }

    setEditingBon(bon);
    setFormData({
      camionId: bon.camionId,
      chauffeurId: bon.chauffeurId,
      natureChargement: bon.natureChargement,
      lieuChargement: bon.lieuChargement || '',
      lieuDechargement: bon.lieuDechargement || '',
      montantHt: bon.montantHt,
      tonnage: bon.tonnage,
      prixTonne: bon.prixTonne,
      fraisRoute: bon.fraisRoute,
      fraisDepannage: bon.fraisDepannage,
      fraisAutres: bon.fraisAutres,
      fraisAutresDescription: bon.fraisAutresDescription || '',
      notes: bon.notes || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBon(null);
  };

  // Keyboard shortcuts - fermer modals avec Escape
  useEscapeKey(() => {
    if (confirmModal.show) {
      setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
    } else if (errorModal.show) {
      setErrorModal({ show: false, title: '', message: '' });
    } else if (viewingBon) {
      setViewingBon(null);
    } else if (showModal) {
      closeModal();
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBon) {
      // Show confirmation for edits
      setConfirmModal({
        show: true,
        title: 'Confirmer la modification',
        message: `Voulez-vous vraiment modifier le bon de transport ${editingBon.numero} ?`,
        onConfirm: () => {
          updateMutation.mutate({ id: editingBon.id, data: formData });
          setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
        },
      });
    } else {
      // Create transport voucher
      createMutation.mutate(formData, {
        onSuccess: () => {
          // If fuel allocation is included, create it after the transport voucher
          if (includeDotation && formData.camionId && dotationData.quantiteLitres > 0) {
            createDotationMutation.mutate({
              camionId: formData.camionId,
              chauffeurId: formData.chauffeurId,
              typeSource: dotationData.typeSource,
              cuveId: dotationData.typeSource === 'CUVE_INTERNE' ? dotationData.cuveId : undefined,
              stationPartenaireId: dotationData.typeSource === 'STATION_EXTERNE' ? dotationData.stationPartenaireId : undefined,
              stationNom: dotationData.typeSource === 'STATION_EXTERNE' ? dotationData.stationNom : undefined,
              quantiteLitres: dotationData.quantiteLitres,
              prixUnitaire: dotationData.prixUnitaire,
              dateDotation: dotationData.dateDotation,
            });
          }
        },
      });
    }
  };

  const handleStatutChange = (bonId: number, newStatut: string, bonNumero: string) => {
    const statutLabel = statutLabels[newStatut] || newStatut;
    setConfirmModal({
      show: true,
      title: 'Confirmer le changement de statut',
      message: `Voulez-vous vraiment changer le statut du bon ${bonNumero} en "${statutLabel}" ?`,
      onConfirm: () => {
        updateStatutMutation.mutate({ id: bonId, statut: newStatut });
        setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
      },
    });
  };

  // Imprimer un bon individuel
  const printBon = (bon: BonTransport) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Calcul du total des frais
    const totalFrais = (Number(bon.fraisRoute) || 0) + (Number(bon.fraisDepannage) || 0) + (Number(bon.fraisAutres) || 0);

    // Calcul du net (montant - frais)
    const montantNet = (Number(bon.montantHt) || 0) - totalFrais;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bon de Transport ${bon.numero}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 3px solid #F5B800; padding-bottom: 15px; }
          .header h1 { color: #1A1A1A; margin: 0; font-size: 22px; }
          .header p { color: #666; margin: 5px 0; }
          .logo { font-size: 20px; font-weight: bold; color: #F5B800; margin-bottom: 5px; }
          .bon-numero { font-size: 18px; font-family: monospace; color: #333; font-weight: bold; }
          .two-columns { display: flex; gap: 20px; margin-bottom: 15px; }
          .column { flex: 1; }
          .section { margin-bottom: 15px; background: #fafafa; border-radius: 8px; padding: 12px; }
          .section h3 { background: #F5B800; color: #1A1A1A; padding: 8px 12px; margin: -12px -12px 12px -12px; border-radius: 8px 8px 0 0; font-size: 13px; }
          .row { display: flex; margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px dotted #e5e5e5; }
          .row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
          .label { font-weight: bold; width: 140px; color: #555; font-size: 11px; }
          .value { flex: 1; color: #1A1A1A; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; }
          .status-BROUILLON { background: #e5e7eb; color: #374151; }
          .status-EN_COURS { background: #dbeafe; color: #1e40af; }
          .status-LIVRE { background: #d1fae5; color: #065f46; }
          .status-ANNULE { background: #fee2e2; color: #991b1b; }
          .status-FACTURE { background: #ede9fe; color: #5b21b6; }
          .financial-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .financial-table th, .financial-table td { padding: 8px; text-align: left; border-bottom: 1px solid #e5e5e5; }
          .financial-table th { background: #f5f5f5; font-size: 11px; color: #666; }
          .financial-table .amount { text-align: right; font-family: monospace; }
          .financial-table .total-row { background: #FEF3C7; font-weight: bold; }
          .financial-table .net-row { background: #D1FAE5; font-weight: bold; font-size: 14px; }
          .trajet-box { background: linear-gradient(90deg, #FEF3C7 0%, #FDE68A 100%); padding: 15px; border-radius: 8px; text-align: center; margin: 10px 0; }
          .trajet-box .from, .trajet-box .to { font-size: 14px; font-weight: bold; }
          .trajet-box .arrow { font-size: 20px; margin: 5px 0; color: #F59E0B; }
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
          <h1>BON DE TRANSPORT</h1>
          <div class="bon-numero">N° ${bon.numero}</div>
          <p><span class="status status-${bon.statut}">${statutLabels[bon.statut]}</span></p>
        </div>

        <div class="two-columns">
          <div class="column">
            <div class="section">
              <h3>📋 Informations générales</h3>
              <div class="row"><span class="label">Date de création:</span><span class="value">${new Date(bon.dateCreation).toLocaleDateString('fr-FR')}</span></div>
              ${bon.dateLivraison ? `<div class="row"><span class="label">Date de livraison:</span><span class="value">${new Date(bon.dateLivraison).toLocaleDateString('fr-FR')}</span></div>` : ''}
              <div class="row"><span class="label">Nature:</span><span class="value">${bon.natureChargement?.replace(/_/g, ' ') || '-'}</span></div>
              ${(bon as any).poidsKg ? `<div class="row"><span class="label">Poids:</span><span class="value">${Number((bon as any).poidsKg).toLocaleString('fr-FR')} kg</span></div>` : ''}
            </div>

            <div class="section">
              <h3>👤 Client</h3>
              <div class="row"><span class="label">Raison sociale:</span><span class="value"><strong>${bon.client?.raisonSociale || '-'}</strong></span></div>
              ${bon.client?.adresse ? `<div class="row"><span class="label">Adresse:</span><span class="value">${bon.client.adresse}</span></div>` : ''}
              ${bon.client?.telephone ? `<div class="row"><span class="label">Téléphone:</span><span class="value">${bon.client.telephone}</span></div>` : ''}
              ${bon.client?.email ? `<div class="row"><span class="label">Email:</span><span class="value">${bon.client.email}</span></div>` : ''}
            </div>
          </div>

          <div class="column">
            <div class="section">
              <h3>🚛 Véhicule</h3>
              <div class="row"><span class="label">Immatriculation:</span><span class="value"><strong>${bon.camion?.immatriculation || '-'}</strong></span></div>
              ${bon.camion?.marque ? `<div class="row"><span class="label">Marque:</span><span class="value">${bon.camion.marque}</span></div>` : ''}
              ${bon.camion?.typeCamion ? `<div class="row"><span class="label">Type:</span><span class="value">${bon.camion.typeCamion}</span></div>` : ''}
            </div>

            <div class="section">
              <h3>👨‍✈️ Chauffeur</h3>
              <div class="row"><span class="label">Nom complet:</span><span class="value"><strong>${bon.chauffeur ? `${bon.chauffeur.prenom} ${bon.chauffeur.nom}` : '-'}</strong></span></div>
              ${bon.chauffeur?.telephone ? `<div class="row"><span class="label">Téléphone:</span><span class="value">${bon.chauffeur.telephone}</span></div>` : ''}
              ${bon.chauffeur?.numeroPermis ? `<div class="row"><span class="label">N° Permis:</span><span class="value">${bon.chauffeur.numeroPermis}</span></div>` : ''}
            </div>
          </div>
        </div>

        <div class="trajet-box">
          <div class="from">📍 ${bon.lieuChargement || 'Non spécifié'}</div>
          <div class="arrow">⬇️</div>
          <div class="to">📍 ${bon.lieuDechargement || 'Non spécifié'}</div>
        </div>

        <div class="section">
          <h3>💰 Facturation et Frais</h3>
          <table class="financial-table">
            <thead>
              <tr>
                <th>Description</th>
                <th class="amount">Montant (FCFA)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Montant du transport HT</td>
                <td class="amount">${bon.montantHt ? Number(bon.montantHt).toLocaleString('fr-FR') : '0'}</td>
              </tr>
              ${bon.fraisRoute ? `
              <tr>
                <td>Frais de route</td>
                <td class="amount">- ${Number(bon.fraisRoute).toLocaleString('fr-FR')}</td>
              </tr>` : ''}
              ${bon.fraisDepannage ? `
              <tr>
                <td>Frais de dépannage</td>
                <td class="amount">- ${Number(bon.fraisDepannage).toLocaleString('fr-FR')}</td>
              </tr>` : ''}
              ${bon.fraisAutres ? `
              <tr>
                <td>Autres frais${bon.fraisAutresDescription ? ` (${bon.fraisAutresDescription})` : ''}</td>
                <td class="amount">- ${Number(bon.fraisAutres).toLocaleString('fr-FR')}</td>
              </tr>` : ''}
              ${totalFrais > 0 ? `
              <tr class="total-row">
                <td>Total des frais</td>
                <td class="amount">- ${totalFrais.toLocaleString('fr-FR')}</td>
              </tr>` : ''}
              <tr class="net-row">
                <td>MONTANT NET</td>
                <td class="amount">${montantNet.toLocaleString('fr-FR')} FCFA</td>
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
            <div class="signature-line">Coordinateur / Resp. Logistique</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">Signature Chauffeur</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">Signature Client</div>
          </div>
        </div>

        <div class="footer">
          <p>Document généré le ${new Date().toLocaleString('fr-FR')} - ACL Platform</p>
          <p>Ce document fait foi de bon de transport et doit être conservé pour toute réclamation.</p>
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

  // Filter and sort bons
  const filteredAndSortedBons = bons
    ?.filter(bon => {
      // Filter by status first
      if (statusFilter && bon.statut !== statusFilter) return false;

      // Then filter by search query
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        bon.numero?.toLowerCase().includes(query) ||
        bon.client?.raisonSociale?.toLowerCase().includes(query) ||
        bon.camion?.immatriculation?.toLowerCase().includes(query) ||
        bon.chauffeur?.nom?.toLowerCase().includes(query) ||
        bon.chauffeur?.prenom?.toLowerCase().includes(query) ||
        bon.natureChargement?.toLowerCase().includes(query) ||
        bon.lieuChargement?.toLowerCase().includes(query) ||
        bon.lieuDechargement?.toLowerCase().includes(query) ||
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
        case 'dateCreation':
          aVal = new Date(a.dateCreation).getTime();
          bVal = new Date(b.dateCreation).getTime();
          break;
        case 'camion':
          aVal = a.camion?.immatriculation || '';
          bVal = b.camion?.immatriculation || '';
          break;
        case 'trajet':
          aVal = `${a.lieuChargement || ''} ${a.lieuDechargement || ''}`;
          bVal = `${b.lieuChargement || ''} ${b.lieuDechargement || ''}`;
          break;
        case 'montant':
          aVal = a.montantHt || 0;
          bVal = b.montantHt || 0;
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
            <h1 className="text-2xl font-bold text-gray-900">Gestion du Transport</h1>
            <p className="text-gray-600">Bons de transport et missions</p>
          </div>
        </div>
        <SkeletonTable rows={8} columns={7} />
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb />
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion du Transport</h1>
          <p className="text-gray-600">Bons de transport et missions</p>
        </div>
        <button onClick={openCreateModal} className="bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-yellow-400 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau bon
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
          <p className="text-2xl font-bold text-gray-900">{bons?.length || 0}</p>
        </div>
        <div
          onClick={() => setStatusFilter(statusFilter === 'EN_COURS' ? null : 'EN_COURS')}
          className={`bg-white p-4 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${
            statusFilter === 'EN_COURS' ? 'ring-2 ring-blue-500 bg-blue-50' : ''
          }`}
        >
          <p className="text-sm text-gray-600">En cours</p>
          <p className="text-2xl font-bold text-blue-600">{bons?.filter(b => b.statut === 'EN_COURS').length || 0}</p>
        </div>
        <div
          onClick={() => setStatusFilter(statusFilter === 'LIVRE' ? null : 'LIVRE')}
          className={`bg-white p-4 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${
            statusFilter === 'LIVRE' ? 'ring-2 ring-green-500 bg-green-50' : ''
          }`}
        >
          <p className="text-sm text-gray-600">Livrés</p>
          <p className="text-2xl font-bold text-green-600">{bons?.filter(b => b.statut === 'LIVRE').length || 0}</p>
        </div>
        <div
          onClick={() => setStatusFilter(statusFilter === 'BROUILLON' ? null : 'BROUILLON')}
          className={`bg-white p-4 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${
            statusFilter === 'BROUILLON' ? 'ring-2 ring-gray-500 bg-gray-100' : ''
          }`}
        >
          <p className="text-sm text-gray-600">Brouillons</p>
          <p className="text-2xl font-bold text-gray-600">{bons?.filter(b => b.statut === 'BROUILLON').length || 0}</p>
        </div>
        <div
          onClick={() => setStatusFilter(statusFilter === 'FACTURE' ? null : 'FACTURE')}
          className={`bg-white p-4 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${
            statusFilter === 'FACTURE' ? 'ring-2 ring-purple-500 bg-purple-50' : ''
          }`}
        >
          <p className="text-sm text-gray-600">Facturés</p>
          <p className="text-2xl font-bold text-purple-600">{bons?.filter(b => b.statut === 'FACTURE').length || 0}</p>
        </div>
      </div>

      {/* Active filter indicator */}
      {statusFilter && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-gray-600">Filtre actif:</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statutColors[statusFilter]}`}>
            {statutLabels[statusFilter]}
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
              placeholder="Rechercher (n°, client, camion, chauffeur, trajet...)"
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
                  date: new Date(b.dateCreation).toLocaleDateString('fr-FR'),
                  client: b.client?.raisonSociale || '-',
                  camion: b.camion?.immatriculation || '-',
                  chauffeur: b.chauffeur ? `${b.chauffeur.prenom} ${b.chauffeur.nom}` : '-',
                  nature: b.natureChargement || '-',
                  lieuChargement: b.lieuChargement || '-',
                  lieuDechargement: b.lieuDechargement || '-',
                  montant: b.montantHt || 0,
                  statut: statutLabels[b.statut] || b.statut,
                })),
                'bons_transport',
                [
                  { key: 'numero', label: 'N° Bon' },
                  { key: 'date', label: 'Date' },
                  { key: 'client', label: 'Client' },
                  { key: 'camion', label: 'Camion' },
                  { key: 'chauffeur', label: 'Chauffeur' },
                  { key: 'nature', label: 'Nature' },
                  { key: 'lieuChargement', label: 'Lieu Chargement' },
                  { key: 'lieuDechargement', label: 'Lieu Déchargement' },
                  { key: 'montant', label: 'Montant HT (FCFA)' },
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
                'Bons de Transport',
                ['N° Bon', 'Date', 'Client', 'Camion', 'Trajet', 'Montant', 'Statut'],
                filteredAndSortedBons.map(b => [
                  b.numero,
                  new Date(b.dateCreation).toLocaleDateString('fr-FR'),
                  b.client?.raisonSociale || '-',
                  b.camion?.immatriculation || '-',
                  `${b.lieuChargement || '-'} → ${b.lieuDechargement || '-'}`,
                  b.montantHt ? `${Number(b.montantHt).toLocaleString()} FCFA` : '-',
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
          <div className="px-4 py-2 bg-gray-50 text-sm text-gray-600">
            {filteredAndSortedBons.length} résultat(s) trouvé(s)
          </div>
        )}
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                onClick={() => handleSort('numero')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
              >
                N° Bon <SortIcon field="numero" />
              </th>
              <th
                onClick={() => handleSort('dateCreation')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
              >
                Date <SortIcon field="dateCreation" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Client
              </th>
              <th
                onClick={() => handleSort('camion')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
              >
                Camion / Chauffeur <SortIcon field="camion" />
              </th>
              <th
                onClick={() => handleSort('trajet')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
              >
                Trajet <SortIcon field="trajet" />
              </th>
              {canSeeFinancial && (
                <th
                  onClick={() => handleSort('montant')}
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                >
                  Montant <SortIcon field="montant" />
                </th>
              )}
              <th
                onClick={() => handleSort('statut')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
              >
                Statut <SortIcon field="statut" />
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedBons.map((bon) => (
              <tr
                key={bon.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => setViewingBon(bon)}
              >
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{bon.numero}</div>
                  <div className="text-xs text-gray-500">{bon.natureChargement?.replace(/_/g, ' ')}</div>
                </td>
                <td className="px-6 py-4 text-gray-900">
                  {new Date(bon.dateCreation).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-6 py-4">
                  <div className="text-gray-900 font-medium">{bon.client?.raisonSociale || '-'}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-gray-900">{bon.camion?.immatriculation || '-'}</div>
                  <div className="text-sm text-gray-500">
                    {bon.chauffeur ? `${bon.chauffeur.prenom} ${bon.chauffeur.nom}` : '-'}
                  </div>
                  {bon.chauffeur?.telephone && (
                    <div className="text-xs text-gray-400">{bon.chauffeur.telephone}</div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm">
                    <div className="text-gray-900">{bon.lieuChargement || '-'}</div>
                    <div className="text-gray-500">→ {bon.lieuDechargement || '-'}</div>
                  </div>
                </td>
                {canSeeFinancial && (
                  <td className="px-6 py-4 text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {bon.montantHt ? `${Number(bon.montantHt).toLocaleString('fr-FR')} FCFA` : '-'}
                    </div>
                  </td>
                )}
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={bon.statut}
                    onChange={(e) => handleStatutChange(bon.id, e.target.value, bon.numero)}
                    className={`px-2 py-1 rounded-full text-xs font-medium border-0 ${statutColors[bon.statut]}`}
                  >
                    {Object.entries(statutLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => printBon(bon)}
                      className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                      title="Imprimer ce bon"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => openEditModal(bon)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Modifier
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredAndSortedBons.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  {searchQuery
                    ? `Aucun bon de transport trouvé pour "${searchQuery}"`
                    : 'Aucun bon de transport. Cliquez sur "Nouveau bon" pour en créer un.'
                  }
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
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingBon ? 'Modifier le bon' : 'Nouveau bon de transport'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Camion</label>
                    <select
                      value={formData.camionId || ''}
                      onChange={(e) => setFormData({ ...formData, camionId: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="">-- Sélectionner --</option>
                      {camions
                        ?.filter(c => {
                          // En édition: afficher tous les camions sauf HORS_SERVICE
                          if (editingBon) return c.statut !== 'HORS_SERVICE';
                          // En création: seulement les disponibles
                          return c.statut === 'DISPONIBLE';
                        })
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.immatriculation}
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="">-- Sélectionner --</option>
                      {chauffeurs
                        ?.filter(c => {
                          // En édition: afficher tous les chauffeurs sauf INDISPONIBLE
                          if (editingBon) return c.statut !== 'INDISPONIBLE';
                          // En création: seulement les disponibles
                          return c.statut === 'DISPONIBLE';
                        })
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.prenom} {c.nom}
                            {c.statut !== 'DISPONIBLE' ? ` (${c.statut})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nature du chargement</label>
                  <select
                    value={formData.natureChargement}
                    onChange={(e) => setFormData({ ...formData, natureChargement: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    {naturesChargement.map((nature) => (
                      <option key={nature} value={nature}>{nature.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lieu de chargement</label>
                  <input
                    type="text"
                    value={formData.lieuChargement}
                    onChange={(e) => setFormData({ ...formData, lieuChargement: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Port de Dakar"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lieu de déchargement</label>
                  <input
                    type="text"
                    value={formData.lieuDechargement}
                    onChange={(e) => setFormData({ ...formData, lieuDechargement: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Thiès, Zone industrielle"
                  />
                </div>
                {canSeeFinancial && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tonnage</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.tonnage || ''}
                          onChange={(e) => {
                            const tonnage = e.target.value ? Number(e.target.value) : undefined;
                            const newMontant = tonnage && formData.prixTonne ? tonnage * formData.prixTonne : formData.montantHt;
                            setFormData({ ...formData, tonnage, montantHt: newMontant });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="25.5"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prix / Tonne (FCFA)</label>
                        <input
                          type="number"
                          value={formData.prixTonne || ''}
                          onChange={(e) => {
                            const prixTonne = e.target.value ? Number(e.target.value) : undefined;
                            const newMontant = formData.tonnage && prixTonne ? formData.tonnage * prixTonne : formData.montantHt;
                            setFormData({ ...formData, prixTonne, montantHt: newMontant });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="15000"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Montant HT (FCFA)
                        {formData.tonnage && formData.prixTonne && (
                          <span className="text-xs text-gray-500 ml-2">
                            ({formData.tonnage} T × {formData.prixTonne?.toLocaleString('fr-FR')} FCFA/T)
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        value={formData.montantHt || ''}
                        onChange={(e) => setFormData({ ...formData, montantHt: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="150000"
                      />
                    </div>
                  </>
                )}

                {/* Frais de route et dépenses du voyage */}
                <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Frais de route et dépenses</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Frais de route (FCFA)</label>
                      <input
                        type="number"
                        value={formData.fraisRoute || ''}
                        onChange={(e) => setFormData({ ...formData, fraisRoute: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Frais de dépannage (FCFA)</label>
                      <input
                        type="number"
                        value={formData.fraisDepannage || ''}
                        onChange={(e) => setFormData({ ...formData, fraisDepannage: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Autres frais (FCFA)</label>
                      <input
                        type="number"
                        value={formData.fraisAutres || ''}
                        onChange={(e) => setFormData({ ...formData, fraisAutres: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description autres frais</label>
                      <input
                        type="text"
                        value={formData.fraisAutresDescription || ''}
                        onChange={(e) => setFormData({ ...formData, fraisAutresDescription: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Ex: Repas, parking..."
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                {/* Dotation carburant section - only for new transport vouchers */}
                {!editingBon && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="checkbox"
                        id="includeDotation"
                        checked={includeDotation}
                        onChange={(e) => setIncludeDotation(e.target.checked)}
                        className="w-4 h-4 text-yellow-500 border-gray-300 rounded focus:ring-yellow-500"
                      />
                      <label htmlFor="includeDotation" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Ajouter une dotation carburant
                      </label>
                    </div>

                    {includeDotation && (
                      <div className="space-y-3 bg-gray-50 p-3 rounded-lg">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date dotation</label>
                            <input
                              type="date"
                              value={dotationData.dateDotation}
                              onChange={(e) => setDotationData({ ...dotationData, dateDotation: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                            <select
                              value={dotationData.typeSource}
                              onChange={(e) => setDotationData({ ...dotationData, typeSource: e.target.value as 'CUVE_INTERNE' | 'STATION_EXTERNE' })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                              <option value="CUVE_INTERNE">Cuve interne</option>
                              <option value="STATION_EXTERNE">Station externe</option>
                            </select>
                          </div>
                        </div>

                        {dotationData.typeSource === 'CUVE_INTERNE' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cuve</label>
                            <select
                              value={dotationData.cuveId || ''}
                              onChange={(e) => setDotationData({ ...dotationData, cuveId: e.target.value ? Number(e.target.value) : undefined })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                              <option value="">Sélectionner une cuve</option>
                              {cuves?.filter(c => c.actif).map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.nom} ({c.niveauActuelLitres} L dispo)
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {dotationData.typeSource === 'STATION_EXTERNE' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Station partenaire</label>
                            <select
                              value={dotationData.stationPartenaireId || ''}
                              onChange={(e) => {
                                const stationId = e.target.value ? Number(e.target.value) : undefined;
                                const station = stationsPartenaires?.find(s => s.id === stationId);
                                setDotationData({
                                  ...dotationData,
                                  stationPartenaireId: stationId,
                                  stationNom: station?.nom || '',
                                  prixUnitaire: station?.tarifNegocie || dotationData.prixUnitaire,
                                });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                              <option value="">Sélectionner une station</option>
                              {stationsPartenaires?.filter(s => s.actif).map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.nom} {s.ville ? `- ${s.ville}` : ''} {s.tarifNegocie ? `(${s.tarifNegocie} FCFA/L)` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantité (L) *</label>
                            <input
                              type="number"
                              value={dotationData.quantiteLitres || ''}
                              onChange={(e) => setDotationData({ ...dotationData, quantiteLitres: Number(e.target.value) })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              min="1"
                              required={includeDotation}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Prix/L (FCFA)</label>
                            <input
                              type="number"
                              value={dotationData.prixUnitaire || ''}
                              onChange={(e) => setDotationData({ ...dotationData, prixUnitaire: e.target.value ? Number(e.target.value) : undefined })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                    )}
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

      {/* Detail Modal */}
      {viewingBon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bon de Transport</h2>
                <p className="text-lg font-mono text-yellow-600">{viewingBon.numero}</p>
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
              {/* Informations générales */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 border-b pb-2">Informations générales</h3>
                <div>
                  <label className="text-sm text-gray-500">Date de création</label>
                  <p className="text-gray-900">{new Date(viewingBon.dateCreation).toLocaleDateString('fr-FR')}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Nature du chargement</label>
                  <p className="text-gray-900">{viewingBon.natureChargement?.replace(/_/g, ' ') || '-'}</p>
                </div>
                {viewingBon.dateLivraison && (
                  <div>
                    <label className="text-sm text-gray-500">Date de livraison</label>
                    <p className="text-gray-900">{new Date(viewingBon.dateLivraison).toLocaleDateString('fr-FR')}</p>
                  </div>
                )}
              </div>

              {/* Trajet */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 border-b pb-2">Trajet</h3>
                <div>
                  <label className="text-sm text-gray-500">Lieu de chargement</label>
                  <p className="text-gray-900">{viewingBon.lieuChargement || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Lieu de déchargement</label>
                  <p className="text-gray-900">{viewingBon.lieuDechargement || '-'}</p>
                </div>
              </div>

              {/* Véhicule et chauffeur */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 border-b pb-2">Véhicule & Chauffeur</h3>
                <div>
                  <label className="text-sm text-gray-500">Camion</label>
                  <p className="text-gray-900">{viewingBon.camion?.immatriculation || '-'}</p>
                  {viewingBon.camion?.typeCamion && (
                    <p className="text-sm text-gray-500">{viewingBon.camion.typeCamion}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-500">Chauffeur</label>
                  <p className="text-gray-900">
                    {viewingBon.chauffeur ? `${viewingBon.chauffeur.prenom} ${viewingBon.chauffeur.nom}` : '-'}
                  </p>
                  {viewingBon.chauffeur?.telephone && (
                    <p className="text-sm text-gray-500">{viewingBon.chauffeur.telephone}</p>
                  )}
                </div>
              </div>

              {/* Facturation - Only visible for users with financial permission */}
              {canSeeFinancial && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white border-b pb-2">Facturation</h3>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Client</label>
                    <p className="text-gray-900 dark:text-white">{viewingBon.client?.raisonSociale || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Montant HT</label>
                    <p className="text-xl font-bold text-yellow-600">
                      {viewingBon.montantHt ? `${Number(viewingBon.montantHt).toLocaleString('fr-FR')} FCFA` : '-'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Frais de route et dépenses */}
            {(viewingBon.fraisRoute || viewingBon.fraisDepannage || viewingBon.fraisAutres) && (
              <div className="mt-6 pt-4 border-t">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Frais de route et dépenses</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {viewingBon.fraisRoute ? (
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <label className="text-sm text-gray-500 dark:text-gray-400">Frais de route</label>
                      <p className="text-gray-900 dark:text-white font-medium">{Number(viewingBon.fraisRoute).toLocaleString('fr-FR')} FCFA</p>
                    </div>
                  ) : null}
                  {viewingBon.fraisDepannage ? (
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                      <label className="text-sm text-gray-500 dark:text-gray-400">Frais de dépannage</label>
                      <p className="text-orange-600 dark:text-orange-400 font-medium">{Number(viewingBon.fraisDepannage).toLocaleString('fr-FR')} FCFA</p>
                    </div>
                  ) : null}
                  {viewingBon.fraisAutres ? (
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <label className="text-sm text-gray-500 dark:text-gray-400">Autres frais</label>
                      <p className="text-gray-900 dark:text-white font-medium">{Number(viewingBon.fraisAutres).toLocaleString('fr-FR')} FCFA</p>
                      {viewingBon.fraisAutresDescription && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{viewingBon.fraisAutresDescription}</p>
                      )}
                    </div>
                  ) : null}
                </div>
                {/* Total des frais */}
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Total des frais</span>
                    <span className="text-lg font-bold text-yellow-600">
                      {(
                        (Number(viewingBon.fraisRoute) || 0) +
                        (Number(viewingBon.fraisDepannage) || 0) +
                        (Number(viewingBon.fraisAutres) || 0)
                      ).toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {viewingBon.notes && (
              <div className="mt-6 pt-4 border-t">
                <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{viewingBon.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() => setViewingBon(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  setViewingBon(null);
                  openEditModal(viewingBon);
                }}
                className="px-4 py-2 bg-yellow-500 text-gray-900 rounded-lg font-medium hover:bg-yellow-400"
              >
                Modifier
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
            <p className="text-gray-600 dark:text-gray-300 mb-6">{confirmModal.message}</p>
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

      {/* Error Modal */}
      {errorModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
