import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import clientsService from '../services/clients.service';
import type { Client, CreateClientDto, ClientHistorique } from '../services/clients.service';
import { exportToCSV, printTable } from '../utils/export';
import { useToast } from '../components/ui/Toast';
import { SkeletonTable, Breadcrumb } from '../components/ui';
import { useEscapeKey } from '../hooks/useKeyboardShortcuts';

type ClientFilter = 'all' | 'actifs' | 'avecContact';

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [showHistorique, setShowHistorique] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeFilter, setActiveFilter] = useState<ClientFilter>('all');

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ show: false, title: '', message: '', onConfirm: () => {} });

  const [formData, setFormData] = useState<CreateClientDto>({
    code: '',
    raisonSociale: '',
    adresse: '',
    telephone: '',
    email: '',
    contactNom: '',
  });

  const { data: clients, isLoading, error } = useQuery({
    queryKey: ['clients'],
    queryFn: clientsService.getAll,
  });

  const { data: historique, isLoading: loadingHistorique } = useQuery({
    queryKey: ['client-historique', selectedClient?.id],
    queryFn: () => clientsService.getHistorique(selectedClient!.id),
    enabled: !!selectedClient && showHistorique,
  });

  const createMutation = useMutation({
    mutationFn: clientsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      closeModal();
      toast.success('Client créé avec succès');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erreur lors de la création';
      setErrors({ submit: message });
      toast.error(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateClientDto> }) =>
      clientsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      closeModal();
      toast.success('Client modifié avec succès');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erreur lors de la modification';
      setErrors({ submit: message });
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: clientsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client désactivé avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la désactivation du client');
    },
  });

  // Validation des champs
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Code obligatoire
    if (!formData.code.trim()) {
      newErrors.code = 'Le code est obligatoire';
    } else if (formData.code.length > 20) {
      newErrors.code = 'Le code ne doit pas dépasser 20 caractères';
    }

    // Raison sociale obligatoire
    if (!formData.raisonSociale.trim()) {
      newErrors.raisonSociale = 'La raison sociale est obligatoire';
    } else if (formData.raisonSociale.length > 200) {
      newErrors.raisonSociale = 'La raison sociale ne doit pas dépasser 200 caractères';
    }

    // Email valide si fourni
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Format d\'email invalide';
      }
    }

    // Téléphone sénégalais si fourni (mobiles 7X ou fixes 33)
    if (formData.telephone && formData.telephone.trim()) {
      const cleanPhone = formData.telephone.replace(/\s/g, '');
      const phoneRegex = /^(\+221)?(7[0-8]|33)\d{7}$/;
      if (!phoneRegex.test(cleanPhone)) {
        newErrors.telephone = 'Format téléphone invalide. Ex: +221 77 123 45 67 ou +221 33 834 87 89';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const openCreateModal = async () => {
    setEditingClient(null);
    setErrors({});
    // Générer un nouveau code
    try {
      const newCode = await clientsService.generateCode();
      setFormData({
        code: newCode,
        raisonSociale: '',
        adresse: '',
        telephone: '+221 ',
        email: '',
        contactNom: '',
      });
    } catch {
      setFormData({
        code: '',
        raisonSociale: '',
        adresse: '',
        telephone: '+221 ',
        email: '',
        contactNom: '',
      });
    }
    setShowModal(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setErrors({});
    setFormData({
      code: client.code,
      raisonSociale: client.raisonSociale,
      adresse: client.adresse || '',
      telephone: client.telephone || '',
      email: client.email || '',
      contactNom: client.contactNom || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingClient(null);
    setErrors({});
  };

  // Keyboard shortcuts - fermer modals avec Escape
  useEscapeKey(() => {
    if (confirmModal.show) {
      setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
    } else if (showHistorique) {
      setShowHistorique(false);
      setSelectedClient(null);
    } else if (showModal) {
      closeModal();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (editingClient) {
      // Show confirmation for edits
      setConfirmModal({
        show: true,
        title: 'Confirmer la modification',
        message: `Voulez-vous vraiment modifier le client ${editingClient.raisonSociale} ?`,
        onConfirm: () => {
          updateMutation.mutate({ id: editingClient.id, data: formData });
          setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
        },
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (client: Client) => {
    setConfirmModal({
      show: true,
      title: 'Confirmer la désactivation',
      message: `Voulez-vous vraiment désactiver le client ${client.raisonSociale} ?`,
      onConfirm: () => {
        deleteMutation.mutate(client.id);
        setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
      },
    });
  };

  const openHistorique = (client: Client) => {
    setSelectedClient(client);
    setShowHistorique(true);
  };

  const formatCurrency = (amount: number) => {
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount)} FCFA`;
  };

  const exportHistoriqueCSV = (client: Client, data: ClientHistorique) => {
    const lines: string[] = [];

    lines.push(`Historique des prestations - ${client.raisonSociale} (${client.code})`);
    lines.push(`Exporté le ${new Date().toLocaleDateString('fr-FR')}`);
    lines.push('');

    lines.push('=== RÉSUMÉ ===');
    lines.push(`Total opérations;${data.stats.totalOperations}`);
    lines.push(`Transports;${data.stats.totalTransports}`);
    lines.push(`Locations;${data.stats.totalLocations}`);
    lines.push(`Revenus totaux;${data.stats.totalRevenus} FCFA`);
    lines.push(`En cours;${data.stats.enCours}`);
    lines.push('');

    if (data.transports.length > 0) {
      lines.push('=== BONS DE TRANSPORT ===');
      lines.push('Date;N°;Trajet;Nature;Camion;Chauffeur;Poids (kg);Statut;Montant (FCFA)');
      data.transports.forEach((t: any) => {
        const date = new Date(t.dateChargement || t.createdAt).toLocaleDateString('fr-FR');
        const trajet = `${t.lieuChargement || '?'} → ${t.lieuDechargement || '?'}`;
        lines.push(`${date};${t.numero};${trajet};${t.natureChargement || '-'};${t.camion?.immatriculation || '-'};${t.chauffeur?.nom || '-'} ${t.chauffeur?.prenom || ''};${t.poidsKg || 0};${t.statut};${t.montantHt || 0}`);
      });
      lines.push('');
    }

    if (data.locations.length > 0) {
      lines.push('=== BONS DE LOCATION ===');
      lines.push('Date début;Date fin;N°;Camion;Chauffeur;Durée (j);Tarif/jour (FCFA);Statut;Montant (FCFA)');
      data.locations.forEach((l: any) => {
        const dateDebut = l.dateDebut ? new Date(l.dateDebut).toLocaleDateString('fr-FR') : '-';
        const dateFin = (l.dateFinReelle || l.dateFinPrevue) ? new Date(l.dateFinReelle || l.dateFinPrevue).toLocaleDateString('fr-FR') : '-';
        const duree = l.dateDebut && (l.dateFinReelle || l.dateFinPrevue)
          ? Math.ceil((new Date(l.dateFinReelle || l.dateFinPrevue).getTime() - new Date(l.dateDebut).getTime()) / (1000 * 60 * 60 * 24))
          : '-';
        lines.push(`${dateDebut};${dateFin};${l.numero};${l.camion?.immatriculation || '-'};${l.chauffeur?.nom || '-'} ${l.chauffeur?.prenom || ''};${duree};${l.tarifJournalier || '-'};${l.statut};${l.montantTotal || 0}`);
      });
    }

    const BOM = '\uFEFF';
    const csvContent = BOM + lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historique_client_${client.code}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printHistorique = (client: Client, data: ClientHistorique) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Historique - ${client.raisonSociale}</title>
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
          .text-right { text-align: right; }
          .footer { margin-top: 30px; text-align: center; color: #9ca3af; font-size: 10px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Historique des Prestations</h1>
        <div class="subtitle">${client.raisonSociale} - Code: ${client.code}</div>
        ${client.adresse ? `<div class="subtitle">Adresse: ${client.adresse}</div>` : ''}

        <div class="stats">
          <div class="stat-box">
            <div class="stat-value">${data.stats.totalOperations}</div>
            <div class="stat-label">Total opérations</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${new Intl.NumberFormat('fr-FR').format(data.stats.totalRevenus)} FCFA</div>
            <div class="stat-label">Chiffre d'affaires</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${data.stats.totalTransports}</div>
            <div class="stat-label">Transports</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${data.stats.totalLocations}</div>
            <div class="stat-label">Locations</div>
          </div>
        </div>

        ${data.transports.length > 0 ? `
          <h2>Bons de Transport (${data.transports.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>N°</th>
                <th>Trajet</th>
                <th>Nature</th>
                <th>Camion</th>
                <th>Chauffeur</th>
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
                  <td>${t.lieuChargement || '?'} → ${t.lieuDechargement || '?'}</td>
                  <td>${t.natureChargement ? t.natureChargement.replace(/_/g, ' ') : '-'}</td>
                  <td>${t.camion?.immatriculation || '-'}</td>
                  <td>${t.chauffeur?.prenom || ''} ${t.chauffeur?.nom || '-'}</td>
                  <td class="text-right">${t.poidsKg ? Number(t.poidsKg).toLocaleString() + ' kg' : '-'}</td>
                  <td><span class="badge ${t.statut === 'LIVRE' || t.statut === 'FACTURE' ? 'badge-green' : 'badge-blue'}">${t.statut}</span></td>
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
                <th>Camion</th>
                <th>Chauffeur</th>
                <th class="text-right">Durée</th>
                <th class="text-right">Tarif/jour</th>
                <th>Statut</th>
                <th class="text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              ${data.locations.map((l: any) => {
                const dateDebut = l.dateDebut ? new Date(l.dateDebut) : null;
                const dateFin = l.dateFinReelle || l.dateFinPrevue ? new Date(l.dateFinReelle || l.dateFinPrevue) : null;
                const duree = dateDebut && dateFin ? Math.ceil((dateFin.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24)) : null;
                return `
                <tr>
                  <td>${dateDebut ? dateDebut.toLocaleDateString('fr-FR') : '-'} → ${dateFin ? dateFin.toLocaleDateString('fr-FR') : '-'}</td>
                  <td>${l.numero}</td>
                  <td>${l.camion?.immatriculation || '-'}</td>
                  <td>${l.chauffeur?.prenom || ''} ${l.chauffeur?.nom || '-'}</td>
                  <td class="text-right">${duree !== null ? duree + ' j' : '-'}</td>
                  <td class="text-right">${l.tarifJournalier ? new Intl.NumberFormat('fr-FR').format(l.tarifJournalier) + ' FCFA' : '-'}</td>
                  <td><span class="badge ${l.statut === 'LIVRE' || l.statut === 'FACTURE' ? 'badge-green' : 'badge-blue'}">${l.statut}</span></td>
                  <td class="text-right">${new Intl.NumberFormat('fr-FR').format(l.montantTotal || 0)} FCFA</td>
                </tr>
              `}).join('')}
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des Clients</h1>
            <p className="text-gray-600 dark:text-gray-300">Gérez vos clients et consultez leur historique de prestations</p>
          </div>
        </div>
        <SkeletonTable rows={8} columns={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-lg">
        Erreur lors du chargement des clients
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb />
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des Clients</h1>
          <p className="text-gray-600 dark:text-gray-300">Gérez vos clients et consultez leur historique de prestations</p>
        </div>
        <button onClick={openCreateModal} className="bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-yellow-400 dark:hover:bg-yellow-600 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau client
        </button>
      </div>

      {/* Stats - Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div
          onClick={() => setActiveFilter('all')}
          className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${
            activeFilter === 'all' ? 'ring-2 ring-yellow-500 bg-yellow-50 dark:bg-yellow-900/30' : ''
          }`}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">Total clients</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{clients?.length || 0}</p>
        </div>
        <div
          onClick={() => setActiveFilter('actifs')}
          className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${
            activeFilter === 'actifs' ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/30' : ''
          }`}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">Clients actifs</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {clients?.filter(c => c.actif).length || 0}
          </p>
        </div>
        <div
          onClick={() => setActiveFilter('avecContact')}
          className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${
            activeFilter === 'avecContact' ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30' : ''
          }`}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">Avec contact</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {clients?.filter(c => c.contactNom).length || 0}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        {/* Export buttons */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            onClick={() => {
              const filteredClients = clients?.filter(client => {
                if (activeFilter === 'actifs') return client.actif;
                if (activeFilter === 'avecContact') return client.contactNom;
                return true;
              });
              if (!filteredClients || filteredClients.length === 0) return;
              exportToCSV(
                filteredClients.map(c => ({
                  code: c.code,
                  raisonSociale: c.raisonSociale,
                  adresse: c.adresse || '-',
                  telephone: c.telephone || '-',
                  email: c.email || '-',
                  contact: c.contactNom || '-',
                })),
                'clients',
                [
                  { key: 'code', label: 'Code' },
                  { key: 'raisonSociale', label: 'Raison Sociale' },
                  { key: 'adresse', label: 'Adresse' },
                  { key: 'telephone', label: 'Téléphone' },
                  { key: 'email', label: 'Email' },
                  { key: 'contact', label: 'Contact' },
                ]
              );
            }}
            disabled={!clients || clients.filter(c => {
              if (activeFilter === 'actifs') return c.actif;
              if (activeFilter === 'avecContact') return c.contactNom;
              return true;
            }).length === 0}
            className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exporter CSV ({clients?.filter(c => {
              if (activeFilter === 'actifs') return c.actif;
              if (activeFilter === 'avecContact') return c.contactNom;
              return true;
            }).length || 0})
          </button>
          <button
            onClick={() => {
              const filteredClients = clients?.filter(client => {
                if (activeFilter === 'actifs') return client.actif;
                if (activeFilter === 'avecContact') return client.contactNom;
                return true;
              });
              if (!filteredClients || filteredClients.length === 0) return;
              printTable(
                'Liste des Clients',
                ['Code', 'Raison Sociale', 'Contact', 'Téléphone', 'Email'],
                filteredClients.map(c => [
                  c.code,
                  c.raisonSociale,
                  c.contactNom || '-',
                  c.telephone || '-',
                  c.email || '-',
                ])
              );
            }}
            disabled={!clients || clients.filter(c => {
              if (activeFilter === 'actifs') return c.actif;
              if (activeFilter === 'avecContact') return c.contactNom;
              return true;
            }).length === 0}
            className="px-3 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimer
          </button>
        </div>
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Raison sociale</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Téléphone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Email</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {clients?.filter(client => {
              if (activeFilter === 'actifs') return client.actif;
              if (activeFilter === 'avecContact') return client.contactNom;
              return true;
            }).map((client) => (
              <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 rounded text-sm font-medium">
                    {client.code}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900 dark:text-white">{client.raisonSociale}</div>
                  {client.adresse && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs" title={client.adresse}>
                      {client.adresse}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-900 dark:text-gray-300">{client.contactNom || '-'}</td>
                <td className="px-6 py-4 text-gray-900 dark:text-gray-300">{client.telephone || '-'}</td>
                <td className="px-6 py-4 text-gray-900 dark:text-gray-300">
                  {client.email ? (
                    <a href={`mailto:${client.email}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                      {client.email}
                    </a>
                  ) : '-'}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => openHistorique(client)}
                    className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 mr-3"
                    title="Voir l'historique des prestations"
                  >
                    Historique
                  </button>
                  <button
                    onClick={() => openEditModal(client)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-3"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(client)}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
            {clients?.filter(client => {
              if (activeFilter === 'actifs') return client.actif;
              if (activeFilter === 'avecContact') return client.contactNom;
              return true;
            }).length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  {activeFilter === 'all'
                    ? 'Aucun client enregistré. Cliquez sur "Nouveau client" pour en ajouter un.'
                    : activeFilter === 'actifs'
                    ? 'Aucun client actif.'
                    : 'Aucun client avec contact renseigné.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Création/Édition */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingClient ? 'Modifier le client' : 'Nouveau client'}
            </h2>

            {errors.submit && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
                {errors.submit}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code *</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:text-white ${errors.code ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                      placeholder="CLI-001"
                      maxLength={20}
                      required
                    />
                    {errors.code && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.code}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact</label>
                    <input
                      type="text"
                      value={formData.contactNom}
                      onChange={(e) => setFormData({ ...formData, contactNom: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      placeholder="Nom du contact"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Raison sociale *</label>
                  <input
                    type="text"
                    value={formData.raisonSociale}
                    onChange={(e) => setFormData({ ...formData, raisonSociale: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:text-white ${errors.raisonSociale ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder="Nom de l'entreprise"
                    maxLength={200}
                    required
                  />
                  {errors.raisonSociale && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.raisonSociale}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Adresse</label>
                  <textarea
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="Adresse complète"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Téléphone</label>
                    <input
                      type="tel"
                      value={formData.telephone}
                      onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:text-white ${errors.telephone ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                      placeholder="+221 77 123 45 67"
                    />
                    {errors.telephone && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.telephone}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:text-white ${errors.email ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                      placeholder="contact@entreprise.sn"
                    />
                    {errors.email && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.email}</p>}
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
                  className="px-4 py-2 bg-yellow-500 text-gray-900 rounded-lg font-medium hover:bg-yellow-400 dark:hover:bg-yellow-600 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Historique */}
      {showHistorique && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Historique des prestations - {selectedClient.raisonSociale}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Code: {selectedClient.code}</p>
                {selectedClient.adresse && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedClient.adresse}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {historique && (
                  <>
                    <button
                      onClick={() => exportHistoriqueCSV(selectedClient, historique)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-500"
                      title="Exporter en CSV"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      CSV
                    </button>
                    <button
                      onClick={() => printHistorique(selectedClient, historique)}
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
                <button onClick={() => setShowHistorique(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 ml-2">
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
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                    <p className="text-sm text-blue-600 dark:text-blue-400">Total opérations</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{historique.stats.totalOperations}</p>
                    <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                      {historique.stats.enCours} en cours
                    </p>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg">
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">Chiffre d'affaires</p>
                    <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{formatCurrency(historique.stats.totalRevenus)}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
                    <p className="text-sm text-green-600 dark:text-green-400">Transports</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">{historique.stats.totalTransports}</p>
                    <p className="text-xs text-green-500 dark:text-green-400 mt-1">{formatCurrency(historique.stats.revenusTransport)}</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg">
                    <p className="text-sm text-purple-600 dark:text-purple-400">Locations</p>
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{historique.stats.totalLocations}</p>
                    <p className="text-xs text-purple-500 dark:text-purple-400 mt-1">{formatCurrency(historique.stats.revenusLocation)}</p>
                  </div>
                </div>

                {/* Transports */}
                {historique.transports.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 dark:text-white">
                      <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                      Bons de Transport ({historique.transports.length})
                    </h3>
                    <div className="border dark:border-gray-700 rounded-lg overflow-hidden overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">N°</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Trajet</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Nature</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Camion</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Chauffeur</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300">Poids</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Statut</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300">Montant</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {historique.transports.map((t: any) => (
                            <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="px-4 py-2 text-sm whitespace-nowrap dark:text-gray-300">{new Date(t.dateChargement || t.createdAt).toLocaleDateString('fr-FR')}</td>
                              <td className="px-4 py-2 text-sm font-medium dark:text-white">{t.numero}</td>
                              <td className="px-4 py-2 text-sm dark:text-gray-300">
                                <span className="flex items-center gap-1">
                                  <span className="truncate max-w-[100px]" title={t.lieuChargement}>{t.lieuChargement || '?'}</span>
                                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                  </svg>
                                  <span className="truncate max-w-[100px]" title={t.lieuDechargement}>{t.lieuDechargement || '?'}</span>
                                </span>
                              </td>
                              <td className="px-4 py-2 text-sm">
                                {t.natureChargement && (
                                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-xs rounded">
                                    {t.natureChargement.replace(/_/g, ' ')}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-sm dark:text-gray-300">{t.camion?.immatriculation || '-'}</td>
                              <td className="px-4 py-2 text-sm dark:text-gray-300">{t.chauffeur?.prenom} {t.chauffeur?.nom || '-'}</td>
                              <td className="px-4 py-2 text-sm text-right dark:text-gray-300">{t.poidsKg ? `${Number(t.poidsKg).toLocaleString()} kg` : '-'}</td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-1 text-xs rounded ${
                                  t.statut === 'LIVRE' || t.statut === 'FACTURE' ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300' :
                                  t.statut === 'EN_COURS' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300' :
                                  t.statut === 'ANNULE' ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                                }`}>
                                  {t.statut}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-sm text-right font-medium dark:text-white">{formatCurrency(t.montantHt || 0)}</td>
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
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 dark:text-white">
                      <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                      Bons de Location ({historique.locations.length})
                    </h3>
                    <div className="border dark:border-gray-700 rounded-lg overflow-hidden overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Période</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">N°</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Camion</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Chauffeur</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300">Durée</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300">Tarif/jour</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Statut</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300">Montant</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {historique.locations.map((l: any) => {
                            const dateDebut = l.dateDebut ? new Date(l.dateDebut) : null;
                            const dateFin = l.dateFinReelle || l.dateFinPrevue ? new Date(l.dateFinReelle || l.dateFinPrevue) : null;
                            const dureeJours = dateDebut && dateFin ? Math.ceil((dateFin.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24)) : null;
                            return (
                              <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="px-4 py-2 text-sm whitespace-nowrap dark:text-gray-300">
                                  {dateDebut ? dateDebut.toLocaleDateString('fr-FR') : '-'}
                                  {dateFin && <span className="text-gray-400"> → {dateFin.toLocaleDateString('fr-FR')}</span>}
                                </td>
                                <td className="px-4 py-2 text-sm font-medium dark:text-white">{l.numero}</td>
                                <td className="px-4 py-2 text-sm dark:text-gray-300">{l.camion?.immatriculation || '-'}</td>
                                <td className="px-4 py-2 text-sm dark:text-gray-300">{l.chauffeur?.prenom} {l.chauffeur?.nom || '-'}</td>
                                <td className="px-4 py-2 text-sm text-right dark:text-gray-300">{dureeJours !== null ? `${dureeJours} j` : '-'}</td>
                                <td className="px-4 py-2 text-sm text-right dark:text-gray-300">{l.tarifJournalier ? formatCurrency(l.tarifJournalier) : '-'}</td>
                                <td className="px-4 py-2">
                                  <span className={`px-2 py-1 text-xs rounded ${
                                    l.statut === 'LIVRE' || l.statut === 'FACTURE' ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300' :
                                    l.statut === 'EN_COURS' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300' :
                                    l.statut === 'ANNULE' ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                                  }`}>
                                    {l.statut}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-sm text-right font-medium dark:text-white">{formatCurrency(l.montantTotal || 0)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {historique.transports.length === 0 && historique.locations.length === 0 && (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    Aucun historique de prestation pour ce client
                  </div>
                )}
              </div>
            )}
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
