import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import uploadsService from '../services/uploads.service';
import type { Fichier, CategorieFichier } from '../services/uploads.service';

interface FileUploadProps {
  entiteType: string;
  entiteId: number;
  categorie?: CategorieFichier;
  onUploadComplete?: (fichier: Fichier) => void;
  accept?: string;
  maxFiles?: number;
}

const categorieLabels: Record<CategorieFichier, string> = {
  FACTURE: 'Facture',
  BON_LIVRAISON: 'Bon de livraison',
  PIECE_IDENTITE: "Pièce d'identité",
  PERMIS_CONDUIRE: 'Permis de conduire',
  CARTE_GRISE: 'Carte grise',
  ASSURANCE: 'Assurance',
  CONTROLE_TECHNIQUE: 'Contrôle technique',
  PHOTO_PANNE: 'Photo panne',
  PHOTO_PIECE: 'Photo pièce',
  PHOTO_CAMION: 'Photo camion',
  PHOTO_CHAUFFEUR: 'Photo chauffeur',
  AUTRE: 'Autre',
};

export default function FileUpload({
  entiteType,
  entiteId,
  categorie: defaultCategorie,
  onUploadComplete,
  accept = 'image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx',
  maxFiles = 10,
}: FileUploadProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategorie, setSelectedCategorie] = useState<CategorieFichier | undefined>(defaultCategorie);
  const [description, setDescription] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const { data: fichiers, isLoading } = useQuery({
    queryKey: ['fichiers', entiteType, entiteId],
    queryFn: () => uploadsService.getByEntite(entiteType, entiteId),
    enabled: !!entiteId,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, categorie, desc }: { file: File; categorie?: CategorieFichier; desc?: string }) =>
      uploadsService.upload(file, entiteType, entiteId, categorie, desc),
    onSuccess: (fichier) => {
      queryClient.invalidateQueries({ queryKey: ['fichiers', entiteType, entiteId] });
      setDescription('');
      onUploadComplete?.(fichier);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: uploadsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fichiers', entiteType, entiteId] });
    },
  });

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).slice(0, maxFiles).forEach((file) => {
      uploadMutation.mutate({ file, categorie: selectedCategorie, desc: description });
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const getFileIcon = (typeFichier: string) => {
    switch (typeFichier) {
      case 'IMAGE':
        return (
          <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'VIDEO':
        return (
          <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      case 'PDF':
        return (
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragActive ? 'border-yellow-500 bg-yellow-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="mt-2 text-sm text-gray-600">
          <span className="font-medium text-yellow-600">Cliquez pour ajouter</span> ou glissez-déposez
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Images, vidéos, PDF, Word, Excel (max 10MB)
        </p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
          <select
            value={selectedCategorie || ''}
            onChange={(e) => setSelectedCategorie(e.target.value as CategorieFichier || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
          >
            <option value="">-- Aucune --</option>
            {Object.entries(categorieLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description optionnelle"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
          />
        </div>
      </div>

      {/* Upload Progress */}
      {uploadMutation.isPending && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500"></div>
          Téléchargement en cours...
        </div>
      )}

      {/* Files List */}
      {fichiers && fichiers.length > 0 && (
        <div className="border rounded-lg divide-y">
          {fichiers.map((fichier) => (
            <div key={fichier.id} className="flex items-center gap-4 p-3 hover:bg-gray-50">
              {/* Thumbnail or Icon */}
              {fichier.typeFichier === 'IMAGE' ? (
                <img
                  src={uploadsService.getViewUrl(fichier.id)}
                  alt={fichier.nomOriginal}
                  className="w-12 h-12 object-cover rounded"
                />
              ) : (
                <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded">
                  {getFileIcon(fichier.typeFichier)}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{fichier.nomOriginal}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{uploadsService.formatFileSize(fichier.taille)}</span>
                  {fichier.categorie && (
                    <>
                      <span>•</span>
                      <span>{categorieLabels[fichier.categorie]}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>{new Date(fichier.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
                {fichier.description && (
                  <p className="text-xs text-gray-500 truncate">{fichier.description}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <a
                  href={uploadsService.getViewUrl(fichier.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-500 hover:text-blue-600"
                  title="Voir"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </a>
                <a
                  href={uploadsService.getDownloadUrl(fichier.id)}
                  className="p-2 text-gray-500 hover:text-green-600"
                  title="Télécharger"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>
                <button
                  onClick={() => deleteMutation.mutate(fichier.id)}
                  className="p-2 text-gray-500 hover:text-red-600"
                  title="Supprimer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500"></div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && fichiers && fichiers.length === 0 && (
        <p className="text-center text-sm text-gray-500 py-4">Aucun fichier attaché</p>
      )}
    </div>
  );
}
