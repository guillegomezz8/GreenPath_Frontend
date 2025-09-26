import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthProvider';
import Topbar from '@/components/layout/Topbar';
import Sidebar from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

export const MainLayout = ({ children }) => {
  const { user, userRole } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-green-50 relative">
      <div className={`fixed flex z-50 top-2 p-2 ${isSidebarOpen ? 'left-[260px]' : 'left-4'}`}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleSidebar}
          className={` bg-green-600 text-white rounded shadow left-4 hover:bg-green-700`}
        >
          <Menu size={20} />
        </Button>
        <div className="flex items-center gap-4 px-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-green-800">GreenPath - {userRole ? userRole : 'Rol Desconocido'}</span>
          </div>
        </div>
      </div>
      
      {user && isSidebarOpen && (
        <aside className="fixed top-0 left-0 w-64 h-screen bg-white text-green-800 z-30 overflow-y-auto border-r border-gray-200">
          <Sidebar />
        </aside>
      )}

      <div
        className={`h-16 w-full flex items-center bg-white px-4 fixed top-0 left-0 z-20 transition-all ${
          isSidebarOpen ? 'ml-64' : ''
        }`}
      >
        <Topbar onToggleSidebar={handleToggleSidebar} />
      </div>

      <main
        className={`pt-20 px-4 md:px-6 transition-all relative ${
          isSidebarOpen ? 'ml-64' : ''
        }`}
        style={{ minHeight: 'calc(100vh - 4rem)' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key="page-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="min-h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};