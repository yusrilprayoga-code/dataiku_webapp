// app/your-route/components/FileItem.tsx
import React from 'react';
import { FileData } from '../types'; // Adjust path
import { formatDate, formatFileSize } from '../utils/fileUtils'; // Adjust path
import { File as FileIcon, FileArchiveIcon, Trash2, Folder as FolderIcon } from 'lucide-react'; // Assuming FolderIcon for structures

interface FileItemProps {
  file: FileData;
  isSelected: boolean;
  onSelect: (file: FileData) => void;
  onDelete: (fileId: string) => void;
}

const FileItem: React.FC<FileItemProps> = ({ file, isSelected, onSelect, onDelete }) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(file.id);
  };

  let IconComponent = FileIcon;
  if (file.isStructureFromZip) {
    IconComponent = FolderIcon; // For structures from ZIP
  } else if (file.originalFileType === 'application/zip') {
    IconComponent = FileArchiveIcon; // For plain ZIP files (if you still have this case)
  }


  return (
    <div
      className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
        isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500 font-medium' : 'border-l-4 border-l-transparent'
      }`}
      onClick={() => onSelect(file)}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => e.key === 'Enter' && onSelect(file)}
    >
      <div className="grid grid-cols-12 gap-2 items-center">
        <div className="col-span-6">
          <div className="flex items-center gap-2">
            <IconComponent className={`w-4 h-4 ${file.isStructureFromZip ? 'text-yellow-500' : 'text-gray-400'} flex-shrink-0`} />
            <span className="text-sm text-gray-700 truncate" title={file.name}>
              {file.name}
            </span>
          </div>
        </div>
        <div className="col-span-3 text-xs text-gray-500">{formatDate(file.lastModified)}</div>
        <div className="col-span-2 text-xs text-gray-500">{formatFileSize(file.size)}</div>
        <div className="col-span-1 text-right">
          <button
            onClick={handleDelete}
            className="p-1 hover:bg-red-100 rounded text-red-500 hover:text-red-700 focus:outline-none focus:ring-1 focus:ring-red-500"
            aria-label={`Delete ${file.name}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileItem;