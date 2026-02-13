import { Link, useLocation } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

// Mapping des routes vers les labels
const routeLabels: Record<string, string> = {
  dashboard: 'Tableau de bord',
  camions: 'Camions',
  chauffeurs: 'Chauffeurs',
  clients: 'Clients',
  fournisseurs: 'Fournisseurs',
  transport: 'Transport',
  location: 'Location',
  carburant: 'Carburant',
  pieces: 'Pices',
  pneumatiques: 'Pneumatiques',
  pannes: 'Pannes',
  alertes: 'Alertes',
  gps: 'GPS',
  export: 'Export',
  users: 'Utilisateurs',
};

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  currentPage?: string;
}

export function Breadcrumb({ items, currentPage }: BreadcrumbProps) {
  const location = useLocation();

  // Si pas d'items fournis, générer automatiquement depuis l'URL
  const breadcrumbItems: BreadcrumbItem[] = items || (() => {
    const paths = location.pathname.split('/').filter(Boolean);
    const generated: BreadcrumbItem[] = [{ label: 'Accueil', path: '/dashboard' }];

    paths.forEach((path, index) => {
      const fullPath = '/' + paths.slice(0, index + 1).join('/');
      const label = routeLabels[path] || path;

      if (index === paths.length - 1) {
        generated.push({ label: currentPage || label });
      } else {
        generated.push({ label, path: fullPath });
      }
    });

    return generated;
  })();

  return (
    <nav className="flex items-center text-sm text-gray-500 mb-4">
      {breadcrumbItems.map((item, index) => (
        <span key={index} className="flex items-center">
          {index > 0 && (
            <svg className="w-4 h-4 mx-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          {item.path ? (
            <Link
              to={item.path}
              className="hover:text-yellow-600 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
