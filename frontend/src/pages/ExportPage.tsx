import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import exportService from '../services/export.service';

type ExportFormat = 'csv' | 'xlsx';

export default function ExportPage() {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [dateDebut, setDateDebut] = useState(firstDayOfMonth.toISOString().split('T')[0]);
  const [dateFin, setDateFin] = useState(today.toISOString().split('T')[0]);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('xlsx');
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['export-stats', dateDebut, dateFin],
    queryFn: () => exportService.getStats(dateDebut, dateFin),
  });

  const handleExport = async (type: string) => {
    try {
      setDownloading(type);
      await exportService.downloadExport(type, dateDebut, dateFin, exportFormat);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Erreur lors de l\'export. Veuillez réessayer.');
    } finally {
      setDownloading(null);
    }
  };

  const exportTypes = [
    // REVENUS
    {
      key: 'bons-transport',
      title: 'Bons de Transport',
      description: 'Export des bons de transport (revenus)',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
        </svg>
      ),
      count: stats?.bonsTransport?.count || 0,
      total: stats?.bonsTransport?.total,
      color: 'bg-green-500',
      type: 'revenu',
    },
    {
      key: 'bons-location',
      title: 'Bons de Location',
      description: 'Export des bons de location (revenus)',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      count: stats?.bonsLocation?.count || 0,
      total: stats?.bonsLocation?.total,
      color: 'bg-emerald-500',
      type: 'revenu',
    },
    // DEPENSES
    {
      key: 'dotations-carburant',
      title: 'Dotations Carburant',
      description: 'Export des dotations de carburant (dépenses)',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      count: stats?.dotationsCarburant?.count || 0,
      total: stats?.dotationsCarburant?.total,
      color: 'bg-orange-500',
      type: 'depense',
    },
    {
      key: 'approvisionnements-cuve',
      title: 'Approvisionnements Cuve',
      description: 'Achats de carburant pour les cuves (dépenses)',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      count: stats?.approvisionnementsCuve?.count || 0,
      total: stats?.approvisionnementsCuve?.total,
      color: 'bg-amber-500',
      type: 'depense',
    },
    {
      key: 'pannes',
      title: 'Pannes / Réparations',
      description: 'Export des pannes et coûts de réparation (dépenses)',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      count: stats?.pannes?.count || 0,
      total: stats?.pannes?.total,
      color: 'bg-red-500',
      type: 'depense',
    },
    {
      key: 'entrees-stock',
      title: 'Entrées Stock (Achats)',
      description: 'Achats de pièces détachées (dépenses)',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      count: stats?.entreesStock?.count || 0,
      total: stats?.entreesStock?.total,
      color: 'bg-indigo-500',
      type: 'depense',
    },
    {
      key: 'sorties-stock',
      title: 'Sorties Stock',
      description: 'Utilisation des pièces du stock',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      count: stats?.sortiesStock?.count || 0,
      color: 'bg-blue-500',
      type: 'autre',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Export Comptabilité</h1>
          <p className="text-gray-500 dark:text-gray-400">Exportez vos données pour la comptabilité</p>
        </div>
      </div>

      {/* Date Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Période</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date début</label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date fin</label>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const now = new Date();
                setDateDebut(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
                setDateFin(now.toISOString().split('T')[0]);
              }}
              className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg dark:text-gray-300"
            >
              Ce mois
            </button>
            <button
              onClick={() => {
                const now = new Date();
                setDateDebut(new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]);
                setDateFin(now.toISOString().split('T')[0]);
              }}
              className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg dark:text-gray-300"
            >
              Cette année
            </button>
          </div>

          {/* Format Selector */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-600 dark:text-gray-400">Format :</span>
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setExportFormat('xlsx')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  exportFormat === 'xlsx'
                    ? 'bg-white dark:bg-gray-600 shadow text-green-700 dark:text-green-400 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M12.9,14.5L15.8,19H14L12,15.6L10,19H8.2L11.1,14.5L8.2,10H10L12,13.4L14,10H15.8L12.9,14.5Z" />
                  </svg>
                  Excel
                </span>
              </button>
              <button
                onClick={() => setExportFormat('csv')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  exportFormat === 'csv'
                    ? 'bg-white dark:bg-gray-600 shadow text-blue-700 dark:text-blue-400 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  CSV
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Dépenses</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">{exportService.formatCurrency(stats.totaux.depenses)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenus</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">{exportService.formatCurrency(stats.totaux.revenus)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full ${stats.totaux.solde >= 0 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-red-100 dark:bg-red-900/30'} flex items-center justify-center`}>
                <svg className={`w-6 h-6 ${stats.totaux.solde >= 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Solde</p>
                <p className={`text-xl font-bold ${stats.totaux.solde >= 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                  {exportService.formatCurrency(stats.totaux.solde)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenus Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500"></span>
          Revenus
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exportTypes.filter(item => item.type === 'revenu').map((item) => (
            <div key={item.key} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl ${item.color} text-white flex items-center justify-center flex-shrink-0`}>
                  {item.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{item.description}</p>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Enregistrements: </span>
                      <span className="font-medium dark:text-white">{isLoading ? '...' : item.count}</span>
                    </div>
                    {item.total !== undefined && (
                      <div className="text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Total: </span>
                        <span className="font-medium text-green-600 dark:text-green-400">{isLoading ? '...' : exportService.formatCurrency(item.total)}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleExport(item.key)}
                    disabled={isLoading || item.count === 0 || downloading !== null}
                    className={`flex items-center gap-2 px-4 py-2 ${
                      exportFormat === 'xlsx' ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-500 hover:bg-yellow-600'
                    } disabled:bg-gray-300 text-white rounded-lg transition-colors`}
                  >
                    {downloading === item.key ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    )}
                    {downloading === item.key ? 'Export...' : `Exporter ${exportFormat.toUpperCase()}`}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Depenses Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
          Dépenses
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exportTypes.filter(item => item.type === 'depense').map((item) => (
            <div key={item.key} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl ${item.color} text-white flex items-center justify-center flex-shrink-0`}>
                  {item.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{item.description}</p>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Enregistrements: </span>
                      <span className="font-medium dark:text-white">{isLoading ? '...' : item.count}</span>
                    </div>
                    {item.total !== undefined && (
                      <div className="text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Total: </span>
                        <span className="font-medium text-red-600 dark:text-red-400">{isLoading ? '...' : exportService.formatCurrency(item.total)}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleExport(item.key)}
                    disabled={isLoading || item.count === 0 || downloading !== null}
                    className={`flex items-center gap-2 px-4 py-2 ${
                      exportFormat === 'xlsx' ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-500 hover:bg-yellow-600'
                    } disabled:bg-gray-300 text-white rounded-lg transition-colors`}
                  >
                    {downloading === item.key ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    )}
                    {downloading === item.key ? 'Export...' : `Exporter ${exportFormat.toUpperCase()}`}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Autres Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
          Autres
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exportTypes.filter(item => item.type === 'autre').map((item) => (
            <div key={item.key} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl ${item.color} text-white flex items-center justify-center flex-shrink-0`}>
                  {item.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{item.description}</p>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Enregistrements: </span>
                      <span className="font-medium dark:text-white">{isLoading ? '...' : item.count}</span>
                    </div>
                    {item.total !== undefined && (
                      <div className="text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Total: </span>
                        <span className="font-medium dark:text-white">{isLoading ? '...' : exportService.formatCurrency(item.total)}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleExport(item.key)}
                    disabled={isLoading || item.count === 0 || downloading !== null}
                    className={`flex items-center gap-2 px-4 py-2 ${
                      exportFormat === 'xlsx' ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-500 hover:bg-yellow-600'
                    } disabled:bg-gray-300 text-white rounded-lg transition-colors`}
                  >
                    {downloading === item.key ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    )}
                    {downloading === item.key ? 'Export...' : `Exporter ${exportFormat.toUpperCase()}`}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export Rapide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Export Rapide</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Téléchargez rapidement un export spécifique</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {exportTypes.map((item) => (
              <button
                key={item.key}
                onClick={() => handleExport(item.key)}
                disabled={isLoading || downloading !== null || item.count === 0}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  item.count === 0
                    ? 'bg-gray-50 dark:bg-gray-700 text-gray-300 dark:text-gray-500 cursor-not-allowed'
                    : item.type === 'revenu'
                    ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50'
                    : item.type === 'depense'
                    ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50'
                    : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                }`}
              >
                {downloading === item.key ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
                {item.title}
                {item.count > 0 && <span className="text-xs opacity-75">({item.count})</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
