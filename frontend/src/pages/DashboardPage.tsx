import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { ROLE_LABELS } from '../types';
import type { Module } from '../types';

// Module card definitions with their display info
const MODULE_CARDS: Record<Module, { title: string; description: string; icon: string; to: string; color: string }> = {
  users: { title: 'Utilisateurs', description: 'Gestion des comptes utilisateurs', icon: 'users', to: '/users', color: 'indigo' },
  camions: { title: 'Camions', description: 'Gestion de la flotte de véhicules', icon: 'truck', to: '/camions', color: 'blue' },
  chauffeurs: { title: 'Chauffeurs', description: 'Gestion du personnel roulant', icon: 'people', to: '/chauffeurs', color: 'green' },
  transport: { title: 'Transport', description: 'Bons de transport et missions', icon: 'route', to: '/transport', color: 'purple' },
  location: { title: 'Location', description: 'Contrats de location véhicules', icon: 'calendar', to: '/location', color: 'teal' },
  gps: { title: 'GPS', description: 'Suivi des véhicules en temps réel', icon: 'gps', to: '/gps', color: 'cyan' },
  alertes: { title: 'Alertes', description: 'Notifications et alertes système', icon: 'alert', to: '/alertes', color: 'red' },
  pannes: { title: 'Pannes', description: 'Déclaration et suivi des pannes', icon: 'tool', to: '/pannes', color: 'orange' },
  entretien: { title: 'Entretien', description: 'Maintenance des véhicules', icon: 'wrench', to: '/entretien', color: 'lime' },
  caisses: { title: 'Caisses', description: 'Gestion des caisses et mouvements', icon: 'cash', to: '/caisses', color: 'emerald' },
  pieces: { title: 'Pièces', description: 'Gestion du stock de pièces', icon: 'box', to: '/pieces', color: 'amber' },
  pneumatiques: { title: 'Pneumatiques', description: 'Gestion des pneumatiques', icon: 'tire', to: '/pneumatiques', color: 'slate' },
  carburant: { title: 'Carburant', description: 'Cuves et dotations carburant', icon: 'fuel', to: '/carburant', color: 'yellow' },
  clients: { title: 'Clients', description: 'Gestion des clients', icon: 'building', to: '/clients', color: 'emerald' },
  fournisseurs: { title: 'Fournisseurs', description: 'Gestion des fournisseurs', icon: 'supplier', to: '/fournisseurs', color: 'violet' },
  export: { title: 'Export', description: 'Exports et rapports', icon: 'download', to: '/export', color: 'pink' },
  config: { title: 'Configuration', description: 'Paramètres du système', icon: 'settings', to: '/config', color: 'gray' },
};

export default function DashboardPage() {
  const { user, getAccessibleModules } = useAuthStore();
  const accessibleModules = getAccessibleModules();

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-2xl p-8 mb-10 shadow-lg">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Bienvenue, {user?.prenom} {user?.nom} !
        </h1>
        <p className="text-gray-800 text-lg">
          Plateforme de gestion logistique ACL - Africa Construction Logistics
        </p>
        <div className="mt-4 inline-flex items-center gap-2 bg-white/30 backdrop-blur-sm px-4 py-2 rounded-full">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-gray-900 font-medium">
            {user?.role ? ROLE_LABELS[user.role] : ''}
          </span>
        </div>
      </div>

      {/* Module Cards Grid */}
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Vos accès</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {accessibleModules.map((module) => {
          const card = MODULE_CARDS[module];
          if (!card) return null;
          return (
            <ModuleCard
              key={module}
              title={card.title}
              description={card.description}
              icon={card.icon}
              to={card.to}
              color={card.color}
            />
          );
        })}
      </div>

      {/* Empty state if no modules */}
      {accessibleModules.length === 0 && (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Aucun accès configuré</h3>
          <p className="text-gray-500 dark:text-gray-400">Contactez votre administrateur pour obtenir des accès.</p>
        </div>
      )}
    </div>
  );
}

// Module Card component
function ModuleCard({
  title,
  description,
  icon,
  to,
  color,
}: {
  title: string;
  description: string;
  icon: string;
  to: string;
  color: string;
}) {
  const colorClasses: Record<string, { bg: string; hover: string; icon: string }> = {
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:border-blue-300 dark:hover:border-blue-700', icon: 'bg-blue-500' },
    green: { bg: 'bg-green-50 dark:bg-green-900/20', hover: 'hover:bg-green-100 dark:hover:bg-green-900/40 hover:border-green-300 dark:hover:border-green-700', icon: 'bg-green-500' },
    orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', hover: 'hover:bg-orange-100 dark:hover:bg-orange-900/40 hover:border-orange-300 dark:hover:border-orange-700', icon: 'bg-orange-500' },
    red: { bg: 'bg-red-50 dark:bg-red-900/20', hover: 'hover:bg-red-100 dark:hover:bg-red-900/40 hover:border-red-300 dark:hover:border-red-700', icon: 'bg-red-500' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', hover: 'hover:bg-purple-100 dark:hover:bg-purple-900/40 hover:border-purple-300 dark:hover:border-purple-700', icon: 'bg-purple-500' },
    cyan: { bg: 'bg-cyan-50 dark:bg-cyan-900/20', hover: 'hover:bg-cyan-100 dark:hover:bg-cyan-900/40 hover:border-cyan-300 dark:hover:border-cyan-700', icon: 'bg-cyan-500' },
    yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', hover: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/40 hover:border-yellow-300 dark:hover:border-yellow-700', icon: 'bg-yellow-500' },
    indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', hover: 'hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:border-indigo-300 dark:hover:border-indigo-700', icon: 'bg-indigo-500' },
    teal: { bg: 'bg-teal-50 dark:bg-teal-900/20', hover: 'hover:bg-teal-100 dark:hover:bg-teal-900/40 hover:border-teal-300 dark:hover:border-teal-700', icon: 'bg-teal-500' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', hover: 'hover:bg-amber-100 dark:hover:bg-amber-900/40 hover:border-amber-300 dark:hover:border-amber-700', icon: 'bg-amber-500' },
    slate: { bg: 'bg-slate-50 dark:bg-slate-900/20', hover: 'hover:bg-slate-100 dark:hover:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700', icon: 'bg-slate-500' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', hover: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/40 hover:border-emerald-300 dark:hover:border-emerald-700', icon: 'bg-emerald-500' },
    violet: { bg: 'bg-violet-50 dark:bg-violet-900/20', hover: 'hover:bg-violet-100 dark:hover:bg-violet-900/40 hover:border-violet-300 dark:hover:border-violet-700', icon: 'bg-violet-500' },
    pink: { bg: 'bg-pink-50 dark:bg-pink-900/20', hover: 'hover:bg-pink-100 dark:hover:bg-pink-900/40 hover:border-pink-300 dark:hover:border-pink-700', icon: 'bg-pink-500' },
    gray: { bg: 'bg-gray-50 dark:bg-gray-700', hover: 'hover:bg-gray-100 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-500', icon: 'bg-gray-500' },
    lime: { bg: 'bg-lime-50 dark:bg-lime-900/20', hover: 'hover:bg-lime-100 dark:hover:bg-lime-900/40 hover:border-lime-300 dark:hover:border-lime-700', icon: 'bg-lime-600' },
  };

  const colors = colorClasses[color] || colorClasses.gray;

  const getIcon = () => {
    switch (icon) {
      case 'truck': return <TruckIcon />;
      case 'people': return <UsersIcon />;
      case 'fuel': return <FuelIcon />;
      case 'route': return <RouteIcon />;
      case 'gps': return <GpsIcon />;
      case 'alert': return <AlertIcon />;
      case 'users': return <UsersIcon />;
      case 'calendar': return <CalendarIcon />;
      case 'tool': return <ToolIcon />;
      case 'wrench': return <WrenchIcon />;
      case 'box': return <BoxIcon />;
      case 'tire': return <TireIcon />;
      case 'building': return <BuildingIcon />;
      case 'supplier': return <SupplierIcon />;
      case 'download': return <DownloadIcon />;
      case 'settings': return <SettingsIcon />;
      default: return <DocumentIcon />;
    }
  };

  return (
    <Link
      to={to}
      className={`${colors.bg} ${colors.hover} rounded-2xl p-6 border-2 border-transparent transition-all duration-200 group shadow-sm hover:shadow-md`}
    >
      <div className={`${colors.icon} w-14 h-14 rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-200`}>
        {getIcon()}
      </div>
      <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>
    </Link>
  );
}

// Icons
function TruckIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function FuelIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  );
}

function GpsIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function ToolIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function TireIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" strokeWidth={2} />
      <circle cx="12" cy="12" r="4" strokeWidth={2} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v5m0 8v5M3 12h5m8 0h5" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function SupplierIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
