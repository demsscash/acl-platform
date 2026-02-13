import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import alertesService from '../services/alertes.service';
import type { DocumentExpiration } from '../services/alertes.service';
import camionsService from '../services/camions.service';
import chauffeursService from '../services/chauffeurs.service';

const niveauColors = {
  INFO: 'bg-blue-100 text-blue-800 border-blue-300',
  WARNING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  CRITICAL: 'bg-red-100 text-red-800 border-red-300',
};

const niveauLabels = {
  INFO: 'Info',
  WARNING: 'Attention',
  CRITICAL: 'Critique',
};

const typeLabels: Record<string, string> = {
  PIECE: 'Pièce',
  PNEU: 'Pneumatique',
  CARBURANT: 'Carburant',
  DOCUMENT: 'Document',
  MAINTENANCE: 'Maintenance',
  GPS: 'GPS',
};

const statutColors = {
  ACTIVE: 'bg-red-100 text-red-800',
  ACQUITTEE: 'bg-yellow-100 text-yellow-800',
  RESOLUE: 'bg-green-100 text-green-800',
};

// Map document type to field name
const documentFieldMap: Record<string, string> = {
  'Assurance': 'dateExpirationAssurance',
  'Visite technique': 'dateExpirationVisiteTechnique',
  'Patente': 'dateExpirationPatente',
  'Permis de conduire': 'dateExpirationPermis',
};

export default function AlertesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [filterStatut, setFilterStatut] = useState<string>('ACTIVE');
  const [filterNiveau, setFilterNiveau] = useState<string>('');

  // Edit modal state
  const [editingDoc, setEditingDoc] = useState<DocumentExpiration | null>(null);
  const [newExpirationDate, setNewExpirationDate] = useState('');

  // Navigation avec highlight
  const navigateToEntity = (type: 'camion' | 'chauffeur', entityId: number) => {
    const path = type === 'camion' ? '/camions' : '/chauffeurs';
    navigate(`${path}?highlight=${entityId}`);
  };

  // Open edit modal
  const openEditModal = (doc: DocumentExpiration) => {
    setEditingDoc(doc);
    // Set a default date 1 year from now
    const defaultDate = new Date();
    defaultDate.setFullYear(defaultDate.getFullYear() + 1);
    setNewExpirationDate(defaultDate.toISOString().split('T')[0]);
  };

  // Close edit modal
  const closeEditModal = () => {
    setEditingDoc(null);
    setNewExpirationDate('');
  };

  const { data: alertes, isLoading } = useQuery({
    queryKey: ['alertes', filterStatut],
    queryFn: () => alertesService.getAll(filterStatut || undefined),
  });

  const { data: stats } = useQuery({
    queryKey: ['alertes-stats'],
    queryFn: alertesService.getStats,
  });

  const acquitterMutation = useMutation({
    mutationFn: alertesService.acquitter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertes'] });
      queryClient.invalidateQueries({ queryKey: ['alertes-stats'] });
    },
  });

  const resoudreMutation = useMutation({
    mutationFn: alertesService.resoudre,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertes'] });
      queryClient.invalidateQueries({ queryKey: ['alertes-stats'] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: alertesService.checkDocuments,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertes'] });
      queryClient.invalidateQueries({ queryKey: ['alertes-stats'] });
      queryClient.invalidateQueries({ queryKey: ['expiring-documents'] });
    },
  });

  // Update camion expiration date
  const updateCamionMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, string> }) =>
      camionsService.update(id, data),
    onSuccess: async () => {
      // Re-synchronize alerts after update
      await alertesService.checkDocuments();
      queryClient.invalidateQueries({ queryKey: ['expiring-documents'] });
      queryClient.invalidateQueries({ queryKey: ['alertes'] });
      queryClient.invalidateQueries({ queryKey: ['alertes-stats'] });
      queryClient.invalidateQueries({ queryKey: ['camions'] });
      closeEditModal();
    },
  });

  // Update chauffeur expiration date
  const updateChauffeurMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, string> }) =>
      chauffeursService.update(id, data),
    onSuccess: async () => {
      // Re-synchronize alerts after update
      await alertesService.checkDocuments();
      queryClient.invalidateQueries({ queryKey: ['expiring-documents'] });
      queryClient.invalidateQueries({ queryKey: ['alertes'] });
      queryClient.invalidateQueries({ queryKey: ['alertes-stats'] });
      queryClient.invalidateQueries({ queryKey: ['chauffeurs'] });
      closeEditModal();
    },
  });

  // Handle save expiration date
  const handleSaveExpirationDate = () => {
    if (!editingDoc || !newExpirationDate) return;

    const fieldName = documentFieldMap[editingDoc.documentType];
    if (!fieldName) {
      console.error('Unknown document type:', editingDoc.documentType);
      return;
    }

    const data = { [fieldName]: newExpirationDate };

    if (editingDoc.type === 'camion') {
      updateCamionMutation.mutate({ id: editingDoc.entityId, data });
    } else {
      updateChauffeurMutation.mutate({ id: editingDoc.entityId, data });
    }
  };

  const { data: expiringDocs } = useQuery({
    queryKey: ['expiring-documents'],
    queryFn: () => alertesService.getExpiringDocuments(30),
  });

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
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Alertes</h1>
          <p className="text-gray-600">Suivi et traitement des alertes système</p>
        </div>
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-gray-900 font-medium rounded-lg hover:bg-yellow-400 disabled:opacity-50"
        >
          {syncMutation.isPending ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          Synchroniser
        </button>
      </div>

      {/* Stats - Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div
          onClick={() => { setFilterStatut(''); setFilterNiveau(''); }}
          className={`bg-white p-4 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${
            filterStatut === '' && filterNiveau === '' ? 'ring-2 ring-gray-500 bg-gray-50' : ''
          }`}
        >
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
        </div>
        <div
          onClick={() => { setFilterStatut(''); setFilterNiveau('CRITICAL'); }}
          className={`bg-white p-4 rounded-lg shadow-sm border-l-4 border-red-500 cursor-pointer transition-all hover:shadow-md ${
            filterNiveau === 'CRITICAL' ? 'ring-2 ring-red-500 bg-red-50' : ''
          }`}
        >
          <p className="text-sm text-gray-600">Critiques</p>
          <p className="text-2xl font-bold text-red-600">{stats?.critiques || 0}</p>
        </div>
        <div
          onClick={() => { setFilterStatut('ACTIVE'); setFilterNiveau(''); }}
          className={`bg-white p-4 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${
            filterStatut === 'ACTIVE' && filterNiveau === '' ? 'ring-2 ring-orange-500 bg-orange-50' : ''
          }`}
        >
          <p className="text-sm text-gray-600">Actives</p>
          <p className="text-2xl font-bold text-orange-600">{stats?.actives || 0}</p>
        </div>
        <div
          onClick={() => { setFilterStatut('ACQUITTEE'); setFilterNiveau(''); }}
          className={`bg-white p-4 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${
            filterStatut === 'ACQUITTEE' && filterNiveau === '' ? 'ring-2 ring-yellow-500 bg-yellow-50' : ''
          }`}
        >
          <p className="text-sm text-gray-600">Acquittées</p>
          <p className="text-2xl font-bold text-yellow-600">{stats?.acquittees || 0}</p>
        </div>
        <div
          onClick={() => { setFilterStatut('RESOLUE'); setFilterNiveau(''); }}
          className={`bg-white p-4 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${
            filterStatut === 'RESOLUE' && filterNiveau === '' ? 'ring-2 ring-green-500 bg-green-50' : ''
          }`}
        >
          <p className="text-sm text-gray-600">Résolues</p>
          <p className="text-2xl font-bold text-green-600">{stats?.resolues || 0}</p>
        </div>
      </div>

      {/* Documents expirants - Section améliorée */}
      {expiringDocs && expiringDocs.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Documents expirant dans les 30 jours ({expiringDocs.length})
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Préparez les renouvellements et mettez à jour les documents
            </p>
          </div>

          <div className="p-4 space-y-3">
            {expiringDocs.map((doc, index) => {
              const isExpired = doc.daysUntilExpiration <= 0;
              const isCritical = doc.daysUntilExpiration <= 7;
              const isWarning = doc.daysUntilExpiration <= 15;

              return (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 ${
                    isExpired ? 'border-red-400 bg-red-50' :
                    isCritical ? 'border-orange-400 bg-orange-50' :
                    isWarning ? 'border-yellow-400 bg-yellow-50' :
                    'border-blue-200 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isExpired ? 'bg-red-200' :
                        isCritical ? 'bg-orange-200' :
                        isWarning ? 'bg-yellow-200' :
                        'bg-blue-200'
                      }`}>
                        {doc.type === 'camion' ? (
                          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                      </div>

                      {/* Info */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            isExpired ? 'bg-red-600 text-white' :
                            isCritical ? 'bg-orange-600 text-white' :
                            isWarning ? 'bg-yellow-600 text-white' :
                            'bg-blue-600 text-white'
                          }`}>
                            {isExpired ? 'EXPIRÉ' :
                             isCritical ? 'URGENT' :
                             isWarning ? 'ATTENTION' :
                             'À PRÉVOIR'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {doc.type === 'camion' ? 'Camion' : 'Chauffeur'}
                          </span>
                        </div>

                        <h3 className="font-semibold text-gray-900">{doc.documentType}</h3>
                        <p className="text-sm text-gray-700">{doc.entityName}</p>

                        <div className="mt-2 flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm text-gray-600">
                            Date d'expiration: {new Date(doc.expirationDate).toLocaleDateString('fr-FR', {
                              day: 'numeric', month: 'long', year: 'numeric'
                            })}
                          </span>
                        </div>

                        <p className={`text-sm font-semibold mt-1 ${
                          isExpired ? 'text-red-700' :
                          isCritical ? 'text-orange-700' :
                          isWarning ? 'text-yellow-700' :
                          'text-blue-700'
                        }`}>
                          {doc.daysUntilExpiration < 0
                            ? `Document expiré depuis ${Math.abs(doc.daysUntilExpiration)} jour(s) - RENOUVELLEMENT OBLIGATOIRE`
                            : doc.daysUntilExpiration === 0
                            ? 'Expire AUJOURD\'HUI - Action immédiate requise'
                            : doc.daysUntilExpiration <= 7
                            ? `Expire dans ${doc.daysUntilExpiration} jour(s) - Préparez le renouvellement`
                            : `Expire dans ${doc.daysUntilExpiration} jour(s) - Planifiez le renouvellement`}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => openEditModal(doc)}
                        className="px-3 py-2 bg-yellow-500 text-gray-900 rounded-lg text-sm font-medium hover:bg-yellow-400 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Modifier la date
                      </button>
                      <button
                        onClick={() => navigateToEntity(doc.type as 'camion' | 'chauffeur', doc.entityId)}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Voir la fiche
                      </button>
                      {isExpired && (
                        <button
                          onClick={() => navigateToEntity(doc.type as 'camion' | 'chauffeur', doc.entityId)}
                          className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Mettre à jour
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Recommandation */}
                  <div className={`mt-3 p-3 rounded-lg ${
                    isExpired ? 'bg-red-100 border border-red-200' :
                    isCritical ? 'bg-orange-100 border border-orange-200' :
                    isWarning ? 'bg-yellow-100 border border-yellow-200' :
                    'bg-blue-100 border border-blue-200'
                  }`}>
                    <p className={`text-sm ${
                      isExpired ? 'text-red-800' :
                      isCritical ? 'text-orange-800' :
                      isWarning ? 'text-yellow-800' :
                      'text-blue-800'
                    }`}>
                      <strong>Action recommandée:</strong>{' '}
                      {isExpired
                        ? `Procédez immédiatement au renouvellement de ${doc.documentType.toLowerCase()}. Une fois le nouveau document obtenu, mettez à jour la fiche ${doc.type === 'camion' ? 'du camion' : 'du chauffeur'} et uploadez le justificatif.`
                        : isCritical
                        ? `Lancez la procédure de renouvellement de ${doc.documentType.toLowerCase()} dès maintenant pour éviter toute interruption.`
                        : isWarning
                        ? `Préparez les documents nécessaires pour le renouvellement de ${doc.documentType.toLowerCase()}. Prenez rendez-vous si nécessaire.`
                        : `Notez cette échéance dans votre planning pour anticiper le renouvellement de ${doc.documentType.toLowerCase()}.`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setFilterStatut(''); setFilterNiveau(''); }}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${
              filterStatut === '' && filterNiveau === '' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Toutes
          </button>
          <button
            onClick={() => { setFilterStatut(''); setFilterNiveau('CRITICAL'); }}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${
              filterNiveau === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Critiques ({stats?.critiques || 0})
          </button>
          <button
            onClick={() => { setFilterStatut('ACTIVE'); setFilterNiveau(''); }}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${
              filterStatut === 'ACTIVE' && filterNiveau === '' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Actives ({stats?.actives || 0})
          </button>
          <button
            onClick={() => { setFilterStatut('ACQUITTEE'); setFilterNiveau(''); }}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${
              filterStatut === 'ACQUITTEE' && filterNiveau === '' ? 'bg-yellow-500 text-gray-900' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Acquittées
          </button>
          <button
            onClick={() => { setFilterStatut('RESOLUE'); setFilterNiveau(''); }}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${
              filterStatut === 'RESOLUE' && filterNiveau === '' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Résolues
          </button>
        </div>
      </div>

      {/* Alertes List */}
      <div className="space-y-4">
        {alertes?.filter(alerte => filterNiveau ? alerte.niveau === filterNiveau : true).map((alerte) => (
          <div
            key={alerte.id}
            className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${
              alerte.niveau === 'CRITICAL' ? 'border-red-500' :
              alerte.niveau === 'WARNING' ? 'border-yellow-500' : 'border-blue-500'
            } ${alerte.camion ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
            onClick={() => {
              if (alerte.camion) {
                navigateToEntity('camion', alerte.camion.id);
              }
            }}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${niveauColors[alerte.niveau]}`}>
                    {niveauLabels[alerte.niveau]}
                  </span>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                    {typeLabels[alerte.typeAlerte] || alerte.typeAlerte}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statutColors[alerte.statut]}`}>
                    {alerte.statut}
                  </span>
                </div>
                <h3 className="font-medium text-gray-900">{alerte.titre}</h3>
                {alerte.message && (
                  <p className="text-sm text-gray-600 mt-1">{alerte.message}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  {alerte.camion && (
                    <span className="flex items-center gap-1 text-blue-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                      </svg>
                      {alerte.camion.immatriculation}
                      <span className="text-gray-400">(cliquer pour voir)</span>
                    </span>
                  )}
                  <span>{new Date(alerte.createdAt).toLocaleString('fr-FR')}</span>
                </div>
              </div>
              <div className="flex gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                {alerte.statut === 'ACTIVE' && (
                  <button
                    onClick={() => acquitterMutation.mutate(alerte.id)}
                    disabled={acquitterMutation.isPending}
                    className="px-3 py-1 bg-yellow-500 text-gray-900 rounded text-sm font-medium hover:bg-yellow-400 disabled:opacity-50"
                  >
                    Acquitter
                  </button>
                )}
                {(alerte.statut === 'ACTIVE' || alerte.statut === 'ACQUITTEE') && (
                  <button
                    onClick={() => resoudreMutation.mutate(alerte.id)}
                    disabled={resoudreMutation.isPending}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-500 disabled:opacity-50"
                  >
                    Résoudre
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {alertes?.filter(alerte => filterNiveau ? alerte.niveau === filterNiveau : true).length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center text-gray-500">
            Aucune alerte {filterNiveau === 'CRITICAL' ? 'critique' : filterStatut ? `avec le statut "${filterStatut}"` : ''}
          </div>
        )}
      </div>

      {/* Modal de modification de date d'expiration */}
      {editingDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">
                  Modifier la date d'expiration
                </h2>
                <button
                  onClick={closeEditModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Info document */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    editingDoc.type === 'camion' ? 'bg-blue-100' : 'bg-green-100'
                  }`}>
                    {editingDoc.type === 'camion' ? (
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{editingDoc.entityName}</p>
                    <p className="text-sm text-gray-500">{editingDoc.type === 'camion' ? 'Camion' : 'Chauffeur'}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-700">
                  <strong>Document:</strong> {editingDoc.documentType}
                </p>
                <p className="text-sm text-gray-500">
                  <strong>Ancienne date:</strong> {new Date(editingDoc.expirationDate).toLocaleDateString('fr-FR')}
                </p>
              </div>

              {/* Formulaire */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nouvelle date d'expiration
                  </label>
                  <input
                    type="date"
                    value={newExpirationDate}
                    onChange={(e) => setNewExpirationDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>

                {/* Raccourcis */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-gray-500">Raccourcis:</span>
                  {[
                    { label: '+6 mois', months: 6 },
                    { label: '+1 an', months: 12 },
                    { label: '+2 ans', months: 24 },
                  ].map(({ label, months }) => (
                    <button
                      key={months}
                      type="button"
                      onClick={() => {
                        const date = new Date();
                        date.setMonth(date.getMonth() + months);
                        setNewExpirationDate(date.toISOString().split('T')[0]);
                      }}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveExpirationDate}
                disabled={!newExpirationDate || updateCamionMutation.isPending || updateChauffeurMutation.isPending}
                className="px-4 py-2 bg-yellow-500 text-gray-900 font-medium rounded-lg hover:bg-yellow-400 disabled:opacity-50 flex items-center gap-2"
              >
                {(updateCamionMutation.isPending || updateChauffeurMutation.isPending) && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
