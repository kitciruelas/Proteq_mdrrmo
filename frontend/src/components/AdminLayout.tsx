import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminAuthGuard from './AdminAuthGuard';
import { getAuthState, clearAuthData } from '../utils/auth';
import { adminAuthApi } from '../utils/api';

interface AdminLayoutProps {
  children?: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [adminInfo, setAdminInfo] = useState<any>(null);

  useEffect(() => {
    const authState = getAuthState();
    if (authState.isAuthenticated && authState.userType === 'admin') {
      setAdminInfo(authState.userData);
    }

    const handleAuthStateChange = () => {
      const newAuthState = getAuthState();
      if (newAuthState.isAuthenticated && newAuthState.userType === 'admin') {
        setAdminInfo(newAuthState.userData);
      } else {
        setAdminInfo(null);
      }
    };

    window.addEventListener('authStateChanged', handleAuthStateChange);
    return () => window.removeEventListener('authStateChanged', handleAuthStateChange);
  }, []);

  const handleLogout = async () => {
    try {
      await adminAuthApi.logout();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      clearAuthData();
      navigate('/admin/login');
    }
  };

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <AdminAuthGuard>
      <div className="h-screen bg-gray-50 flex">
        {/* Desktop Sidebar */}
        <div className={`hidden lg:flex transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
          <AdminSidebar collapsed={isSidebarCollapsed} onToggleCollapse={toggleSidebar} />
        </div>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={toggleMobileMenu}></div>
            <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-xl overflow-y-auto thin-scrollbar">
              <AdminSidebar />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Sticky Top Navigation Bar */}
          <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 sticky top-0 z-30">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {/* Mobile Menu Button */}
                <button
                  onClick={toggleMobileMenu}
                  className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 mr-3"
                >
                  <i className="ri-menu-line text-xl"></i>
                </button>

                {/* Desktop Sidebar Toggle */}
                <button
                  onClick={toggleSidebar}
                  className="hidden lg:block p-2 rounded-lg text-gray-600 hover:bg-gray-100 mr-3"
                >
                  <i className={`ri-${isSidebarCollapsed ? 'menu-unfold' : 'menu-fold'}-line text-xl`}></i>
                </button>

                <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
              </div>

              {/* Admin Info & Actions */}
              <div className="flex items-center space-x-4">
                {/* Notifications */}
                <button className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 relative">
                  <i className="ri-notification-3-line text-xl"></i>
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    3
                  </span>
                </button>

                {/* Profile Dropdown */}
                <div className="relative group">
                  <button className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <i className="ri-user-line text-white text-sm"></i>
                    </div>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium text-gray-900">
                        {adminInfo?.name || adminInfo?.first_name || adminInfo?.firstName || 'Admin'}
                      </p>
                      <p className="text-xs text-gray-500">{adminInfo?.email || 'admin@example.com'}</p>
                    </div>
                    <i className="ri-arrow-down-s-line text-gray-400"></i>
                  </button>

                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-2">
                      <a href="#" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        <i className="ri-user-line mr-3"></i>
                        Profile Settings
                      </a>
                      <a href="#" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        <i className="ri-settings-3-line mr-3"></i>
                        System Settings
                      </a>
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <i className="ri-logout-box-line mr-3"></i>
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Scrollable Content Area */}
          <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {children || <Outlet />}
          </main>
        </div>
      </div>
    </AdminAuthGuard>
  );
};

export default AdminLayout;
