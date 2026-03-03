import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthProvider';
import Topbar from '@/components/layout/Topbar';
import Sidebar from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { getRoleLabel } from '@/components/Utils';

export const MainLayout = ({ children }) => {
  const { user } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const roleLabel = getRoleLabel(user?.role_type || user?.role_label);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handleCloseSidebar = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-green-50 relative">
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={handleCloseSidebar}
        />
      )}

      <div className={`fixed flex z-50 top-2 p-2 transition-all duration-300 ${
        !isMobile && isSidebarOpen ? 'left-[260px]' : 'left-4'
      }`}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleSidebar}
          className="bg-green-600 text-white rounded shadow hover:bg-white hover:text-green-600"
        >
          {isMobile && isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
        <div className="flex items-center gap-4 px-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-green-800 hidden sm:inline">
              GreenPath - {roleLabel}
            </span>
            <span className="font-semibold text-green-800 sm:hidden">
              GreenPath - {roleLabel}
            </span>
          </div>
        </div>
      </div>
      
      <AnimatePresence>
        {user && isSidebarOpen && (
          <motion.aside
            initial={{ x: -264 }}
            animate={{ x: 0 }}
            exit={{ x: -264 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`fixed top-0 left-0 w-64 h-screen bg-white text-green-800 overflow-y-auto border-r border-gray-200 ${
              isMobile ? 'z-50' : 'z-30'
            }`}
          >
            <Sidebar onItemClick={handleCloseSidebar} />
          </motion.aside>
        )}
      </AnimatePresence>

      <div
        className={`h-16 flex items-center bg-white fixed top-0 right-0 z-20 transition-all duration-300 ${
          !isMobile && isSidebarOpen ? 'left-64' : 'left-0'
        }`}
      >
        <Topbar onToggleSidebar={handleToggleSidebar} />
      </div>

      <main
        className={`pt-20 px-4 md:px-6 transition-all duration-300 relative ${
          !isMobile && isSidebarOpen ? 'ml-64' : ''
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
