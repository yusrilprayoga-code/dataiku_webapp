'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Database, FileText, Folder, LayoutDashboard, Upload } from 'lucide-react';

const navItems = [
//   {
//     label: 'Data Input',
//     path: '/data-input',
//     icon: Database,
//     description: 'Import and manage data'
//   },
//   {
//     label: 'File Upload',
//     path: '/file-upload',
//     icon: Upload,
//     description: 'Upload files and documents'
//   },
  {
    label: 'Structures',
    path: '/structures',
    icon: Folder,
    description: 'Browse data structures'
  },
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    description: 'Analytics dashboard'
  }
];

export default function UniversalHeader() {
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const isActivePath = (path: string) => {
    if (path === '/dashboard') {
      return pathname.startsWith('/dashboard');
    }
    return pathname === path;
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="px-4 py-4">
        <nav className="flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActivePath(item.path);
            
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-transparent'
                  }
                `}
                title={item.description}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
