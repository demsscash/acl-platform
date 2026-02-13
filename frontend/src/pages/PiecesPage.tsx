import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import piecesService from '../services/pieces.service';
import type {
  CataloguePiece,
  StockPiece,
  SortieStock,
  CreateSortieDto,
  MotifSortie,
  EntreeStock,
  CreateEntreeDto,
  TypeEntree,
  Fournisseur,
} from '../services/pieces.service';
import camionsService from '../services/camions.service';
import { exportToCSV, printTable } from '../utils/export';

interface CreatePieceDto {
  reference: string;
  designation: string;
  categorie?: string;
  uniteMesure?: string;
  stockMinimum?: number;
  stockMaximum?: number;
  source?: string;
}

const categories = ['Moteur', 'Transmission', 'Freinage', 'Suspension', 'Électrique', 'Carrosserie', 'Autre'];

const motifLabels: Record<MotifSortie, string> = {
  MAINTENANCE: 'Maintenance',
  REPARATION: 'Réparation',
  REMPLACEMENT: 'Remplacement',
  USURE: 'Usure',
  PANNE: 'Panne',
  AUTRE: 'Autre',
};

const typeEntreeLabels: Record<TypeEntree, string> = {
  ACHAT: 'Achat',
  RETOUR: 'Retour',
  TRANSFERT: 'Transfert',
  INVENTAIRE: 'Inventaire',
  AUTRE: 'Autre',
};

export default function PiecesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'catalogue' | 'stock' | 'entrees' | 'sorties' | 'mouvements' | 'fournisseurs' | 'alertes'>('catalogue');
  const [showModal, setShowModal] = useState(false);
  const [showSortieModal, setShowSortieModal] = useState(false);
  const [showEntreeModal, setShowEntreeModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEntreeDetailModal, setShowEntreeDetailModal] = useState(false);
  const [showFournisseurModal, setShowFournisseurModal] = useState(false);
  const [showInventaireModal, setShowInventaireModal] = useState(false);
  const [selectedSortie, setSelectedSortie] = useState<SortieStock | null>(null);
  const [selectedEntree, setSelectedEntree] = useState<EntreeStock | null>(null);
  const [editingPiece, setEditingPiece] = useState<CataloguePiece | null>(null);
  const [editingFournisseur, setEditingFournisseur] = useState<Fournisseur | null>(null);
  const [filterPieceId, setFilterPieceId] = useState<number | null>(null);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ show: false, title: '', message: '', onConfirm: () => {} });

  const [formData, setFormData] = useState<CreatePieceDto>({
    reference: '',
    designation: '',
    categorie: '',
    uniteMesure: 'UNITE',
    stockMinimum: 5,
    stockMaximum: 100,
    source: '',
  });

  // Sortie form state
  const [sortieForm, setSortieForm] = useState<{
    camionId: number;
    kilometrageCamion: number;
    motif: MotifSortie;
    notes: string;
    lignes: { pieceId: number; quantite: number }[];
  }>({
    camionId: 0,
    kilometrageCamion: 0,
    motif: 'MAINTENANCE',
    notes: '',
    lignes: [{ pieceId: 0, quantite: 1 }],
  });

  // Entree form state
  const [entreeForm, setEntreeForm] = useState<{
    typeEntree: TypeEntree;
    fournisseurId: number;
    numeroFacture: string;
    numeroBL: string;
    notes: string;
    lignes: { pieceId: number; quantite: number; prixUnitaire: number }[];
  }>({
    typeEntree: 'ACHAT',
    fournisseurId: 0,
    numeroFacture: '',
    numeroBL: '',
    notes: '',
    lignes: [{ pieceId: 0, quantite: 1, prixUnitaire: 0 }],
  });

  // Fournisseur form state
  const [fournisseurForm, setFournisseurForm] = useState({
    raisonSociale: '',
    adresse: '',
    telephone: '',
    email: '',
  });

  // Inventaire form state
  const [inventaireForm, setInventaireForm] = useState({
    pieceId: 0,
    nouvelleQuantite: 0,
    motif: '',
  });

  const { data: pieces, isLoading } = useQuery({
    queryKey: ['pieces'],
    queryFn: piecesService.getAll,
  });

  const { data: stock } = useQuery({
    queryKey: ['pieces-stock'],
    queryFn: piecesService.getStock,
  });

  const { data: alertes } = useQuery({
    queryKey: ['pieces-alertes'],
    queryFn: piecesService.getAlertes,
  });

  const { data: sorties } = useQuery({
    queryKey: ['pieces-sorties'],
    queryFn: piecesService.getSorties,
  });

  const { data: camions } = useQuery({
    queryKey: ['camions'],
    queryFn: camionsService.getAll,
  });

  const { data: entrees } = useQuery({
    queryKey: ['pieces-entrees'],
    queryFn: piecesService.getEntrees,
  });

  const { data: fournisseurs } = useQuery({
    queryKey: ['fournisseurs'],
    queryFn: piecesService.getFournisseurs,
  });

  const { data: mouvements } = useQuery({
    queryKey: ['pieces-mouvements', filterPieceId],
    queryFn: () => piecesService.getMouvements(filterPieceId || undefined),
  });

  const createMutation = useMutation({
    mutationFn: piecesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pieces'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreatePieceDto> }) =>
      piecesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pieces'] });
      closeModal();
    },
  });

  const createSortieMutation = useMutation({
    mutationFn: piecesService.createSortie,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pieces-sorties'] });
      queryClient.invalidateQueries({ queryKey: ['pieces-stock'] });
      queryClient.invalidateQueries({ queryKey: ['pieces-alertes'] });
      closeSortieModal();
    },
  });

  const createEntreeMutation = useMutation({
    mutationFn: piecesService.createEntree,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pieces-entrees'] });
      queryClient.invalidateQueries({ queryKey: ['pieces-stock'] });
      queryClient.invalidateQueries({ queryKey: ['pieces-alertes'] });
      queryClient.invalidateQueries({ queryKey: ['pieces'] });
      closeEntreeModal();
    },
  });

  const createFournisseurMutation = useMutation({
    mutationFn: piecesService.createFournisseur,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fournisseurs'] });
      closeFournisseurModal();
    },
  });

  const updateFournisseurMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Fournisseur> }) =>
      piecesService.updateFournisseur(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fournisseurs'] });
      closeFournisseurModal();
    },
  });

  const deleteFournisseurMutation = useMutation({
    mutationFn: piecesService.deleteFournisseur,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fournisseurs'] });
    },
  });

  const handleDeleteFournisseur = (fournisseur: Fournisseur) => {
    setConfirmModal({
      show: true,
      title: 'Confirmer la suppression',
      message: `Voulez-vous vraiment supprimer le fournisseur ${fournisseur.raisonSociale} ?`,
      onConfirm: () => {
        deleteFournisseurMutation.mutate(fournisseur.id);
        setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
      },
    });
  };

  const ajusterStockMutation = useMutation({
    mutationFn: piecesService.ajusterStock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pieces-stock'] });
      queryClient.invalidateQueries({ queryKey: ['pieces-alertes'] });
      queryClient.invalidateQueries({ queryKey: ['pieces-mouvements'] });
      closeInventaireModal();
    },
  });

  const openCreateModal = () => {
    setEditingPiece(null);
    setFormData({
      reference: '',
      designation: '',
      categorie: '',
      uniteMesure: 'UNITE',
      stockMinimum: 5,
      stockMaximum: 100,
      source: '',
    });
    setShowModal(true);
  };

  const openEditModal = (piece: CataloguePiece) => {
    setEditingPiece(piece);
    setFormData({
      reference: piece.reference,
      designation: piece.designation,
      categorie: piece.categorie || '',
      uniteMesure: piece.uniteMesure,
      stockMinimum: piece.stockMinimum,
      stockMaximum: piece.stockMaximum,
      source: (piece as any).source || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPiece(null);
  };

  const openSortieModal = () => {
    setSortieForm({
      camionId: 0,
      kilometrageCamion: 0,
      motif: 'MAINTENANCE',
      notes: '',
      lignes: [{ pieceId: 0, quantite: 1 }],
    });
    setShowSortieModal(true);
  };

  const closeSortieModal = () => {
    setShowSortieModal(false);
  };

  const openDetailModal = (sortie: SortieStock) => {
    setSelectedSortie(sortie);
    setShowDetailModal(true);
  };

  const openEntreeModal = () => {
    setEntreeForm({
      typeEntree: 'ACHAT',
      fournisseurId: 0,
      numeroFacture: '',
      numeroBL: '',
      notes: '',
      lignes: [{ pieceId: 0, quantite: 1, prixUnitaire: 0 }],
    });
    setShowEntreeModal(true);
  };

  const closeEntreeModal = () => {
    setShowEntreeModal(false);
  };

  const openEntreeDetailModal = (entree: EntreeStock) => {
    setSelectedEntree(entree);
    setShowEntreeDetailModal(true);
  };

  const openFournisseurModal = (fournisseur?: Fournisseur) => {
    if (fournisseur) {
      setEditingFournisseur(fournisseur);
      setFournisseurForm({
        raisonSociale: fournisseur.raisonSociale,
        adresse: fournisseur.adresse || '',
        telephone: fournisseur.telephone || '',
        email: fournisseur.email || '',
      });
    } else {
      setEditingFournisseur(null);
      setFournisseurForm({ raisonSociale: '', adresse: '', telephone: '', email: '' });
    }
    setShowFournisseurModal(true);
  };

  const closeFournisseurModal = () => {
    setShowFournisseurModal(false);
    setEditingFournisseur(null);
  };

  const openInventaireModal = (pieceId?: number) => {
    const currentStock = pieceId ? getStockForPiece(pieceId) : 0;
    setInventaireForm({
      pieceId: pieceId || 0,
      nouvelleQuantite: currentStock,
      motif: '',
    });
    setShowInventaireModal(true);
  };

  const closeInventaireModal = () => {
    setShowInventaireModal(false);
  };

  const handleSubmitFournisseur = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingFournisseur) {
      updateFournisseurMutation.mutate({ id: editingFournisseur.id, data: fournisseurForm });
    } else {
      createFournisseurMutation.mutate(fournisseurForm);
    }
  };

  const handleSubmitInventaire = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inventaireForm.pieceId || !inventaireForm.motif) {
      alert('Veuillez remplir tous les champs');
      return;
    }
    ajusterStockMutation.mutate(inventaireForm);
  };

  // Export functions
  const exportMouvementsCSV = () => {
    if (!mouvements?.length) return;
    const data = mouvements.map(m => ({
      date: new Date(m.date).toLocaleDateString('fr-FR'),
      type: m.type === 'ENTREE' ? 'Entrée' : 'Sortie',
      numeroBon: m.numeroBon,
      piece: m.piece?.designation || '',
      reference: m.piece?.reference || '',
      quantite: m.quantite,
      details: m.type === 'ENTREE'
        ? `${m.typeEntree ? typeEntreeLabels[m.typeEntree] : ''} ${m.fournisseur?.raisonSociale || 'Autres'}`
        : `${m.motif ? motifLabels[m.motif] : ''} ${m.camion?.immatriculation || ''}`,
    }));
    exportToCSV(data, 'mouvements_stock', [
      { key: 'date', label: 'Date' },
      { key: 'type', label: 'Type' },
      { key: 'numeroBon', label: 'N° Bon' },
      { key: 'piece', label: 'Pièce' },
      { key: 'reference', label: 'Référence' },
      { key: 'quantite', label: 'Quantité' },
      { key: 'details', label: 'Détails' },
    ]);
  };

  const printMouvements = () => {
    if (!mouvements?.length) return;
    const headers = ['Date', 'Type', 'N° Bon', 'Pièce', 'Référence', 'Quantité', 'Détails'];
    const rows = mouvements.map(m => [
      new Date(m.date).toLocaleDateString('fr-FR'),
      m.type === 'ENTREE' ? 'Entrée' : 'Sortie',
      m.numeroBon,
      m.piece?.designation || '',
      m.piece?.reference || '',
      String(m.quantite),
      m.type === 'ENTREE'
        ? `${m.typeEntree ? typeEntreeLabels[m.typeEntree] : ''} ${m.fournisseur?.raisonSociale || 'Autres'}`
        : `${m.motif ? motifLabels[m.motif] : ''} ${m.camion?.immatriculation || ''}`,
    ]);
    printTable('Historique des Mouvements de Stock', headers, rows);
  };

  const exportStockCSV = () => {
    if (!stock?.length) return;
    const data = stock.map(s => ({
      designation: s.piece?.designation || '',
      reference: s.piece?.reference || '',
      emplacement: s.emplacement || '-',
      quantiteDisponible: s.quantiteDisponible,
      quantiteReservee: s.quantiteReservee,
    }));
    exportToCSV(data, 'etat_stock', [
      { key: 'designation', label: 'Désignation' },
      { key: 'reference', label: 'Référence' },
      { key: 'emplacement', label: 'Emplacement' },
      { key: 'quantiteDisponible', label: 'Qté Disponible' },
      { key: 'quantiteReservee', label: 'Qté Réservée' },
    ]);
  };

  const printStock = () => {
    if (!stock?.length) return;
    const headers = ['Désignation', 'Référence', 'Emplacement', 'Qté Disponible', 'Qté Réservée'];
    const rows = stock.map(s => [
      s.piece?.designation || '',
      s.piece?.reference || '',
      s.emplacement || '-',
      String(s.quantiteDisponible),
      String(s.quantiteReservee),
    ]);
    printTable('État du Stock', headers, rows);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPiece) {
      updateMutation.mutate({ id: editingPiece.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleSubmitSortie = (e: React.FormEvent) => {
    e.preventDefault();
    const validLignes = sortieForm.lignes.filter(l => l.pieceId > 0 && l.quantite > 0);
    if (validLignes.length === 0) {
      alert('Veuillez ajouter au moins une pièce');
      return;
    }
    if (!sortieForm.camionId) {
      alert('Veuillez sélectionner un camion');
      return;
    }

    const data: CreateSortieDto = {
      camionId: sortieForm.camionId,
      kilometrageCamion: sortieForm.kilometrageCamion || undefined,
      motif: sortieForm.motif,
      notes: sortieForm.notes || undefined,
      lignes: validLignes,
    };

    createSortieMutation.mutate(data);
  };

  const addLigne = () => {
    setSortieForm({
      ...sortieForm,
      lignes: [...sortieForm.lignes, { pieceId: 0, quantite: 1 }],
    });
  };

  const removeLigne = (index: number) => {
    setSortieForm({
      ...sortieForm,
      lignes: sortieForm.lignes.filter((_, i) => i !== index),
    });
  };

  const updateLigne = (index: number, field: 'pieceId' | 'quantite', value: number) => {
    const newLignes = [...sortieForm.lignes];
    newLignes[index] = { ...newLignes[index], [field]: value };
    setSortieForm({ ...sortieForm, lignes: newLignes });
  };

  // Entree handlers
  const handleSubmitEntree = (e: React.FormEvent) => {
    e.preventDefault();
    const validLignes = entreeForm.lignes.filter(l => l.pieceId > 0 && l.quantite > 0);
    if (validLignes.length === 0) {
      alert('Veuillez ajouter au moins une pièce');
      return;
    }

    const data: CreateEntreeDto = {
      typeEntree: entreeForm.typeEntree,
      fournisseurId: entreeForm.fournisseurId > 0 ? entreeForm.fournisseurId : undefined,
      numeroFacture: entreeForm.numeroFacture || undefined,
      numeroBL: entreeForm.numeroBL || undefined,
      notes: entreeForm.notes || undefined,
      lignes: validLignes.map(l => ({
        pieceId: l.pieceId,
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire || undefined,
      })),
    };

    createEntreeMutation.mutate(data);
  };

  const addLigneEntree = () => {
    setEntreeForm({
      ...entreeForm,
      lignes: [...entreeForm.lignes, { pieceId: 0, quantite: 1, prixUnitaire: 0 }],
    });
  };

  const removeLigneEntree = (index: number) => {
    setEntreeForm({
      ...entreeForm,
      lignes: entreeForm.lignes.filter((_, i) => i !== index),
    });
  };

  const updateLigneEntree = (index: number, field: 'pieceId' | 'quantite' | 'prixUnitaire', value: number) => {
    const newLignes = [...entreeForm.lignes];
    newLignes[index] = { ...newLignes[index], [field]: value };
    setEntreeForm({ ...entreeForm, lignes: newLignes });
  };

  // Calculate stock for each piece
  const getStockForPiece = (pieceId: number) => {
    const pieceStock = stock?.filter((s: StockPiece) => s.pieceId === pieceId) || [];
    return pieceStock.reduce((sum: number, s: StockPiece) => sum + s.quantiteDisponible, 0);
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Pièces & Stock</h1>
          <p className="text-gray-600">Catalogue, stock et sorties de pièces</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openEntreeModal}
            className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-500 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18m-6-4v1a3 3 0 003 3h4a3 3 0 003-3V7a3 3 0 00-3-3h-4a3 3 0 00-3 3v1" />
            </svg>
            Entrée de stock
          </button>
          <button
            onClick={openSortieModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-500 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sortie de pièces
          </button>
          <button
            onClick={openCreateModal}
            className="bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-yellow-400 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle pièce
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600">Références</p>
          <p className="text-2xl font-bold text-gray-900">{pieces?.length || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600">En stock</p>
          <p className="text-2xl font-bold text-green-600">
            {stock?.reduce((sum: number, s: StockPiece) => sum + s.quantiteDisponible, 0) || 0}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600">Sorties ce mois</p>
          <p className="text-2xl font-bold text-blue-600">
            {sorties?.filter(s => {
              const date = new Date(s.dateSortie);
              const now = new Date();
              return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            }).length || 0}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600">Alertes</p>
          <p className="text-2xl font-bold text-red-600">{alertes?.length || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600">Catégories</p>
          <p className="text-2xl font-bold text-purple-600">
            {new Set(pieces?.map(p => p.categorie).filter(Boolean)).size}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('catalogue')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'catalogue'
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Catalogue
          </button>
          <button
            onClick={() => setActiveTab('stock')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'stock'
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            État du stock
          </button>
          <button
            onClick={() => setActiveTab('entrees')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'entrees'
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Entrées
          </button>
          <button
            onClick={() => setActiveTab('sorties')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sorties'
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Sorties
          </button>
          <button
            onClick={() => setActiveTab('mouvements')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'mouvements'
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Mouvements
          </button>
          <button
            onClick={() => setActiveTab('fournisseurs')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'fournisseurs'
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Fournisseurs
          </button>
          <button
            onClick={() => setActiveTab('alertes')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'alertes'
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Alertes
            {alertes && alertes.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {alertes.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Catalogue Tab */}
      {activeTab === 'catalogue' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Pièce</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Référence</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Désignation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Catégorie</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seuil min</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pieces?.map((piece) => {
                const currentStock = getStockForPiece(piece.id);
                const isLow = currentStock <= piece.stockMinimum;
                return (
                  <tr key={piece.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-sm text-blue-600">{(piece as any).numeroPiece || '-'}</td>
                    <td className="px-6 py-4 font-mono text-sm text-gray-900">{piece.reference}</td>
                    <td className="px-6 py-4 text-gray-900">{piece.designation}</td>
                    <td className="px-6 py-4">
                      {piece.categorie && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                          {piece.categorie}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm">{(piece as any).source || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                        {currentStock} {piece.uniteMesure}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{piece.stockMinimum}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openEditModal(piece)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Modifier
                      </button>
                    </td>
                  </tr>
                );
              })}
              {pieces?.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Aucune pièce enregistrée. Cliquez sur "Nouvelle pièce" pour en ajouter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Stock Tab */}
      {activeTab === 'stock' && (
        <div>
          <div className="mb-4 flex justify-end gap-2">
            <button
              onClick={exportStockCSV}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
            <button
              onClick={printStock}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimer
            </button>
          </div>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pièce</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Emplacement</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Disponible</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Réservé</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-gray-200">
              {stock?.map((s: StockPiece) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{s.piece?.designation}</div>
                    <div className="text-sm text-gray-500">{s.piece?.reference}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-900">{s.emplacement || '-'}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{s.quantiteDisponible}</td>
                  <td className="px-6 py-4 text-gray-500">{s.quantiteReservee}</td>
                </tr>
              ))}
              {(!stock || stock.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    Aucun stock enregistré
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Entrées Tab */}
      {activeTab === 'entrees' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Bon</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fournisseur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pièces</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Créé par</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {entrees?.map((entree) => (
                <tr key={entree.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm text-gray-900">{entree.numeroBon}</td>
                  <td className="px-6 py-4 text-gray-900">
                    {new Date(entree.dateEntree).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-sm ${
                      entree.typeEntree === 'ACHAT' ? 'bg-green-100 text-green-800' :
                      entree.typeEntree === 'RETOUR' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {typeEntreeLabels[entree.typeEntree]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-900">
                    {entree.fournisseur?.raisonSociale || 'Autres'}
                  </td>
                  <td className="px-6 py-4 text-gray-900">
                    {entree.lignes?.length || 0} pièce(s)
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {entree.createur?.prenom} {entree.createur?.nom}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openEntreeDetailModal(entree)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Détail
                    </button>
                  </td>
                </tr>
              ))}
              {(!entrees || entrees.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Aucune entrée enregistrée
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Sorties Tab */}
      {activeTab === 'sorties' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Bon</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Camion</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motif</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pièces</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Créé par</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sorties?.map((sortie) => (
                <tr key={sortie.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm text-gray-900">{sortie.numeroBon}</td>
                  <td className="px-6 py-4 text-gray-900">
                    {new Date(sortie.dateSortie).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{sortie.camion?.immatriculation}</div>
                    <div className="text-sm text-gray-500">{sortie.camion?.typeCamion}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-sm ${
                      sortie.motif === 'PANNE' ? 'bg-red-100 text-red-800' :
                      sortie.motif === 'REPARATION' ? 'bg-orange-100 text-orange-800' :
                      sortie.motif === 'MAINTENANCE' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {motifLabels[sortie.motif]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-900">
                    {sortie.lignes?.length || 0} pièce(s)
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {sortie.createur?.prenom} {sortie.createur?.nom}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openDetailModal(sortie)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Détail
                    </button>
                  </td>
                </tr>
              ))}
              {(!sorties || sorties.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Aucune sortie enregistrée
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Alertes Tab */}
      {activeTab === 'alertes' && (
        <div className="space-y-4">
          {alertes?.map((alerte, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-500">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-gray-900">{alerte.piece.designation}</h3>
                  <p className="text-sm text-gray-500">{alerte.piece.reference}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-red-600">{alerte.stockActuel}</p>
                  <p className="text-xs text-gray-500">Minimum: {alerte.stockMinimum}</p>
                </div>
              </div>
            </div>
          ))}
          {(!alertes || alertes.length === 0) && (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
              Aucune alerte de stock
            </div>
          )}
        </div>
      )}

      {/* Mouvements Tab */}
      {activeTab === 'mouvements' && (
        <div>
          <div className="mb-4 flex gap-4 items-center justify-between">
            <div className="flex gap-4 items-center">
              <select
                value={filterPieceId || ''}
                onChange={(e) => setFilterPieceId(e.target.value ? Number(e.target.value) : null)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="">Toutes les pièces</option>
                {pieces?.map((piece) => (
                  <option key={piece.id} value={piece.id}>
                    {piece.reference} - {piece.designation}
                  </option>
                ))}
              </select>
              <button
                onClick={() => openInventaireModal()}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-500"
              >
                Ajuster le stock (Inventaire)
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportMouvementsCSV}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
              <button
                onClick={printMouvements}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimer
              </button>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Bon</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pièce</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantité</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {mouvements?.map((mouvement) => (
                  <tr key={mouvement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-900">
                      {new Date(mouvement.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-sm ${
                        mouvement.type === 'ENTREE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {mouvement.type === 'ENTREE' ? 'Entrée' : 'Sortie'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-gray-900">{mouvement.numeroBon}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{mouvement.piece?.designation}</div>
                      <div className="text-sm text-gray-500">{mouvement.piece?.reference}</div>
                    </td>
                    <td className={`px-6 py-4 text-right font-bold ${mouvement.quantite > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {mouvement.quantite > 0 ? '+' : ''}{mouvement.quantite}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {mouvement.type === 'ENTREE' && mouvement.typeEntree && typeEntreeLabels[mouvement.typeEntree]}
                      {mouvement.type === 'SORTIE' && mouvement.motif && motifLabels[mouvement.motif]}
                      {mouvement.fournisseur && ` - ${mouvement.fournisseur.raisonSociale}`}
                      {mouvement.camion && ` - ${mouvement.camion.immatriculation}`}
                    </td>
                  </tr>
                ))}
                {(!mouvements || mouvements.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      Aucun mouvement enregistré
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fournisseurs Tab */}
      {activeTab === 'fournisseurs' && (
        <div>
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => openFournisseurModal()}
              className="bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-yellow-400"
            >
              + Nouveau fournisseur
            </button>
          </div>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Raison sociale</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Adresse</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Téléphone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {fournisseurs?.map((fournisseur) => (
                  <tr key={fournisseur.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-sm text-gray-900">{fournisseur.code}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{fournisseur.raisonSociale}</td>
                    <td className="px-6 py-4 text-gray-500">{fournisseur.adresse || '-'}</td>
                    <td className="px-6 py-4 text-gray-500">{fournisseur.telephone || '-'}</td>
                    <td className="px-6 py-4 text-gray-500">{fournisseur.email || '-'}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openFournisseurModal(fournisseur)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDeleteFournisseur(fournisseur)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
                {(!fournisseurs || fournisseurs.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      Aucun fournisseur enregistré
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Pièce */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingPiece ? 'Modifier la pièce' : 'Nouvelle pièce'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Référence *</label>
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="REF-001"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Désignation *</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Filtre à huile"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Catégorie</label>
                  <select
                    value={formData.categorie}
                    onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">-- Sélectionner --</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Source / Origine</label>
                  <input
                    type="text"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Ex: Dépannage, Fournisseur X, Stock initial"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock minimum</label>
                    <input
                      type="number"
                      value={formData.stockMinimum}
                      onChange={(e) => setFormData({ ...formData, stockMinimum: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock maximum</label>
                    <input
                      type="number"
                      value={formData.stockMaximum}
                      onChange={(e) => setFormData({ ...formData, stockMaximum: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
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

      {/* Modal Sortie */}
      {showSortieModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Nouvelle sortie de pièces</h2>
            <form onSubmit={handleSubmitSortie}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Camion *</label>
                    <select
                      value={sortieForm.camionId}
                      onChange={(e) => setSortieForm({ ...sortieForm, camionId: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    >
                      <option value={0}>-- Sélectionner --</option>
                      {camions?.map((camion) => (
                        <option key={camion.id} value={camion.id}>
                          {camion.immatriculation} - {camion.typeCamion}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kilométrage</label>
                    <input
                      type="number"
                      value={sortieForm.kilometrageCamion}
                      onChange={(e) => setSortieForm({ ...sortieForm, kilometrageCamion: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="km"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motif *</label>
                  <select
                    value={sortieForm.motif}
                    onChange={(e) => setSortieForm({ ...sortieForm, motif: e.target.value as MotifSortie })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    {Object.entries(motifLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                  <textarea
                    value={sortieForm.notes}
                    onChange={(e) => setSortieForm({ ...sortieForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    rows={2}
                    placeholder="Notes additionnelles..."
                  />
                </div>

                {/* Lignes */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pièces *</label>
                    <button
                      type="button"
                      onClick={addLigne}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Ajouter une pièce
                    </button>
                  </div>
                  <div className="space-y-2">
                    {sortieForm.lignes.map((ligne, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <select
                          value={ligne.pieceId}
                          onChange={(e) => updateLigne(index, 'pieceId', Number(e.target.value))}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                          <option value={0}>-- Sélectionner une pièce --</option>
                          {pieces?.map((piece) => (
                            <option key={piece.id} value={piece.id}>
                              {piece.reference} - {piece.designation} (stock: {getStockForPiece(piece.id)})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={ligne.quantite}
                          onChange={(e) => updateLigne(index, 'quantite', Number(e.target.value))}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="Qté"
                          min={1}
                        />
                        {sortieForm.lignes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLigne(index)}
                            className="p-2 text-red-600 hover:text-red-800"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={closeSortieModal} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createSortieMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 disabled:opacity-50"
                >
                  {createSortieMutation.isPending ? 'Enregistrement...' : 'Enregistrer la sortie'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Détail Sortie */}
      {showDetailModal && selectedSortie && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bon de sortie {selectedSortie.numeroBon}</h2>
                <p className="text-gray-500">
                  {new Date(selectedSortie.dateSortie).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <span className={`px-3 py-1 rounded text-sm ${
                selectedSortie.motif === 'PANNE' ? 'bg-red-100 text-red-800' :
                selectedSortie.motif === 'REPARATION' ? 'bg-orange-100 text-orange-800' :
                selectedSortie.motif === 'MAINTENANCE' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {motifLabels[selectedSortie.motif]}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500">Camion</p>
                <p className="font-medium text-gray-900">
                  {selectedSortie.camion?.immatriculation} - {selectedSortie.camion?.typeCamion}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Kilométrage</p>
                <p className="font-medium text-gray-900">
                  {selectedSortie.kilometrageCamion ? `${selectedSortie.kilometrageCamion.toLocaleString()} km` : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Créé par</p>
                <p className="font-medium text-gray-900">
                  {selectedSortie.createur?.prenom} {selectedSortie.createur?.nom}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date création</p>
                <p className="font-medium text-gray-900">
                  {new Date(selectedSortie.createdAt).toLocaleString('fr-FR')}
                </p>
              </div>
            </div>

            {selectedSortie.notes && (
              <div className="mb-6">
                <p className="text-sm text-gray-500">Notes</p>
                <p className="text-gray-900">{selectedSortie.notes}</p>
              </div>
            )}

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Pièces sorties</h3>
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pièce</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Quantité</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedSortie.lignes?.map((ligne) => (
                      <tr key={ligne.id}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{ligne.piece?.designation}</div>
                          <div className="text-sm text-gray-500">{ligne.piece?.reference}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {ligne.quantite}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

      {/* Modal Entrée */}
      {showEntreeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Nouvelle entrée de stock</h2>
            <form onSubmit={handleSubmitEntree}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type d'entrée *</label>
                    <select
                      value={entreeForm.typeEntree}
                      onChange={(e) => setEntreeForm({ ...entreeForm, typeEntree: e.target.value as TypeEntree })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      {Object.entries(typeEntreeLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fournisseur</label>
                    <select
                      value={entreeForm.fournisseurId}
                      onChange={(e) => setEntreeForm({ ...entreeForm, fournisseurId: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value={0}>-- Sélectionner --</option>
                      {fournisseurs?.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.raisonSociale}
                        </option>
                      ))}
                      <option value={-1}>Autres</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">N° Facture</label>
                    <input
                      type="text"
                      value={entreeForm.numeroFacture}
                      onChange={(e) => setEntreeForm({ ...entreeForm, numeroFacture: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="FAC-2024-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">N° Bon de livraison</label>
                    <input
                      type="text"
                      value={entreeForm.numeroBL}
                      onChange={(e) => setEntreeForm({ ...entreeForm, numeroBL: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="BL-2024-001"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                  <textarea
                    value={entreeForm.notes}
                    onChange={(e) => setEntreeForm({ ...entreeForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    rows={2}
                    placeholder="Notes additionnelles..."
                  />
                </div>

                {/* Lignes */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pièces *</label>
                    <button
                      type="button"
                      onClick={addLigneEntree}
                      className="text-sm text-green-600 hover:text-green-800"
                    >
                      + Ajouter une pièce
                    </button>
                  </div>
                  <div className="space-y-2">
                    {entreeForm.lignes.map((ligne, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <select
                          value={ligne.pieceId}
                          onChange={(e) => updateLigneEntree(index, 'pieceId', Number(e.target.value))}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                          <option value={0}>-- Sélectionner une pièce --</option>
                          {pieces?.map((piece) => (
                            <option key={piece.id} value={piece.id}>
                              {piece.reference} - {piece.designation}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={ligne.quantite}
                          onChange={(e) => updateLigneEntree(index, 'quantite', Number(e.target.value))}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="Qté"
                          min={1}
                        />
                        <input
                          type="number"
                          value={ligne.prixUnitaire}
                          onChange={(e) => updateLigneEntree(index, 'prixUnitaire', Number(e.target.value))}
                          className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="Prix unit."
                          min={0}
                          step="0.01"
                        />
                        {entreeForm.lignes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLigneEntree(index)}
                            className="p-2 text-red-600 hover:text-red-800"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={closeEntreeModal} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createEntreeMutation.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-500 disabled:opacity-50"
                >
                  {createEntreeMutation.isPending ? 'Enregistrement...' : 'Enregistrer l\'entrée'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Détail Entrée */}
      {showEntreeDetailModal && selectedEntree && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bon d'entrée {selectedEntree.numeroBon}</h2>
                <p className="text-gray-500">
                  {new Date(selectedEntree.dateEntree).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <span className={`px-3 py-1 rounded text-sm ${
                selectedEntree.typeEntree === 'ACHAT' ? 'bg-green-100 text-green-800' :
                selectedEntree.typeEntree === 'RETOUR' ? 'bg-orange-100 text-orange-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {typeEntreeLabels[selectedEntree.typeEntree]}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500">Fournisseur</p>
                <p className="font-medium text-gray-900">
                  {selectedEntree.fournisseur?.raisonSociale || 'Autres'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">N° Facture</p>
                <p className="font-medium text-gray-900">
                  {selectedEntree.numeroFacture || '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">N° Bon de livraison</p>
                <p className="font-medium text-gray-900">
                  {selectedEntree.numeroBL || '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Créé par</p>
                <p className="font-medium text-gray-900">
                  {selectedEntree.createur?.prenom} {selectedEntree.createur?.nom}
                </p>
              </div>
            </div>

            {selectedEntree.notes && (
              <div className="mb-6">
                <p className="text-sm text-gray-500">Notes</p>
                <p className="text-gray-900">{selectedEntree.notes}</p>
              </div>
            )}

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Pièces reçues</h3>
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pièce</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Quantité</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Prix unit.</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedEntree.lignes?.map((ligne) => (
                      <tr key={ligne.id}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{ligne.piece?.designation}</div>
                          <div className="text-sm text-gray-500">{ligne.piece?.reference}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {ligne.quantite}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {ligne.prixUnitaire ? `${ligne.prixUnitaire.toFixed(2)} DH` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {ligne.prixUnitaire ? `${(ligne.quantite * ligne.prixUnitaire).toFixed(2)} DH` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100">
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-right font-medium text-gray-700">Total</td>
                      <td className="px-4 py-2 text-right font-bold text-gray-900">
                        {selectedEntree.lignes?.reduce((sum, l) => sum + (l.quantite * (l.prixUnitaire || 0)), 0).toFixed(2)} DH
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowEntreeDetailModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Fournisseur */}
      {showFournisseurModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingFournisseur ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
            </h2>
            <form onSubmit={handleSubmitFournisseur}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Raison sociale *</label>
                  <input
                    type="text"
                    value={fournisseurForm.raisonSociale}
                    onChange={(e) => setFournisseurForm({ ...fournisseurForm, raisonSociale: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Nom de l'entreprise"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Adresse</label>
                  <input
                    type="text"
                    value={fournisseurForm.adresse}
                    onChange={(e) => setFournisseurForm({ ...fournisseurForm, adresse: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Adresse complète"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={fournisseurForm.telephone}
                    onChange={(e) => setFournisseurForm({ ...fournisseurForm, telephone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="06 00 00 00 00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={fournisseurForm.email}
                    onChange={(e) => setFournisseurForm({ ...fournisseurForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="contact@entreprise.com"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={closeFournisseurModal} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createFournisseurMutation.isPending || updateFournisseurMutation.isPending}
                  className="px-4 py-2 bg-yellow-500 text-gray-900 rounded-lg font-medium hover:bg-yellow-400 disabled:opacity-50"
                >
                  {createFournisseurMutation.isPending || updateFournisseurMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Inventaire */}
      {showInventaireModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Ajustement de stock (Inventaire)</h2>
            <form onSubmit={handleSubmitInventaire}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pièce *</label>
                  <select
                    value={inventaireForm.pieceId}
                    onChange={(e) => {
                      const pieceId = Number(e.target.value);
                      setInventaireForm({
                        ...inventaireForm,
                        pieceId,
                        nouvelleQuantite: pieceId ? getStockForPiece(pieceId) : 0,
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  >
                    <option value={0}>-- Sélectionner une pièce --</option>
                    {pieces?.map((piece) => (
                      <option key={piece.id} value={piece.id}>
                        {piece.reference} - {piece.designation} (stock actuel: {getStockForPiece(piece.id)})
                      </option>
                    ))}
                  </select>
                </div>
                {inventaireForm.pieceId > 0 && (
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Stock actuel: <span className="font-bold">{getStockForPiece(inventaireForm.pieceId)}</span></p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nouvelle quantité *</label>
                  <input
                    type="number"
                    value={inventaireForm.nouvelleQuantite}
                    onChange={(e) => setInventaireForm({ ...inventaireForm, nouvelleQuantite: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    min={0}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motif de l'ajustement *</label>
                  <textarea
                    value={inventaireForm.motif}
                    onChange={(e) => setInventaireForm({ ...inventaireForm, motif: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    rows={2}
                    placeholder="Ex: Correction suite inventaire physique"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={closeInventaireModal} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={ajusterStockMutation.isPending}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-500 disabled:opacity-50"
                >
                  {ajusterStockMutation.isPending ? 'Enregistrement...' : 'Ajuster le stock'}
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
