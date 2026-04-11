import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import entretienService from '../services/entretien.service';
import type { Maintenance } from '../services/entretien.service';
import camionsService from '../services/camions.service';
import type { Camion } from '../types';

interface VidangeInfo {
  camion: Camion;
  lastVidange: Maintenance | null;
  nextVidangePlanifiee: Maintenance | null;
  nextKm: number | null;
  nextDate: string | null;
  kmRestants: number | null;
  joursRestants: number | null;
  statut: 'OK' | 'PROCHE' | 'DEPASSE' | 'INCONNU';
}

// Intervalle standard entre vidanges (km)
const INTERVALLE_VIDANGE_KM = 15000;
// Seuil d'alerte "proche" (km restants)
const SEUIL_PROCHE_KM = 2000;
// Seuil d'alerte "proche" (jours restants)
const SEUIL_PROCHE_JOURS = 15;

export default function EntretienPage() {
  const { data: camions, isLoading: loadingCamions } = useQuery({
    queryKey: ['camions'],
    queryFn: camionsService.getAll,
  });

  const { data: maintenances, isLoading: loadingMaintenances } = useQuery({
    queryKey: ['maintenances'],
    queryFn: () => entretienService.getAll(),
  });

  const vidangeData: VidangeInfo[] = useMemo(() => {
    if (!camions || !maintenances) return [];

    return camions.filter(c => c.actif).map(camion => {
      const camionMaintenances = maintenances
        .filter(m => m.camionId === camion.id && m.type === 'VIDANGE');

      // Derniere vidange TERMINE
      const terminees = camionMaintenances
        .filter(m => m.statut === 'TERMINE')
        .sort((a, b) => {
          const dateA = new Date(a.dateFin || a.datePlanifiee).getTime();
          const dateB = new Date(b.dateFin || b.datePlanifiee).getTime();
          return dateB - dateA;
        });
      const lastVidange = terminees[0] || null;

      // Prochaine vidange planifiee
      const planifiees = camionMaintenances
        .filter(m => m.statut === 'PLANIFIE' || m.statut === 'EN_ATTENTE_PIECES')
        .sort((a, b) => new Date(a.datePlanifiee).getTime() - new Date(b.datePlanifiee).getTime());
      const nextVidangePlanifiee = planifiees[0] || null;

      // Calculer prochaine km
      let nextKm: number | null = null;
      if (nextVidangePlanifiee?.prochainKilometrage) {
        nextKm = nextVidangePlanifiee.prochainKilometrage;
      } else if (lastVidange?.prochainKilometrage) {
        nextKm = lastVidange.prochainKilometrage;
      } else if (lastVidange?.kilometrageActuel) {
        nextKm = lastVidange.kilometrageActuel + INTERVALLE_VIDANGE_KM;
      }

      // Prochaine date
      const nextDate = nextVidangePlanifiee?.datePlanifiee || null;

      // Calculs
      const kmActuel = camion.kilometrageActuel || 0;
      const kmRestants = nextKm !== null ? nextKm - kmActuel : null;
      const joursRestants = nextDate
        ? Math.ceil((new Date(nextDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // Determine statut
      let statut: 'OK' | 'PROCHE' | 'DEPASSE' | 'INCONNU' = 'INCONNU';
      if (kmRestants !== null || joursRestants !== null) {
        if ((kmRestants !== null && kmRestants < 0) || (joursRestants !== null && joursRestants < 0)) {
          statut = 'DEPASSE';
        } else if (
          (kmRestants !== null && kmRestants <= SEUIL_PROCHE_KM) ||
          (joursRestants !== null && joursRestants <= SEUIL_PROCHE_JOURS)
        ) {
          statut = 'PROCHE';
        } else {
          statut = 'OK';
        }
      }

      return {
        camion,
        lastVidange,
        nextVidangePlanifiee,
        nextKm,
        nextDate,
        kmRestants,
        joursRestants,
        statut,
      };
    });
  }, [camions, maintenances]);

  const stats = useMemo(() => {
    return {
      total: vidangeData.length,
      depasse: vidangeData.filter(v => v.statut === 'DEPASSE').length,
      proche: vidangeData.filter(v => v.statut === 'PROCHE').length,
      ok: vidangeData.filter(v => v.statut === 'OK').length,
      inconnu: vidangeData.filter(v => v.statut === 'INCONNU').length,
    };
  }, [vidangeData]);

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'OK': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'PROCHE': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'DEPASSE': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case 'OK': return 'À jour';
      case 'PROCHE': return 'Proche';
      case 'DEPASSE': return 'Dépassé';
      default: return 'Non planifié';
    }
  };

  const getRowBorderColor = (statut: string) => {
    switch (statut) {
      case 'DEPASSE': return 'border-l-4 border-red-500';
      case 'PROCHE': return 'border-l-4 border-orange-500';
      case 'OK': return 'border-l-4 border-green-500';
      default: return 'border-l-4 border-gray-300';
    }
  };

  if (loadingCamions || loadingMaintenances) {
    return <div className="p-8 text-center text-gray-500">Chargement des données d'entretien...</div>;
  }

  // Tri: depasse, proche, ok, inconnu
  const sortedVidangeData = [...vidangeData].sort((a, b) => {
    const order = { DEPASSE: 0, PROCHE: 1, OK: 2, INCONNU: 3 };
    return order[a.statut] - order[b.statut];
  });

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Entretien véhicules</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Suivi des prochaines vidanges de chaque camion (kilométrage et date)
          </p>
        </div>
        <Link
          to="/maintenance/ordres"
          className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-4 py-2 rounded-lg font-medium flex items-center gap-2"
        >
          + Planifier une vidange
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total camions</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">À jour</p>
          <p className="text-2xl font-bold text-green-600">{stats.ok}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Proche</p>
          <p className="text-2xl font-bold text-orange-600">{stats.proche}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Dépassé</p>
          <p className="text-2xl font-bold text-red-600">{stats.depasse}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Non planifié</p>
          <p className="text-2xl font-bold text-gray-500">{stats.inconnu}</p>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Règle :</strong> Intervalle standard entre vidanges = {INTERVALLE_VIDANGE_KM.toLocaleString('fr-FR')} km.
          Alerte "proche" si moins de {SEUIL_PROCHE_KM.toLocaleString('fr-FR')} km restants ou {SEUIL_PROCHE_JOURS} jours.
        </p>
      </div>

      {/* Liste des camions */}
      {sortedVidangeData.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
          Aucun camion actif trouvé
        </div>
      ) : (
        <div className="space-y-3">
          {sortedVidangeData.map((v) => (
            <div
              key={v.camion.id}
              className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${getRowBorderColor(v.statut)}`}
            >
              <div className="flex justify-between items-start flex-wrap gap-4">
                {/* Camion info */}
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {v.camion.immatriculation}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatutColor(v.statut)}`}>
                      {getStatutLabel(v.statut)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {v.camion.marque} {v.camion.modele || ''} - {(v.camion.kilometrageActuel || 0).toLocaleString('fr-FR')} km
                  </p>
                </div>

                {/* Derniere vidange */}
                <div className="flex-1 min-w-[180px]">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Dernière vidange</p>
                  {v.lastVidange ? (
                    <>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(v.lastVidange.dateFin || v.lastVidange.datePlanifiee).toLocaleDateString('fr-FR')}
                      </p>
                      {v.lastVidange.kilometrageActuel && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          à {v.lastVidange.kilometrageActuel.toLocaleString('fr-FR')} km
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">Aucune</p>
                  )}
                </div>

                {/* Prochaine vidange */}
                <div className="flex-1 min-w-[200px]">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Prochaine vidange</p>
                  {v.nextKm !== null ? (
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      à {v.nextKm.toLocaleString('fr-FR')} km
                      {v.kmRestants !== null && (
                        <span className={`ml-2 text-xs ${v.kmRestants < 0 ? 'text-red-600' : v.kmRestants <= SEUIL_PROCHE_KM ? 'text-orange-600' : 'text-green-600'}`}>
                          ({v.kmRestants > 0 ? '+' : ''}{v.kmRestants.toLocaleString('fr-FR')} km)
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">Km non défini</p>
                  )}
                  {v.nextDate && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(v.nextDate).toLocaleDateString('fr-FR')}
                      {v.joursRestants !== null && (
                        <span className={`ml-2 ${v.joursRestants < 0 ? 'text-red-600' : v.joursRestants <= SEUIL_PROCHE_JOURS ? 'text-orange-600' : 'text-green-600'}`}>
                          ({v.joursRestants > 0 ? 'dans ' : 'il y a '}{Math.abs(v.joursRestants)} j)
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center">
                  {v.nextVidangePlanifiee ? (
                    <Link
                      to={`/maintenance/ordres?id=${v.nextVidangePlanifiee.id}`}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Voir l'ordre
                    </Link>
                  ) : v.statut === 'DEPASSE' || v.statut === 'PROCHE' || v.statut === 'INCONNU' ? (
                    <Link
                      to="/maintenance/ordres"
                      className="px-3 py-1 bg-yellow-500 text-gray-900 rounded text-sm hover:bg-yellow-600 font-medium"
                    >
                      Planifier
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
