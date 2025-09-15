import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminAuthGuard from './AdminAuthGuard';
import { getAuthState, clearAuthData } from '../utils/auth';
import { adminAuthApi, incidentsApi } from '../utils/api';

interface AdminLayoutProps {
  children?: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [adminInfo, setAdminInfo] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [readNotifications, setReadNotifications] = useState<Set<number>>(() => {
    const saved = localStorage.getItem('readNotifications');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

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

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Save read notifications to localStorage
  useEffect(() => {
    localStorage.setItem('readNotifications', JSON.stringify([...readNotifications]));
  }, [readNotifications]);

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

  // Fetch notifications (incidents) for admin
  const fetchNotifications = async () => {
    try {
      const response = await incidentsApi.getIncidents();
      if (response.success && Array.isArray(response.incidents)) {
        const latestNotifications = response.incidents.slice(0, 5); // Show latest 5 incidents as notifications
        setNotifications(latestNotifications);

        // Clean up read notifications that are no longer in the list
        const currentIds = new Set(latestNotifications.map(notif => notif.incident_id));
        setReadNotifications(prev => {
          const cleaned = new Set([...prev].filter(id => currentIds.has(id)));
          return cleaned;
        });
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  // Toggle notification dropdown
  const toggleNotifDropdown = () => {
    if (!showNotifDropdown) {
      fetchNotifications();
    }
    setShowNotifDropdown(!showNotifDropdown);
  };

  // Mark notification as read
  const markAsRead = (incidentId: number) => {
    setReadNotifications(prev => new Set([...prev, incidentId]));
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    const allIds = notifications.map(notif => notif.incident_id);
    setReadNotifications(new Set(allIds));
  };

  // Get unread notifications count
  const unreadCount = notifications.filter(notif => !readNotifications.has(notif.incident_id)).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showNotifDropdown && !target.closest('.notification-dropdown') && !target.closest('.notification-button')) {
        setShowNotifDropdown(false);
      }
    };

    if (showNotifDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifDropdown]);

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
              <div className="relative">
                <button
                  onClick={toggleNotifDropdown}
                  className="notification-button p-2 rounded-lg text-gray-600 hover:bg-gray-100 relative"
                >
                  <i className="ri-notification-3-line text-xl"></i>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {showNotifDropdown && (
                  <div className="notification-dropdown absolute right-0 mt-2 w-96 h-128 overflow-y-auto bg-white rounded-lg shadow-lg border border-gray-200 z-50" style={{ width: '384px', height: '512px' }}>
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Incident Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div className="p-4 text-gray-500">No notifications</div>
                    ) : (
                      notifications.map((notif) => {
                        const isRead = readNotifications.has(notif.incident_id);
                        return (
                          <div
                            key={notif.incident_id}
                            className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer relative ${
                              !isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                            }`}
                            onClick={() => {
                              if (!isRead) {
                                markAsRead(notif.incident_id);
                              }
                              navigate('/admin/incidents/view');
                              setShowNotifDropdown(false);
                            }}
                          >
                            {!isRead && (
                              <div className="absolute left-2 top-4 w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                            <div className={`${!isRead ? 'ml-3' : ''}`}>
                              <p className={`text-sm font-medium truncate ${isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                                {notif.incident_type}
                              </p>
                              <p className={`text-xs truncate ${isRead ? 'text-gray-500' : 'text-gray-600'}`}>
                                {notif.description}
                              </p>
                              <p className="text-xs text-gray-400">{new Date(notif.date_reported).toLocaleString()}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

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
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate('/admin/profile');
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <i className="ri-user-line mr-3"></i>
                    Profile Settings
                  </button>
                     
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
