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
    <div className="min-h-screen relative overflow-x-hidden">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 top-16 -z-10 overflow-hidden">
        <div className="absolute -left-24 -top-10 h-72 w-72 rounded-full bg-primary/12 blur-3xl" />
        <div className="absolute -right-24 top-40 h-72 w-72 rounded-full bg-emerald-300/12 blur-3xl" />
      </div>

      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/35 backdrop-blur-[1px] z-40"
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
          className="rounded-lg bg-primary/90 text-primary-foreground shadow-elegant hover:bg-primary"
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
            className={`fixed top-0 left-0 w-64 h-screen bg-sidebar text-sidebar-foreground overflow-y-auto border-r border-sidebar-border shadow-elegant ${
              isMobile ? 'z-50' : 'z-30'
            }`}
          >
            <Sidebar onItemClick={handleCloseSidebar} />
          </motion.aside>
        )}
      </AnimatePresence>

      <div
        className={`h-16 flex items-center bg-white border-b border-border shadow-sm fixed top-0 right-0 z-20 transition-all duration-300 ${
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
            className="min-h-full pb-6 md:pb-8"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
