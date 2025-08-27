'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Database, FileText, Folder, LayoutDashboard, Loader2, Upload } from 'lucide-react';

const navItems = [
  {
    label: 'Data Input',
    path: '/',
    icon: Database,
    description: 'Import and manage data'
  },
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
    label: 'Data Prep',
    path: '/data-prep',
    icon: FileText,
    description: 'Data preparation tools'
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
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  useEffect(() => {
    // Setiap kali pathname berubah, set loading kembali ke null
    setLoadingPath(null);
  }, [pathname]);
  const handleNavigation = (path: string) => {
    if (pathname === path) return;

    setLoadingPath(path);
    router.push(path);
  };

  const isActivePath = (path: string) => {
    if (path === '/dashboard') {
      return pathname.startsWith('/dashboard');
    }
    if (path === '/data-prep') {
      return pathname.startsWith('/data-prep');
    }
    return pathname === path;
  };
  return (
    // <-- 1. Gunakan React Fragment (<>) untuk mengelompokkan header dan overlay
    <>
      {/* 2. Tampilkan overlay HANYA JIKA loadingPath tidak null */}
      {loadingPath && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-white" />
            <p className="text-white text-lg font-semibold">
              Loading Page...
            </p>
          </div>
        </div>
      )}

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
                  // 3. Tombol dinonaktifkan jika sudah aktif
                  disabled={isActive}
                  className={`
                                        flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                                        ${isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 cursor-default'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-transparent'
                    }
                                        disabled:cursor-not-allowed
                                    `}
                  title={item.description}
                >
                  {/* 4. Tampilan tombol kembali sederhana */}
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>
    </>
  );
}