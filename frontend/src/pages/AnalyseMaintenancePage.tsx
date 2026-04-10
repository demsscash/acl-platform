import { useQuery } from '@tanstack/react-query';
import entretienService, {
  TYPE_MAINTENANCE_LABELS,
  STATUT_MAINTENANCE_LABELS,
} from '../services/entretien.service';
import type { Maintenance, StatutMaintenance } from '../services/entretien.service';
import camionsService from '../services/camions.service';
import pannesService from '../services/pannes.service';
import { useAuthStore } from '../stores/auth.store';

export default function AnalyseMaintenancePage() {
  const { canViewFinancialData } = useAuthStore();
  const canSeeFinancial = canViewFinancialData('entretien');

  const { data: maintenances, isLoading } = useQuery({
    queryKey: ['maintenances', 'analyse'],
    queryFn: () => entretienService.getAll(),
  });

  const { data: stats } = useQuery({
    queryKey: ['maintenances-stats'],
    queryFn: entretienService.getStats,
  });

  const { data: camions } = useQuery({
    queryKey: ['camions'],
    queryFn: camionsService.getAll,
  });

  const { data: pannes } = useQuery({
    queryKey: ['pannes'],
    queryFn: () => pannesService.getAll(),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount);
  };

  const getStatutBadgeClass = (statut: StatutMaintenance) => {
    switch (statut) {
      case 'PLANIFIE': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'EN_ATTENTE_PIECES': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'EN_COURS': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'TERMINE': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'ANNULE': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // === KPI CALCULATIONS ===

  // 1. MTTR - Mean Time To Repair (temps moyen des interventions)
  const calcMTTR = (list: Maintenance[]) => {
    const terminees = list.filter(m => m.statut === 'TERMINE' && m.dateDebut && m.dateFin);
    if (terminees.length === 0) return null;
    const durees = terminees.map(m => {
      const debut = new Date(m.dateDebut!).getTime();
      const fin = new Date(m.dateFin!).getTime();
      return Math.max(0.5, (fin - debut) / (1000 * 60 * 60 * 24));
    });
    return {
      avg: Math.round((durees.reduce((a, b) => a + b, 0) / durees.length) * 10) / 10,
      min: Math.round(Math.min(...durees) * 10) / 10,
      max: Math.round(Math.max(...durees) * 10) / 10,
      count: terminees.length,
    };
  };

  // 2. MTBF - Mean Time Between Failures (temps moyen entre les pannes)
  const calcMTBF = () => {
    if (!pannes || pannes.length < 2) return null;
    // Sort by date
    const sorted = [...pannes].sort((a, b) =>
      new Date(a.datePanne).getTime() - new Date(b.datePanne).getTime()
    );
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].datePanne).getTime();
      const curr = new Date(sorted[i].datePanne).getTime();
      intervals.push((curr - prev) / (1000 * 60 * 60 * 24));
    }
    if (intervals.length === 0) return null;
    return Math.round((intervals.reduce((a, b) => a + b, 0) / intervals.length) * 10) / 10;
  };

  // 3. Coût moyen par km (tous camions)
  const calcCoutMoyenParKm = (list: Maintenance[]) => {
    if (!camions || camions.length === 0) return null;
    const totalCout = list.reduce(
      (sum, m) => sum + Number(m.coutPieces) + Number(m.coutMainOeuvre) + Number(m.coutExterne),
      0
    );
    const totalKm = camions.reduce((sum, c) => sum + (c.kilometrageActuel || 0), 0);
    if (totalKm === 0) return null;
    return Math.round((totalCout / totalKm) * 100) / 100;
  };

  const mttr = maintenances ? calcMTTR(maintenances) : null;
  const mtbf = calcMTBF();
  const coutParKm = maintenances ? calcCoutMoyenParKm(maintenances) : null;

  // Répartition par type
  const repartitionType = maintenances
    ? Object.entries(TYPE_MAINTENANCE_LABELS).map(([type, label]) => {
        const count = maintenances.filter(m => m.type === type).length;
        const cost = maintenances
          .filter(m => m.type === type)
          .reduce((sum, m) => sum + Number(m.coutPieces) + Number(m.coutMainOeuvre) + Number(m.coutExterne), 0);
        return {
          type,
          label,
          count,
          cost,
          pct: maintenances.length > 0 ? Math.round((count / maintenances.length) * 100) : 0,
        };
      }).filter(r => r.count > 0)
    : [];

  // Cout par camion
  const coutParCamion = maintenances
    ? (() => {
        const map = new Map<number, { immat: string; marque: string; km: number; count: number; pieces: number; mo: number; ext: number }>();
        maintenances.forEach(m => {
          if (!m.camionId) return;
          const camion = camions?.find(c => c.id === m.camionId);
          const existing = map.get(m.camionId) || {
            immat: m.camion?.immatriculation || camion?.immatriculation || '-',
            marque: m.camion?.marque || camion?.marque || '-',
            km: camion?.kilometrageActuel || 0,
            count: 0,
            pieces: 0,
            mo: 0,
            ext: 0,
          };
          existing.count++;
          existing.pieces += Number(m.coutPieces);
          existing.mo += Number(m.coutMainOeuvre);
          existing.ext += Number(m.coutExterne);
          map.set(m.camionId, existing);
        });
        return Array.from(map.entries())
          .map(([id, data]) => ({
            id,
            ...data,
            total: data.pieces + data.mo + data.ext,
            coutParKm: data.km > 0 ? (data.pieces + data.mo + data.ext) / data.km : 0,
          }))
          .sort((a, b) => b.total - a.total);
      })()
    : [];

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Chargement des analyses...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analyse Maintenance</h1>
        <p className="text-gray-500 dark:text-gray-400">
          KPIs d'évaluation de la qualité des interventions et performance de la maintenance
        </p>
      </div>

      {/* KPI Cards principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* MTBF */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-5 text-white">
          <p className="text-sm text-blue-100 mb-1">MTBF</p>
          <p className="text-xs text-blue-200 mb-2">Temps moyen entre pannes</p>
          <p className="text-3xl font-bold">
            {mtbf !== null ? `${mtbf}` : '-'}
            <span className="text-sm font-normal ml-1">jours</span>
          </p>
          {pannes && (
            <p className="text-xs text-blue-100 mt-2">Basé sur {pannes.length} panne{pannes.length > 1 ? 's' : ''}</p>
          )}
        </div>

        {/* MTTR */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-5 text-white">
          <p className="text-sm text-orange-100 mb-1">MTTR</p>
          <p className="text-xs text-orange-200 mb-2">Temps moyen d'intervention</p>
          <p className="text-3xl font-bold">
            {mttr ? `${mttr.avg}` : '-'}
            <span className="text-sm font-normal ml-1">jours</span>
          </p>
          {mttr && (
            <p className="text-xs text-orange-100 mt-2">Min: {mttr.min}j / Max: {mttr.max}j</p>
          )}
        </div>

        {/* Coût moyen par km */}
        {canSeeFinancial && (
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-5 text-white">
            <p className="text-sm text-green-100 mb-1">Coût moyen / km</p>
            <p className="text-xs text-green-200 mb-2">Toute la flotte</p>
            <p className="text-3xl font-bold">
              {coutParKm !== null ? `${coutParKm.toLocaleString('fr-FR')}` : '-'}
              <span className="text-sm font-normal ml-1">FCFA/km</span>
            </p>
            <p className="text-xs text-green-100 mt-2">
              {camions?.length || 0} camion{(camions?.length || 0) > 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Taux de completion */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-5 text-white">
          <p className="text-sm text-purple-100 mb-1">Taux de complétion</p>
          <p className="text-xs text-purple-200 mb-2">Interventions terminées</p>
          <p className="text-3xl font-bold">
            {stats && stats.total > 0 ? `${Math.round((stats.termine / stats.total) * 100)}` : '0'}
            <span className="text-sm font-normal ml-1">%</span>
          </p>
          {stats && (
            <p className="text-xs text-purple-100 mt-2">{stats.termine} / {stats.total} terminées</p>
          )}
        </div>
      </div>

      {/* Stats secondaires */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">En retard</p>
            <p className="text-2xl font-bold text-red-600">{stats.enRetard}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">En cours</p>
            <p className="text-2xl font-bold text-orange-600">{stats.enCours}</p>
          </div>
          {canSeeFinancial && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Coût ce mois</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.coutTotalMois)}</p>
            </div>
          )}
        </div>
      )}

      {/* Répartition par type */}
      {repartitionType.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Répartition par type d'intervention
          </h3>
          <div className="space-y-3">
            {repartitionType.map((r) => (
              <div key={r.type}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{r.label}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {r.count} ({r.pct}%)
                    {canSeeFinancial && r.cost > 0 && ` - ${formatCurrency(r.cost)}`}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Répartition par statut */}
      {maintenances && maintenances.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Répartition par statut</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(STATUT_MAINTENANCE_LABELS).map(([statut, label]) => {
              const count = maintenances.filter(m => m.statut === statut).length;
              return (
                <div key={statut} className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-2 ${getStatutBadgeClass(statut as StatutMaintenance)}`}>
                    {label}
                  </span>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Coût par camion */}
      {canSeeFinancial && coutParCamion.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Coût de maintenance par camion
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Camion</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Km actuel</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Interventions</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Pièces</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">MO</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Externe</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Coût/km</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {coutParCamion.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">
                      {c.immat}
                      <span className="text-xs text-gray-500 dark:text-gray-400 block">{c.marque}</span>
                    </td>
                    <td className="px-4 py-2 text-center text-gray-600 dark:text-gray-400">
                      {c.km.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-2 text-center text-gray-600 dark:text-gray-400">{c.count}</td>
                    <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">{formatCurrency(c.pieces)}</td>
                    <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">{formatCurrency(c.mo)}</td>
                    <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">{formatCurrency(c.ext)}</td>
                    <td className="px-4 py-2 text-right font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(c.total)}
                    </td>
                    <td className="px-4 py-2 text-right text-sm text-gray-600 dark:text-gray-400">
                      {c.coutParKm > 0 ? `${c.coutParKm.toFixed(2)} FCFA` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MTTR details */}
      {mttr && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Détails MTTR (Mean Time To Repair)
          </h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Interventions analysées</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{mttr.count}</p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Minimum</p>
              <p className="text-2xl font-bold text-blue-600">{mttr.min} j</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Moyenne</p>
              <p className="text-2xl font-bold text-yellow-600">{mttr.avg} j</p>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Maximum</p>
              <p className="text-2xl font-bold text-red-600">{mttr.max} j</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
