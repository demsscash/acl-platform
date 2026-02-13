import { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth.store';
import { useTheme } from '../contexts/ThemeContext';
import { ROLE_LABELS } from '../types';
import type { Module, RoleUtilisateur } from '../types';
import OfflineIndicator from '../components/OfflineIndicator';
import alertesService from '../services/alertes.service';
import notificationsService from '../services/notifications.service';

interface MenuItem {
  name: string;
  path: string;
  permission: Module | 'dashboard'; // dashboard is always accessible
  icon: React.ReactNode;
}

const menuItems: MenuItem[] = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    permission: 'dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    name: 'Camions',
    path: '/camions',
    permission: 'camions',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  {
    name: 'Chauffeurs',
    path: '/chauffeurs',
    permission: 'chauffeurs',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    name: 'Clients',
    path: '/clients',
    permission: 'clients',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    name: 'Carburant',
    path: '/carburant',
    permission: 'carburant',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      </svg>
    ),
  },
  {
    name: 'Pièces & Stock',
    path: '/pieces',
    permission: 'pieces',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    name: 'Fournisseurs',
    path: '/fournisseurs',
    permission: 'fournisseurs',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    name: 'Transport',
    path: '/transport',
    permission: 'transport',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    name: 'Location',
    path: '/location',
    permission: 'location',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    name: 'Pneumatiques',
    path: '/pneumatiques',
    permission: 'pneumatiques',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" strokeWidth={2} />
        <circle cx="12" cy="12" r="4" strokeWidth={2} />
      </svg>
    ),
  },
  {
    name: 'Export',
    path: '/export',
    permission: 'export',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
  },
  {
    name: 'GPS',
    path: '/gps',
    permission: 'gps',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    name: 'Alertes',
    path: '/alertes',
    permission: 'alertes',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    name: 'Pannes',
    path: '/pannes',
    permission: 'pannes',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  {
    name: 'Entretien',
    path: '/entretien',
    permission: 'entretien',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    name: 'Caisses',
    path: '/caisses',
    permission: 'caisses',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    name: 'Utilisateurs',
    path: '/users',
    permission: 'users',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    name: 'Configuration',
    path: '/config',
    permission: 'config',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, canAccess } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // Récupérer les stats des alertes
  const { data: alertStats } = useQuery({
    queryKey: ['alertes-stats'],
    queryFn: alertesService.getStats,
    refetchInterval: 60000, // Refresh every minute
  });

  // Récupérer les alertes actives récentes
  const { data: recentAlertes } = useQuery({
    queryKey: ['alertes', 'ACTIVE'],
    queryFn: () => alertesService.getAll('ACTIVE'),
    refetchInterval: 60000,
  });

  // Récupérer les notifications utilisateur
  const queryClient = useQueryClient();
  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsService.getAll(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: notifCount } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: notificationsService.getUnreadCount,
    refetchInterval: 30000,
  });

  const handleMarkNotificationRead = async (id: number) => {
    await notificationsService.markAsRead(id);
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
  };

  const handleMarkAllRead = async () => {
    await notificationsService.markAllAsRead();
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
  };

  // Get link for a notification based on its reference type
  const getNotificationLink = (notification: { referenceType?: string; referenceId?: number }) => {
    if (!notification.referenceType || !notification.referenceId) return null;
    switch (notification.referenceType) {
      case 'transport':
        return `/transport?id=${notification.referenceId}`;
      case 'location':
        return `/location?id=${notification.referenceId}`;
      case 'panne':
        return `/pannes?id=${notification.referenceId}`;
      case 'maintenance':
        return `/entretien?id=${notification.referenceId}`;
      default:
        return null;
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadgeClass = (role: RoleUtilisateur) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-800';
      case 'RESPONSABLE_LOGISTIQUE': return 'bg-indigo-100 text-indigo-800';
      case 'COORDINATEUR': return 'bg-blue-100 text-blue-800';
      case 'MAGASINIER': return 'bg-green-100 text-green-800';
      case 'COMPTABLE': return 'bg-emerald-100 text-emerald-800';
      case 'MAINTENANCIER': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: RoleUtilisateur) => {
    return ROLE_LABELS[role] || role;
  };

  // Filtrer les éléments du menu selon les permissions
  const filteredMenuItems = menuItems.filter(item => {
    if (item.permission === 'dashboard') return true; // Dashboard always accessible
    return canAccess(item.permission as Module);
  });

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 ${sidebarOpen ? 'w-64' : 'w-20'} bg-gray-900 transition-all duration-300`}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-gray-900 font-bold text-lg">A</span>
            </div>
            {sidebarOpen && <span className="text-white font-bold text-lg">ACL Platform</span>}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-white p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M13 5l7 7-7 7M5 5l7 7-7 7"} />
            </svg>
          </button>
        </div>

        {/* Menu */}
        <nav className="mt-6 px-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          {filteredMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-3 mb-1 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-yellow-500 text-gray-900'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {item.icon}
                {sidebarOpen && <span className="font-medium">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <div className={`flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{user?.prenom} {user?.nom}</p>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${user?.role ? getRoleBadgeClass(user.role) : 'bg-gray-100 text-gray-800'}`}>
                  {user?.role ? getRoleLabel(user.role) : ''}
                </span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Déconnexion"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300`}>
        {/* Header avec indicateur offline */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {((notifCount || 0) + (alertStats?.actives || 0)) > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {((notifCount || 0) + (alertStats?.actives || 0)) > 99 ? '99+' : (notifCount || 0) + (alertStats?.actives || 0)}
                  </span>
                )}
              </button>

              {/* Dropdown */}
              {showNotifDropdown && (
                <>
                  <div className="fixed inset-0" onClick={() => setShowNotifDropdown(false)} />
                  <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                    <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                      {(notifCount || 0) > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-xs text-yellow-600 hover:text-yellow-700 font-medium"
                        >
                          Tout marquer lu
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {/* User Notifications */}
                      {notifications && notifications.length > 0 && (
                        <>
                          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                            Vos notifications
                          </div>
                          {notifications.slice(0, 5).map((notif) => {
                            const link = getNotificationLink(notif);
                            return (
                              <div
                                key={notif.id}
                                className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-l-4 cursor-pointer ${
                                  !notif.lue ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'border-transparent'
                                }`}
                                onClick={() => {
                                  if (!notif.lue) handleMarkNotificationRead(notif.id);
                                  if (link) {
                                    setShowNotifDropdown(false);
                                    navigate(link);
                                  }
                                }}
                              >
                                <div className="flex justify-between items-start">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">{notif.titre}</p>
                                  {!notif.lue && (
                                    <span className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0 ml-2 mt-1.5" />
                                  )}
                                </div>
                                {notif.message && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">{notif.message}</p>
                                )}
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                  {new Date(notif.createdAt).toLocaleString('fr-FR')}
                                </p>
                              </div>
                            );
                          })}
                        </>
                      )}

                      {/* System Alerts */}
                      {recentAlertes && recentAlertes.length > 0 && (
                        <>
                          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase flex justify-between">
                            <span>Alertes systeme</span>
                            {(alertStats?.critiques || 0) > 0 && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                                {alertStats?.critiques} critique(s)
                              </span>
                            )}
                          </div>
                          {recentAlertes.slice(0, 3).map((alerte) => (
                            <Link
                              key={alerte.id}
                              to="/alertes"
                              onClick={() => setShowNotifDropdown(false)}
                              className={`block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-l-4 ${
                                alerte.niveau === 'CRITICAL' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                                alerte.niveau === 'WARNING' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' :
                                'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              }`}
                            >
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{alerte.titre}</p>
                              {alerte.message && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">{alerte.message}</p>
                              )}
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                {new Date(alerte.createdAt).toLocaleString('fr-FR')}
                              </p>
                            </Link>
                          ))}
                        </>
                      )}

                      {/* Empty state */}
                      {(!notifications || notifications.length === 0) && (!recentAlertes || recentAlertes.length === 0) && (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                          Aucune notification
                        </div>
                      )}
                    </div>
                    <Link
                      to="/alertes"
                      onClick={() => setShowNotifDropdown(false)}
                      className="block p-3 text-center text-sm font-medium text-yellow-600 hover:bg-gray-50 dark:hover:bg-gray-700 border-t border-gray-100 dark:border-gray-700"
                    >
                      Voir toutes les alertes
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
              title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            >
              {theme === 'dark' ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            <OfflineIndicator />
          </div>
        </div>

        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
