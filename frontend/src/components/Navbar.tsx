import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuthState, clearAuthData, type UserData } from '../utils/auth';
import LogoutModal from './LogoutModal';

interface NavbarProps {
  isAuthenticated?: boolean;
  userData?: UserData | null;
}

const Navbar: React.FC<NavbarProps> = ({ isAuthenticated: propIsAuthenticated, userData: propUserData }) => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(propIsAuthenticated || false);
  const [userData, setUserData] = useState<UserData | null>(propUserData || null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const authState = getAuthState();
    setIsAuthenticated(authState.isAuthenticated);
    setUserData(authState.userData);



    const handleAuthStateChange = () => {
      const newAuthState = getAuthState();
      setIsAuthenticated(newAuthState.isAuthenticated);
      setUserData(newAuthState.userData);
    };

    window.addEventListener('storage', handleAuthStateChange);
    window.addEventListener('authStateChanged', handleAuthStateChange);

    return () => {
      window.removeEventListener('storage', handleAuthStateChange);
      window.removeEventListener('authStateChanged', handleAuthStateChange);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isMobileMenuOpen) {
          setIsMobileMenuOpen(false);
        }
        if (isProfileDropdownOpen) {
          setIsProfileDropdownOpen(false);
        }
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isProfileDropdownOpen && !target.closest('.profile-dropdown')) {
        setIsProfileDropdownOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    if (isProfileDropdownOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen, isProfileDropdownOpen]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    setIsProfileDropdownOpen(false); // Close profile dropdown when opening mobile menu
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
    setIsMobileMenuOpen(false); // Close mobile menu when opening profile dropdown
  };

  const closeProfileDropdown = () => {
    setIsProfileDropdownOpen(false);
  };

  const handleNavigation = (path: string, label: string) => {
    // Close all menus first
    closeProfileDropdown();
    closeMobileMenu();

    // If we're on the profile page, use window.location.href for reliable navigation
    if (window.location.pathname === '/profile') {
      window.location.href = path;
      return;
    }

    // Force navigation even if we're on the same path
    if (window.location.pathname === path) {
      window.location.reload();
      return;
    }

    // Use React Router navigate for other pages
    try {
      navigate(path, { replace: false });
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback to window.location if navigate fails
      window.location.href = path;
    }
  };

  const handleProfileClick = () => {
    handleNavigation('/profile', 'Profile');
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
    closeProfileDropdown();
    closeMobileMenu();
  };

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      // Add a small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      clearAuthData();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  return (
    <>
      <nav className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-gray-200 sticky top-0 z-50 transition-all duration-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
                <i className="ri-government-line text-xl text-white"></i>
              </div>
              <div className="ml-3">
                <span className="text-xl font-bold text-gray-900">ProteQ</span>
                <span className="block text-sm text-gray-600">Rosario, Batangas</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <button
                onClick={() => handleNavigation('/', 'Home')}
                className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
              >
                Home
              </button>
              <button
                onClick={() => handleNavigation('/evacuation-center', 'Evacuation Centers')}
                className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
              >
                Evacuation Centers
              </button>
              <button
                onClick={() => handleNavigation('/safety-protocols', 'Safety Protocols')}
                className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
              >
                Safety Protocols
              </button>
              <button
                onClick={() => handleNavigation('/incident-report', 'Incident Report')}
                className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
              >
                Report Incident
              </button>
              {/* Admin Dashboard Link */}
              {userData?.userType === 'admin' && (
                <button
                  onClick={() => handleNavigation('/admin/dashboard', 'Admin Dashboard')}
                  className="text-white bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg transition-colors font-medium flex items-center"
                >
                  <i className="ri-admin-line mr-2"></i>
                  Admin Panel
                </button>
              )}
            </div>

            {/* Desktop Auth */}
            <div className="hidden md:flex items-center space-x-4">
              {isAuthenticated ? (
                <div className="relative profile-dropdown">
                  <button
                    onClick={toggleProfileDropdown}
                    className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 font-medium focus:outline-none group"
                  >
                    <div className="w-9 h-9 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-white font-semibold text-sm">
                        {(userData?.firstName || userData?.first_name)?.charAt(0)?.toUpperCase() ||
                         userData?.email?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="hidden lg:block text-left">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                        {(userData?.firstName || userData?.first_name) && (userData?.lastName || userData?.last_name)
                          ? `${userData.firstName || userData.first_name} ${userData.lastName || userData.last_name}`
                          : userData?.email?.split('@')[0] || 'User'
                        }
                      </p>
                      <p className="text-xs text-gray-500 truncate max-w-32" title={userData?.email || 'No email'}>
                        {userData?.email || 'No email'}
                      </p>
                    </div>
                    <i className={`ri-arrow-down-s-line ml-1 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''} group-hover:text-blue-600`}></i>
                  </button>
                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      {/* User Info Header */}
                      <div className="px-4 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 rounded-t-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
                            <span className="text-white font-semibold text-lg">
                              {(userData?.firstName || userData?.first_name)?.charAt(0)?.toUpperCase() ||
                               userData?.email?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">
                              {(userData?.firstName || userData?.first_name) && (userData?.lastName || userData?.last_name)
                                ? `${userData.firstName || userData.first_name} ${userData.lastName || userData.last_name}`
                                : userData?.email?.split('@')[0] || 'User'
                              }
                            </p>
                            <p className="text-gray-600 text-xs truncate" title={userData?.email || 'No email'}>
                              {userData?.email || 'No email provided'}
                            </p>
                            <div className="flex items-center mt-1">
                              <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                              <span className="text-xs text-gray-500">Online</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        <button
                          onClick={handleProfileClick}
                          className="flex items-center w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 group"
                        >
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-100 transition-colors">
                            <i className="ri-user-settings-line text-gray-600 group-hover:text-blue-600"></i>
                          </div>
                          <div>
                            <p className="font-medium text-sm">Account Settings</p>
                            <p className="text-xs text-gray-500">Manage your profile</p>
                          </div>
                        </button>

                        <button
                          onClick={() => handleNavigation('/history-report', 'History Report')}
                          className="flex items-center w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 group"
                        >
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-100 transition-colors">
                            <i className="ri-file-list-line text-gray-600 group-hover:text-blue-600"></i>
                          </div>
                          <div>
                            <p className="font-medium text-sm">History Report</p>
                            <p className="text-xs text-gray-500">View your incident reports</p>
                          </div>
                        </button>

                        <div className="border-t border-gray-100 my-1"></div>

                        <button
                          onClick={handleLogoutClick}
                          className="flex items-center w-full text-left px-4 py-3 text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group"
                        >
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-red-100 transition-colors">
                            <i className="ri-logout-box-line text-gray-600 group-hover:text-red-600"></i>
                          </div>
                          <div>
                            <p className="font-medium text-sm">Sign Out</p>
                            <p className="text-xs text-gray-500">Logout from your account</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => handleNavigation('/auth/login', 'Desktop Sign In')}
                    className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => handleNavigation('/auth/signup', 'Desktop Get Started')}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium"
                  >
                    Get Started
                  </button>
                </div>
              )}
            </div>



            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none"
              onClick={toggleMobileMenu}
              aria-label="Toggle mobile menu"
            >
              <i className={`ri-${isMobileMenuOpen ? 'close' : 'menu'}-line text-xl text-gray-700`}></i>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={closeMobileMenu}></div>
          <div className="fixed top-16 left-0 right-0 bg-white shadow-xl border-t border-gray-200 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="px-4 py-6 space-y-2">
              <button
                onClick={() => handleNavigation('/', 'Mobile Home')}
                className="flex items-center w-full px-4 py-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 font-medium"
              >
                <i className="ri-home-line text-lg mr-3"></i>
                Home
              </button>
              <button
                onClick={() => handleNavigation('/evacuation-center', 'Mobile Evacuation Centers')}
                className="flex items-center w-full px-4 py-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 font-medium"
              >
                <i className="ri-building-2-line text-lg mr-3"></i>
                Evacuation Centers
              </button>
              <button
                onClick={() => handleNavigation('/safety-protocols', 'Mobile Safety Protocols')}
                className="flex items-center w-full px-4 py-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 font-medium"
              >
                <i className="ri-shield-check-line text-lg mr-3"></i>
                Safety Protocols
              </button>
              <button
                onClick={() => handleNavigation('/incident-report', 'Mobile Incident Report')}
                className="flex items-center w-full px-4 py-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 font-medium"
              >
                <i className="ri-error-warning-line text-lg mr-3"></i>
                Report Incident
              </button>

              {/* Mobile Admin Dashboard Link */}
              {userData?.userType === 'admin' && (
                <button
                  onClick={() => handleNavigation('/admin/dashboard', 'Mobile Admin Dashboard')}
                  className="flex items-center w-full px-4 py-3 rounded-lg text-white bg-red-600 hover:bg-red-700 transition-all duration-200 font-medium"
                >
                  <i className="ri-admin-line text-lg mr-3"></i>
                  Admin Panel
                </button>
              )}

              <div className="border-t border-gray-200 my-4"></div>

              {isAuthenticated ? (
                <div className="space-y-3">
                  {/* Mobile User Info Card */}
                  <div className="px-4 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
                        <span className="text-white font-semibold text-lg">
                          {(userData?.firstName || userData?.first_name)?.charAt(0)?.toUpperCase() ||
                           userData?.email?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-base truncate">
                          {(userData?.firstName || userData?.first_name) && (userData?.lastName || userData?.last_name)
                            ? `${userData.firstName || userData.first_name} ${userData.lastName || userData.last_name}`
                            : userData?.email?.split('@')[0] || 'User'
                          }
                        </p>
                        <p className="text-gray-600 text-sm truncate" title={userData?.email || 'No email'}>
                          {userData?.email || 'No email provided'}
                        </p>
                        <div className="flex items-center mt-1">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                          <span className="text-xs text-gray-500">Online</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Menu Items */}
                  <button
                    onClick={() => handleNavigation('/profile', 'Mobile Profile')}
                    className="flex items-center w-full px-4 py-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 group"
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-100 transition-colors">
                      <i className="ri-settings-line text-gray-600 group-hover:text-blue-600"></i>
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-sm">Account Settings</p>
                      <p className="text-xs text-gray-500">Manage your profile</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavigation('/history-report', 'Mobile History Report')}
                    className="flex items-center w-full px-4 py-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 group"
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-100 transition-colors">
                      <i className="ri-file-list-line text-gray-600 group-hover:text-blue-600"></i>
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-sm">History Report</p>
                      <p className="text-xs text-gray-500">View your incident reports</p>
                    </div>
                  </button>

                  <button
                    onClick={handleLogoutClick}
                    className="flex items-center w-full px-4 py-3 rounded-lg text-gray-700 hover:text-red-600 hover:bg-red-50 transition-all duration-200 group"
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-red-100 transition-colors">
                      <i className="ri-logout-box-line text-gray-600 group-hover:text-red-600"></i>
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-sm">Sign Out</p>
                      <p className="text-xs text-gray-500">Logout from your account</p>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => handleNavigation('/auth/login', 'Mobile Sign In')}
                    className="flex items-center w-full px-4 py-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 font-medium"
                  >
                    <i className="ri-login-box-line text-lg mr-3"></i>
                    Sign In
                  </button>
                  <button
                    onClick={() => handleNavigation('/auth/signup', 'Mobile Get Started')}
                    className="flex items-center justify-center w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg"
                  >
                    <i className="ri-user-add-line text-lg mr-2"></i>
                    Get Started
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
        userData={userData || undefined}
        isLoading={isLoggingOut}
      />
    </>
  );
};

export default Navbar;