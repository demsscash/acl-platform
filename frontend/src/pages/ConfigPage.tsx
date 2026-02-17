import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configService } from '../services/config.service';
import type { ConfigSysteme } from '../services/config.service';
import { useToast } from '../components/ui/Toast';
import { useAuthStore } from '../stores/auth.store';

// SVG Icons
const SettingsIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const AlertIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const TruckIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const BoxIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const BuildingIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const FuelIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
  </svg>
);

const SaveIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const EditIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

// Configuration categories
const CONFIG_CATEGORIES = {
  carburant: {
    title: 'Carburant',
    icon: FuelIcon,
    color: 'yellow',
    keys: ['PRIX_CARBURANT_LITRE', 'SEUIL_ALERTE_CUVE'],
  },
  alertes: {
    title: 'Alertes & Documents',
    icon: AlertIcon,
    color: 'red',
    keys: ['JOURS_ALERTE_ASSURANCE', 'JOURS_ALERTE_VISITE_TECHNIQUE', 'JOURS_ALERTE_LICENCE', 'JOURS_ALERTE_PERMIS', 'KM_ALERTE_REVISION'],
  },
  transport: {
    title: 'Transport & Location',
    icon: TruckIcon,
    color: 'blue',
    keys: ['TVA_TAUX', 'TARIF_LOCATION_JOURNALIER_DEFAUT', 'PRIX_TONNE_DEFAUT'],
  },
  stock: {
    title: 'Stock & Pièces',
    icon: BoxIcon,
    color: 'green',
    keys: ['STOCK_MINIMUM_DEFAUT'],
  },
  entreprise: {
    title: 'Entreprise',
    icon: BuildingIcon,
    color: 'purple',
    keys: ['ENTREPRISE_NOM', 'ENTREPRISE_ADRESSE', 'ENTREPRISE_TELEPHONE', 'ENTREPRISE_EMAIL'],
  },
};

// Config display labels
const CONFIG_LABELS: Record<string, { label: string; unit?: string; type: 'number' | 'text' | 'currency' | 'percent' }> = {
  PRIX_CARBURANT_LITRE: { label: 'Prix du carburant par litre', unit: 'FCFA', type: 'currency' },
  SEUIL_ALERTE_CUVE: { label: 'Seuil alerte niveau cuve', unit: '%', type: 'percent' },
  JOURS_ALERTE_ASSURANCE: { label: 'Alerte expiration assurance', unit: 'jours', type: 'number' },
  JOURS_ALERTE_VISITE_TECHNIQUE: { label: 'Alerte expiration visite technique', unit: 'jours', type: 'number' },
  JOURS_ALERTE_LICENCE: { label: 'Alerte expiration licence', unit: 'jours', type: 'number' },
  JOURS_ALERTE_PERMIS: { label: 'Alerte expiration permis', unit: 'jours', type: 'number' },
  KM_ALERTE_REVISION: { label: 'Alerte kilométrage révision', unit: 'km', type: 'number' },
  TVA_TAUX: { label: 'Taux de TVA', unit: '%', type: 'percent' },
  TARIF_LOCATION_JOURNALIER_DEFAUT: { label: 'Tarif journalier location par défaut', unit: 'FCFA', type: 'currency' },
  PRIX_TONNE_DEFAUT: { label: 'Prix par tonne par défaut', unit: 'FCFA', type: 'currency' },
  STOCK_MINIMUM_DEFAUT: { label: 'Stock minimum par défaut', unit: 'unités', type: 'number' },
  ENTREPRISE_NOM: { label: 'Nom de l\'entreprise', type: 'text' },
  ENTREPRISE_ADRESSE: { label: 'Adresse', type: 'text' },
  ENTREPRISE_TELEPHONE: { label: 'Téléphone', type: 'text' },
  ENTREPRISE_EMAIL: { label: 'Email', type: 'text' },
};

function ConfigPage() {
  const queryClient = useQueryClient();
  const { success: showSuccess, error: showError } = useToast();
  const { hasModulePermission } = useAuthStore();
  const canEdit = hasModulePermission('config', 'update');

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Fetch all configurations
  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['config'],
    queryFn: configService.getAll,
  });

  // Update configuration mutation
  const updateMutation = useMutation({
    mutationFn: ({ cle, valeur }: { cle: string; valeur: string }) =>
      configService.setValue(cle, valeur),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
      showSuccess('Configuration mise à jour');
      setEditingKey(null);
      setEditValue('');
    },
    onError: () => {
      showError('Erreur lors de la mise à jour');
    },
  });

  const getConfigValue = (cle: string): ConfigSysteme | undefined => {
    return configs.find(c => c.cle === cle);
  };

  const handleEdit = (cle: string, currentValue: string) => {
    setEditingKey(cle);
    setEditValue(currentValue);
  };

  const handleSave = (cle: string) => {
    if (!editValue.trim()) {
      showError('La valeur ne peut pas être vide');
      return;
    }
    updateMutation.mutate({ cle, valeur: editValue });
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const formatValue = (value: string, type: string): string => {
    if (type === 'currency') {
      const num = parseFloat(value);
      return new Intl.NumberFormat('fr-FR').format(num) + ' FCFA';
    }
    if (type === 'percent') {
      return value + ' %';
    }
    if (type === 'number') {
      const num = parseFloat(value);
      return new Intl.NumberFormat('fr-FR').format(num);
    }
    return value;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      yellow: { bg: 'bg-yellow-500', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-800' },
      red: { bg: 'bg-red-500', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
      blue: { bg: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
      green: { bg: 'bg-green-500', text: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
      purple: { bg: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
    };
    return colors[color] || colors.yellow;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-yellow-500 rounded-lg">
          <SettingsIcon className="h-6 w-6 text-gray-900" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Configuration Système
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Paramètres généraux de l'application ({configs.length} paramètres)
          </p>
        </div>
      </div>

      {/* Configuration Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(CONFIG_CATEGORIES).map(([key, category]) => {
          const Icon = category.icon;
          const colorClasses = getColorClasses(category.color);
          const categoryConfigs = category.keys
            .map(k => ({ key: k, config: getConfigValue(k), meta: CONFIG_LABELS[k] }))
            .filter(item => item.config);

          if (categoryConfigs.length === 0) return null;

          return (
            <div
              key={key}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Section Header */}
              <div className={`px-4 py-3 border-b ${colorClasses.border} flex items-center space-x-3`}>
                <div className={`p-2 ${colorClasses.bg} rounded-lg`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {category.title}
                </h2>
              </div>

              {/* Section Content */}
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {categoryConfigs.map(({ key: configKey, config, meta }) => (
                  <div key={configKey} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {meta?.label || configKey}
                        </p>
                        {config?.modificateur && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            Modifié le {formatDate(config.updatedAt)}
                          </p>
                        )}
                      </div>

                      {editingKey === configKey ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type={meta?.type === 'text' ? 'text' : 'number'}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-32 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            autoFocus
                          />
                          {meta?.unit && meta.type !== 'text' && (
                            <span className="text-xs text-gray-500">{meta.unit}</span>
                          )}
                          <button
                            onClick={() => handleSave(configKey)}
                            disabled={updateMutation.isPending}
                            className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
                            title="Enregistrer"
                          >
                            <SaveIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={handleCancel}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="Annuler"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-semibold ${colorClasses.text}`}>
                            {config ? formatValue(config.valeur, meta?.type || 'text') : '-'}
                          </span>
                          {canEdit && (
                            <button
                              onClick={() => handleEdit(configKey, config?.valeur || '')}
                              className="p-1 text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400"
                              title="Modifier"
                            >
                              <EditIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <svg className="h-5 w-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              À propos des configurations
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
              Ces paramètres affectent le comportement global de l'application. Les alertes sont générées automatiquement
              en fonction des seuils définis. Les valeurs par défaut sont utilisées lors de la création de nouveaux enregistrements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfigPage;
