import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../../../components/base/Avatar';
import LogoutModal from '../../../components/LogoutModal';
import { getAuthState, clearAuthData, updateUserData, type UserData } from '../../../utils/auth';
import { adminAuthApi } from '../../../utils/api';

export default function AdminProfilePage() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUserData, setEditedUserData] = useState<UserData>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const authState = getAuthState();
    if (!authState.isAuthenticated || authState.userType !== 'admin') {
      navigate('/admin/login');
      return;
    }
    setUserData(authState.userData || {});
    setIsAuthenticated(true);

    // Fetch fresh profile data
    const fetchProfileData = async () => {
      try {
        const response = await adminAuthApi.getProfile();
        if (response.success && response.admin) {
          setUserData(prev => prev ? { ...prev, ...response.admin } : response.admin);
          updateUserData(response.admin);
        }
      } catch (error) {
        console.error('Failed to fetch profile data:', error);
      }
    };

    fetchProfileData();

    // Listen for authentication state changes
    const handleAuthStateChange = () => {
      const newAuthState = getAuthState();
      if (!newAuthState.isAuthenticated || newAuthState.userType !== 'admin') {
        navigate('/admin/login');
        return;
      }
      setIsAuthenticated(newAuthState.isAuthenticated);
      setUserData(newAuthState.userData || {});
    };

    window.addEventListener('storage', handleAuthStateChange);
    window.addEventListener('authStateChanged', handleAuthStateChange);

    return () => {
      window.removeEventListener('storage', handleAuthStateChange);
      window.removeEventListener('authStateChanged', handleAuthStateChange);
    };
  }, [navigate]);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      clearAuthData();
      navigate('/admin/login');
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

  const handleEditClick = () => {
    if (userData) {
      setEditedUserData({ ...userData });
      setIsEditing(true);
      setError('');
    }
  };

  const handleSaveClick = async () => {
    if (!editedUserData.name || !editedUserData.email) {
      setError('Name and email are required');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await adminAuthApi.updateProfile({
        name: editedUserData.name,
        email: editedUserData.email,
      });

      console.log('Update profile response:', response);

      if (response.success && response.admin) {
        // Use the updated admin data directly
        setUserData(response.admin);
        updateUserData(response.admin);
        setIsEditing(false);
        setEditedUserData({});
      } else {
        setError(response.message || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      setError(error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setEditedUserData({});
    setError('');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-600 rounded-2xl flex items-center justify-center">
            <i className="ri-loader-4-line text-2xl text-white animate-spin"></i>
          </div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Profile Summary Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-8">
            <div className="text-center mb-6">
              <div className="mb-4">
                <Avatar
                  name={userData?.name}
                  email={userData?.email}
                  size="xl"
                  className="mx-auto"
                />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                {userData?.name || 'Admin Profile'}
              </h3>
              <p className="text-gray-600 mb-4">{userData?.email || 'No email provided'}</p>
          

              <div className="mt-6 pt-6 border-t border-gray-200 flex flex-col gap-2">
                {!isEditing ? (
                  <button
                    onClick={handleEditClick}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <>
                    {error && (
                      <p className="text-red-600 text-sm mb-2">{error}</p>
                    )}
                    <div className="flex gap-4">
                      <button
                        onClick={handleSaveClick}
                        disabled={isSaving}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={handleCancelClick}
                        disabled={isSaving}
                        className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Information Display */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-6">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {isEditing ? 'Edit Profile Information' : 'Profile Information'}
                </h2>
                <p className="text-blue-100 mt-1">
                  {isEditing ? 'Update your admin profile details' : 'View your admin profile details'}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="space-y-8">
                {/* Basic Information Section */}
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <i className="ri-user-line text-blue-600"></i>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      {isEditing ? (
                        <input
                          type="text"
                          className="w-full border border-gray-300 rounded-lg p-2"
                          value={editedUserData.name || ''}
                          onChange={e => setEditedUserData({ ...editedUserData, name: e.target.value })}
                        />
                      ) : (
                        <p className="text-gray-900">{userData?.name || 'Not provided'}</p>
                      )}
                    </div>
                    {!isEditing && (
                      <>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                          <p className="text-gray-900">{userData?.role || 'Not provided'}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                          <p className="text-gray-900">{userData?.status || 'Not provided'}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Contact Information Section */}
                <div className="border-t border-gray-100 pt-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <i className="ri-mail-line text-green-600"></i>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                  </div>
                  <div className="grid md:grid-cols-1 gap-6">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                      {isEditing ? (
                        <input
                          type="email"
                          className="w-full border border-gray-300 rounded-lg p-2"
                          value={editedUserData.email || ''}
                          onChange={e => setEditedUserData({ ...editedUserData, email: e.target.value })}
                        />
                      ) : (
                        <p className="text-gray-900">{userData?.email || 'Not provided'}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
        userData={userData || {}}
        isLoading={isLoggingOut}
      />
    </div>
  );
}
