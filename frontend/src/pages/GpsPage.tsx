import { useState, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import gpsService from '../services/gps.service';
import camionsService from '../services/camions.service';

// Lazy load the map component to avoid SSR issues
const GpsMap = lazy(() => import('../components/GpsMap'));

export default function GpsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'carte' | 'trackers' | 'whatsgps'>('carte');
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [formData, setFormData] = useState({
    imei: '',
    camionId: undefined as number | undefined,
    simNumero: '',
    modeleTracker: '',
    alerteSurvitesseSeuil: 100,
  });

  const { data: positions } = useQuery({
    queryKey: ['gps-positions'],
    queryFn: gpsService.getPositions,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: trackers, isLoading: loadingTrackers } = useQuery({
    queryKey: ['gps-trackers'],
    queryFn: gpsService.getTrackers,
  });

  const { data: stats } = useQuery({
    queryKey: ['gps-stats'],
    queryFn: gpsService.getStats,
  });

  const { data: whatsGpsStatus } = useQuery({
    queryKey: ['whatsgps-status'],
    queryFn: gpsService.getWhatsGpsStatus,
  });

  const { data: whatsGpsAlarms } = useQuery({
    queryKey: ['whatsgps-alarms'],
    queryFn: gpsService.getWhatsGpsAlarms,
    enabled: !!whatsGpsStatus?.authenticated,
  });

  const { data: whatsGpsStats } = useQuery({
    queryKey: ['whatsgps-stats'],
    queryFn: gpsService.getWhatsGpsStats,
    enabled: !!whatsGpsStatus?.authenticated,
  });

  const { data: whatsGpsVehicles, isLoading: loadingWhatsGpsVehicles } = useQuery({
    queryKey: ['whatsgps-vehicles-status'],
    queryFn: gpsService.getAllWhatsGpsVehicleStatus,
    enabled: !!whatsGpsStatus?.authenticated,
    refetchInterval: 30000,
  });

  // Convert WhatsGPS vehicles to the position format expected by GpsMap
  // Ensure enLigne is a proper boolean (WhatsGPS may return 0/1 or string)
  const whatsGpsPositions = whatsGpsVehicles?.map((vehicle: any) => ({
    id: vehicle.carId,
    camion: {
      immatriculation: vehicle.machineName || vehicle.carNO || `IMEI: ${vehicle.imei}`,
      typeCamion: vehicle.deviceType || 'GPS Tracker',
    },
    lat: vehicle.lat,
    lng: vehicle.lng,
    vitesse: vehicle.speed,
    enLigne: vehicle.online === true || vehicle.online === 1 || vehicle.online === '1',
    derniereMaj: vehicle.pointTime,
    // Additional WhatsGPS data
    imei: vehicle.imei,
    direction: vehicle.direction,
    mileage: vehicle.mileage,
  })) || [];

  const { data: camions } = useQuery({
    queryKey: ['camions'],
    queryFn: camionsService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: gpsService.createTracker,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gps-trackers'] });
      queryClient.invalidateQueries({ queryKey: ['gps-stats'] });
      setShowModal(false);
    },
  });

  const simulateMutation = useMutation({
    mutationFn: gpsService.simulatePositions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gps-positions'] });
      queryClient.invalidateQueries({ queryKey: ['gps-trackers'] });
      queryClient.invalidateQueries({ queryKey: ['gps-stats'] });
    },
  });

  const syncWhatsGpsMutation = useMutation({
    mutationFn: gpsService.syncWhatsGps,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gps-positions'] });
      queryClient.invalidateQueries({ queryKey: ['gps-trackers'] });
      queryClient.invalidateQueries({ queryKey: ['gps-stats'] });
      queryClient.invalidateQueries({ queryKey: ['whatsgps-status'] });
      queryClient.invalidateQueries({ queryKey: ['whatsgps-vehicles-status'] });
    },
  });

  const loginWhatsGpsMutation = useMutation({
    mutationFn: gpsService.loginWhatsGps,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsgps-status'] });
      queryClient.invalidateQueries({ queryKey: ['whatsgps-alarms'] });
      queryClient.invalidateQueries({ queryKey: ['whatsgps-stats'] });
      queryClient.invalidateQueries({ queryKey: ['whatsgps-vehicles-status'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  // Camions without trackers
  const camionsSansTracker = camions?.filter(
    c => !trackers?.some(t => t.camionId === c.id)
  );

  // Show loading only for initial load
  const isInitialLoading = loadingTrackers && (!whatsGpsStatus?.authenticated || loadingWhatsGpsVehicles);

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  // Use WhatsGPS data as primary source if authenticated, otherwise fallback to local DB
  const allPositions = whatsGpsStatus?.authenticated ? whatsGpsPositions : (positions || []);

  // Filter positions based on selected status filter
  const mapPositions = allPositions.filter((pos: any) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'online') return pos.enLigne === true;
    if (statusFilter === 'offline') return pos.enLigne === false;
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Suivi GPS</h1>
          <p className="text-gray-600 dark:text-gray-400">Localisation en temps réel des véhicules</p>
        </div>
        <div className="flex gap-2 items-center">
          {whatsGpsStatus?.configured && (
            <button
              onClick={() => syncWhatsGpsMutation.mutate()}
              disabled={syncWhatsGpsMutation.isPending}
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-500 disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {syncWhatsGpsMutation.isPending ? 'Sync...' : 'Sync WhatsGPS'}
            </button>
          )}
          {!whatsGpsStatus?.configured && (
            <span className="text-sm text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-lg">
              WhatsGPS non configuré
            </span>
          )}
          <button
            onClick={() => simulateMutation.mutate()}
            disabled={simulateMutation.isPending}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-500 disabled:opacity-50 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {simulateMutation.isPending ? 'Simulation...' : 'Simuler'}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-yellow-400 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau tracker
          </button>
        </div>
      </div>

      {/* Stats - Clickable cards to filter vehicles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => { setStatusFilter('all'); setActiveTab('carte'); }}
          className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm text-left transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer ${
            statusFilter === 'all' ? 'ring-2 ring-yellow-500' : ''
          }`}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {whatsGpsStatus?.authenticated ? 'Véhicules WhatsGPS' : 'Trackers'}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {whatsGpsStatus?.authenticated ? (whatsGpsStats?.total || 0) : (stats?.total || 0)}
          </p>
          {statusFilter === 'all' && <p className="text-xs text-yellow-600 mt-1">Filtre actif</p>}
        </button>
        <button
          onClick={() => { setStatusFilter('online'); setActiveTab('carte'); }}
          className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm text-left transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer ${
            statusFilter === 'online' ? 'ring-2 ring-green-500' : ''
          }`}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">En ligne</p>
          <p className="text-2xl font-bold text-green-600">
            {whatsGpsStatus?.authenticated ? (whatsGpsStats?.online || 0) : (stats?.enLigne || 0)}
          </p>
          {statusFilter === 'online' && <p className="text-xs text-green-600 mt-1">Filtre actif</p>}
        </button>
        <button
          onClick={() => { setStatusFilter('offline'); setActiveTab('carte'); }}
          className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm text-left transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer ${
            statusFilter === 'offline' ? 'ring-2 ring-red-500' : ''
          }`}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">Hors ligne</p>
          <p className="text-2xl font-bold text-red-600">
            {whatsGpsStatus?.authenticated ? (whatsGpsStats?.offline || 0) : (stats?.horsLigne || 0)}
          </p>
          {statusFilter === 'offline' && <p className="text-xs text-red-600 mt-1">Filtre actif</p>}
        </button>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600 dark:text-gray-400">Affichés</p>
          <p className="text-2xl font-bold text-blue-600">{mapPositions.length}</p>
          <p className="text-xs text-gray-500 mt-1">sur {allPositions.length} total</p>
        </div>
      </div>

      {/* Data source indicator and filter status */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          whatsGpsStatus?.authenticated
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
        }`}>
          <span className={`w-2 h-2 rounded-full mr-2 ${whatsGpsStatus?.authenticated ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
          Source: {whatsGpsStatus?.authenticated ? 'WhatsGPS (temps réel)' : 'Base de données locale'}
        </span>
        {statusFilter !== 'all' && (
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            statusFilter === 'online'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            Filtre: {statusFilter === 'online' ? 'En ligne' : 'Hors ligne'}
            <button
              onClick={() => setStatusFilter('all')}
              className="ml-2 hover:bg-white/30 rounded-full p-0.5"
              title="Supprimer le filtre"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('carte')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'carte'
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Carte
          </button>
          <button
            onClick={() => setActiveTab('trackers')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'trackers'
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Trackers
          </button>
          <button
            onClick={() => setActiveTab('whatsgps')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'whatsgps'
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            WhatsGPS
          </button>
        </nav>
      </div>

      {/* Carte Tab */}
      {activeTab === 'carte' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="h-[500px] rounded-lg overflow-hidden">
              <Suspense fallback={
                <div className="h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
                </div>
              }>
                <GpsMap positions={mapPositions} />
              </Suspense>
            </div>
          </div>

          {/* Liste des véhicules */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900 dark:text-white">
                Véhicules {statusFilter !== 'all' && (
                  <span className={`text-sm font-normal ${statusFilter === 'online' ? 'text-green-600' : 'text-red-600'}`}>
                    ({statusFilter === 'online' ? 'en ligne' : 'hors ligne'})
                  </span>
                )}
              </h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">{mapPositions.length}</span>
            </div>
            <div className="space-y-2 max-h-[450px] overflow-y-auto">
              {mapPositions.map((pos: any) => (
                <div key={pos.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${pos.enLigne ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{pos.camion?.immatriculation || 'N/A'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{pos.camion?.typeCamion}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{pos.vitesse || 0} km/h</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {pos.lat?.toFixed(4)}, {pos.lng?.toFixed(4)}
                    </p>
                  </div>
                </div>
              ))}
              {mapPositions.length === 0 && (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {statusFilter !== 'all' ? (
                    <>
                      <p>Aucun véhicule {statusFilter === 'online' ? 'en ligne' : 'hors ligne'}</p>
                      <button
                        onClick={() => setStatusFilter('all')}
                        className="text-xs mt-2 text-yellow-600 hover:underline"
                      >
                        Voir tous les véhicules
                      </button>
                    </>
                  ) : !whatsGpsStatus?.authenticated ? (
                    <>
                      <p>Aucune position</p>
                      <p className="text-xs mt-1">Connectez-vous à WhatsGPS pour voir les positions</p>
                    </>
                  ) : (
                    <>
                      <p>Aucune position</p>
                      <p className="text-xs mt-1">Aucun véhicule avec position</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Trackers Tab */}
      {activeTab === 'trackers' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">IMEI</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Camion</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Modèle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Dernière connexion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {trackers?.map((tracker) => (
                <tr key={tracker.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 font-mono text-sm text-gray-900 dark:text-white">{tracker.imei}</td>
                  <td className="px-6 py-4 text-gray-900 dark:text-white">
                    {tracker.camion?.immatriculation || '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{tracker.modeleTracker || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      tracker.enLigne ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                    }`}>
                      {tracker.enLigne ? 'En ligne' : 'Hors ligne'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">
                    {tracker.derniereConnexion
                      ? new Date(tracker.derniereConnexion).toLocaleString('fr-FR')
                      : '-'}
                  </td>
                </tr>
              ))}
              {(!trackers || trackers.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    Aucun tracker enregistré
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* WhatsGPS Tab */}
      {activeTab === 'whatsgps' && (
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Statut WhatsGPS</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Connexion à la plateforme GPS</p>
              </div>
              {whatsGpsStatus?.configured && !whatsGpsStatus?.authenticated && (
                <button
                  onClick={() => loginWhatsGpsMutation.mutate()}
                  disabled={loginWhatsGpsMutation.isPending}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-500 disabled:opacity-50"
                >
                  {loginWhatsGpsMutation.isPending ? 'Connexion...' : 'Se connecter'}
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Configuré</p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  whatsGpsStatus?.configured ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {whatsGpsStatus?.configured ? 'Oui' : 'Non'}
                </span>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Authentifié</p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  whatsGpsStatus?.authenticated ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                }`}>
                  {whatsGpsStatus?.authenticated ? 'Oui' : 'Non'}
                </span>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Plateforme</p>
                <p className="font-medium text-gray-900 dark:text-white">{whatsGpsStatus?.platform || '-'}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">User ID</p>
                <p className="font-medium text-gray-900 dark:text-white">{whatsGpsStatus?.userId || '-'}</p>
              </div>
            </div>
          </div>

          {/* Stats from WhatsGPS */}
          {whatsGpsStats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total véhicules WhatsGPS</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{whatsGpsStats.total}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                <p className="text-sm text-gray-600 dark:text-gray-400">En ligne</p>
                <p className="text-2xl font-bold text-green-600">{whatsGpsStats.online}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                <p className="text-sm text-gray-600 dark:text-gray-400">Hors ligne</p>
                <p className="text-2xl font-bold text-red-600">{whatsGpsStats.offline}</p>
              </div>
            </div>
          )}

          {/* Vehicles from WhatsGPS */}
          {whatsGpsVehicles && whatsGpsVehicles.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Véhicules WhatsGPS ({whatsGpsVehicles.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nom</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">IMEI</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Position</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Vitesse</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Statut</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Dernière MàJ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {whatsGpsVehicles.map((vehicle) => (
                      <tr key={vehicle.carId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{vehicle.machineName || vehicle.carNO}</td>
                        <td className="px-6 py-4 font-mono text-sm text-gray-500 dark:text-gray-400">{vehicle.imei}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {vehicle.lat.toFixed(5)}, {vehicle.lng.toFixed(5)}
                        </td>
                        <td className="px-6 py-4 text-gray-900 dark:text-white">{vehicle.speed} km/h</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            vehicle.online ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                          }`}>
                            {vehicle.online ? 'En ligne' : 'Hors ligne'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{vehicle.pointTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Alarms */}
          {whatsGpsAlarms && whatsGpsAlarms.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Alarmes non lues ({whatsGpsAlarms.length})
                </h3>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {whatsGpsAlarms.slice(0, 10).map((alarm: any, index: number) => (
                  <div key={index} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-gray-900 dark:text-white font-medium">{alarm.carNO || alarm.imei}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{alarm.alarmType || 'Alarme'}</p>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{alarm.alarmTime}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!whatsGpsStatus?.configured && (
            <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-lg text-center">
              <svg className="w-12 h-12 mx-auto mb-3 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-orange-800 dark:text-orange-300 font-medium">WhatsGPS non configuré</p>
              <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                Configurez WHATSGPS_ACCOUNT et WHATSGPS_PASSWORD dans votre fichier .env
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Nouveau tracker GPS</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">IMEI *</label>
                  <input
                    type="text"
                    value={formData.imei}
                    onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:text-white"
                    placeholder="123456789012345"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Camion</label>
                  <select
                    value={formData.camionId || ''}
                    onChange={(e) => setFormData({ ...formData, camionId: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">-- Sélectionner --</option>
                    {camionsSansTracker?.map((c) => (
                      <option key={c.id} value={c.id}>{c.immatriculation}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">N° SIM</label>
                  <input
                    type="text"
                    value={formData.simNumero}
                    onChange={(e) => setFormData({ ...formData, simNumero: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Modèle tracker</label>
                  <input
                    type="text"
                    value={formData.modeleTracker}
                    onChange={(e) => setFormData({ ...formData, modeleTracker: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Teltonika FMB920"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seuil survitesse (km/h)</label>
                  <input
                    type="number"
                    value={formData.alerteSurvitesseSeuil}
                    onChange={(e) => setFormData({ ...formData, alerteSurvitesseSeuil: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-yellow-500 text-gray-900 rounded-lg font-medium hover:bg-yellow-400 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
