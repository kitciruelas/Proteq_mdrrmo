import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/base/Button';
import Input from '../../components/base/Input';
import Select from '../../components/base/Select';
import Card from '../../components/base/Card';
import Avatar from '../../components/base/Avatar';
import LogoutModal from '../../components/LogoutModal';
import useForm from '../../hooks/useForm';
import Navbar from '../../components/Navbar';
import { getAuthState, clearAuthData, updateUserData, type UserData } from '../../utils/auth';
import { profileApi } from '../../utils/api';

const rosarioBarangays = [
  { name: 'Alupay', lat: 13.8404, lng: 121.2922 },
  { name: 'Antipolo', lat: 13.7080, lng: 121.3096 },
  { name: 'Bagong Pook', lat: 13.8402, lng: 121.2216 },
  { name: 'Balibago', lat: 13.8512, lng: 121.2855 },
  { name: 'Barangay A', lat: 13.8457, lng: 121.2104 },
  { name: 'Barangay B', lat: 13.8461, lng: 121.2065 },
  { name: 'Barangay C', lat: 13.8467, lng: 121.2032 },
  { name: 'Barangay D', lat: 13.8440, lng: 121.2035 },
  { name: 'Barangay E', lat: 13.8415, lng: 121.2047 },
  { name: 'Bayawang', lat: 13.7944, lng: 121.2798 },
  { name: 'Baybayin', lat: 13.8277, lng: 121.2589 },
  { name: 'Bulihan', lat: 13.7967, lng: 121.2351 },
  { name: 'Cahigam', lat: 13.8021, lng: 121.2501 },
  { name: 'Calantas', lat: 13.7340, lng: 121.3129 },
  { name: 'Colongan', lat: 13.8114, lng: 121.1762 },
  { name: 'Itlugan', lat: 13.8190, lng: 121.2036 },
  { name: 'Leviste', lat: 13.7694, lng: 121.2868 },
  { name: 'Lumbangan', lat: 13.8122, lng: 121.2649 },
  { name: 'Maalas-as', lat: 13.8112, lng: 121.2122 },
  { name: 'Mabato', lat: 13.8144, lng: 121.2913 },
  { name: 'Mabunga', lat: 13.7810, lng: 121.2924 },
  { name: 'Macalamcam A', lat: 13.8551, lng: 121.3046 },
  { name: 'Macalamcam B', lat: 13.8606, lng: 121.3265 },
  { name: 'Malaya', lat: 13.8535, lng: 121.1720 },
  { name: 'Maligaya', lat: 13.8182, lng: 121.2742 },
  { name: 'Marilag', lat: 13.8562, lng: 121.1764 },
  { name: 'Masaya', lat: 13.8383, lng: 121.1852 },
  { name: 'Matamis', lat: 13.7216, lng: 121.3305 },
  { name: 'Mavalor', lat: 13.8177, lng: 121.2315 },
  { name: 'Mayuro', lat: 13.7944, lng: 121.2623 },
  { name: 'Namuco', lat: 13.8382, lng: 121.2036 },
  { name: 'Namunga', lat: 13.8431, lng: 121.1978 },
  { name: 'Nasi', lat: 13.7699, lng: 121.3127 },
  { name: 'Natu', lat: 13.8420, lng: 121.2683 },
  { name: 'Palakpak', lat: 13.7079, lng: 121.3320 },
  { name: 'Pinagsibaan', lat: 13.8438, lng: 121.3141 },
  { name: 'Putingkahoy', lat: 13.8349, lng: 121.3227 },
  { name: 'Quilib', lat: 13.8603, lng: 121.2002 },
  { name: 'Salao', lat: 13.8578, lng: 121.3455 },
  { name: 'San Carlos', lat: 13.8478, lng: 121.2475 },
  { name: 'San Ignacio', lat: 13.8335, lng: 121.1764 },
  { name: 'San Isidro', lat: 13.8074, lng: 121.3152 },
  { name: 'San Jose', lat: 13.8419, lng: 121.2329 },
  { name: 'San Roque', lat: 13.8518, lng: 121.2039 },
  { name: 'Santa Cruz', lat: 13.8599, lng: 121.1853 },
  { name: 'Timbugan', lat: 13.8095, lng: 121.1869 },
  { name: 'Tiquiwan', lat: 13.8284, lng: 121.2399 },
  { name: 'Tulos', lat: 13.7231, lng: 121.2971 },
];


interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData>({});
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);


  useEffect(() => {
    const authState = getAuthState();
    if (!authState.isAuthenticated) {
      navigate('/auth/login');
      return;
    }
    setUserData(authState.userData || {});
    setIsAuthenticated(true);

    // Fetch fresh profile data to ensure we have all fields including phone and address
    const fetchProfileData = async () => {
      try {
        const response = await profileApi.getProfile();
        if (response.success && response.user) {
          setUserData(prev => ({ ...prev, ...response.user }));
          // Update storage with complete user data
          updateUserData({ ...authState.userData, ...response.user });
        }
      } catch (error) {
        console.error('Failed to fetch profile data:', error);
        // Continue with existing auth data if fetch fails
      }
    };

    fetchProfileData();

    // Listen for authentication state changes
    const handleAuthStateChange = () => {
      const newAuthState = getAuthState();
      if (!newAuthState.isAuthenticated) {
        navigate('/auth/login');
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

  const { fields, setValue, validateAll, getValues, isSubmitting, setIsSubmitting } = useForm<ProfileFormData>(
    {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: ''
    },
    {
      firstName: { required: true },
      lastName: { required: true },
      email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      },
      phone: { 
        required: false,
        pattern: /^(\\+63|0)9\d{9}$/ // Philippines phone number validation: starts with +63 or 0 followed by 9 digits
      },
      address: { required: false },
      city: { required: false },
      state: { required: false },
      zipCode: { 
        required: false,
        pattern: /^\d{4,10}$/ // Basic zip code validation
      }
    }
  );

  useEffect(() => {
    // Populate form fields with user data when component mounts
    if (userData && Object.keys(userData).length > 0) {
      // Handle both camelCase and snake_case field names
      const formData = {
        firstName: userData.firstName || userData.first_name || '',
        lastName: userData.lastName || userData.last_name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        address: userData.address || '',
        city: userData.city || '',
        state: userData.state || '',
        zipCode: userData.zipCode || ''
      };
      
      // Use a flag to prevent re-running this effect
      const shouldUpdate = Object.entries(formData).some(([key, value]) => {
        const currentValue = fields[key as keyof ProfileFormData]?.value;
        return currentValue !== value;
      });
      
      if (shouldUpdate) {
        // Update all form fields at once
        Object.entries(formData).forEach(([key, value]) => {
          setValue(key as keyof ProfileFormData, value);
        });
      }
    }
  }, [userData]); // Removed setValue from dependencies to prevent infinite loops

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // The useEffect will automatically repopulate the form with original user data
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAll()) return;

    setIsSubmitting(true);
    setShowErrorMessage(false);
    setShowSuccessMessage(false);

    try {
      const formData = getValues();
      console.log('Updating profile with data:', formData);
      
      const response = await profileApi.updateProfile(formData);

      if (response.success) {
        console.log('Profile updated successfully:', response.user);
        const updatedUser = { ...userData, ...response.user };
        setUserData(updatedUser);

        // Use the new updateUserData function to handle storage
        updateUserData(updatedUser);

        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 5000);
        setIsEditing(false);
      } else {
        console.warn('Profile update returned unsuccessful response:', response);
        setErrorMessage(response.message || 'Failed to update profile. Please try again.');
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 5000);
      }
    } catch (error) {
      console.error('Profile update failed:', error);
      
      // Handle authentication errors specifically
      if (error instanceof Error && (
        error.message.includes('Authentication') || 
        error.message.includes('token') ||
        error.message.includes('401') ||
        error.message.includes('403')
      )) {
        setErrorMessage('Your session has expired. Please log in again to save changes.');
        setShowErrorMessage(true);
        
        // Auto-redirect to login after showing message
        setTimeout(() => {
          clearAuthData();
          navigate('/auth/login');
        }, 3000);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Network error. Please try again.');
        setShowErrorMessage(true);
      }
      
      setTimeout(() => setShowErrorMessage(false), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Navbar isAuthenticated={isAuthenticated} userData={userData} />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
        

          {/* Alert Messages */}
          {showSuccessMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl shadow-sm">
              <div className="flex items-center gap-3 text-green-800">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <i className="ri-check-circle-line text-green-600"></i>
                </div>
                <span className="font-medium">Profile updated successfully!</span>
              </div>
            </div>
          )}

          {showErrorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl shadow-sm">
              <div className="flex items-center gap-3 text-red-800">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <i className="ri-error-warning-line text-red-600"></i>
                </div>
                <span className="font-medium">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Profile Summary Card */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-8">
                <div className="text-center mb-6">
                  <div className="mb-4">
                    <Avatar
                      name={userData?.firstName && userData?.lastName ? `${userData.firstName} ${userData.lastName}` : undefined}
                      email={userData?.email}
                      size="xl"
                      className="mx-auto"
                    />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {userData?.firstName && userData?.lastName
                      ? `${userData.firstName} ${userData.lastName}`
                      : 'User Profile'
                    }
                  </h3>
                  <p className="text-gray-600 mb-4">{userData?.email || 'No email provided'}</p>

                  {!isEditing && (
                    <Button variant="primary" size="md" onClick={handleEdit} fullWidth>
                      <i className="ri-edit-line mr-2"></i>
                      Edit Profile
                    </Button>
                  )}
                </div>

                

                {/* Logout Button */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <Button variant="outline" size="md" onClick={handleLogoutClick} fullWidth>
                    <i className="ri-logout-box-line mr-2"></i>
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Form Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-bold text-white">Personal Information</h2>
                      <p className="text-blue-100 mt-1">Keep your information up to date</p>
                    </div>
                    {isEditing && (
                      <div className="flex items-center gap-2 text-blue-100">
                        <i className="ri-edit-line"></i>
                        <span className="text-sm font-medium">Editing Mode</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Content */}
                <div className="p-8">
                  <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Basic Information Section */}
                    <div>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <i className="ri-user-line text-blue-600"></i>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                      </div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <Input
                          label="First Name"
                          type="text"
                          name="firstName"
                          id="firstName"
                          value={fields.firstName.value}
                          onChange={(e) => setValue('firstName', e.target.value)}
                          error={fields.firstName.touched ? fields.firstName.error : ''}
                          placeholder="Enter your first name"
                          required
                          disabled={!isEditing}
                          icon={<i className="ri-user-line"></i>}
                        />
                        <Input
                          label="Last Name"
                          type="text"
                          name="lastName"
                          id="lastName"
                          value={fields.lastName.value}
                          onChange={(e) => setValue('lastName', e.target.value)}
                          error={fields.lastName.touched ? fields.lastName.error : ''}
                          placeholder="Enter your last name"
                          required
                          disabled={!isEditing}
                          icon={<i className="ri-user-line"></i>}
                        />
                      </div>
                    </div>

                    {/* Contact Information Section */}
                    <div className="border-t border-gray-100 pt-8">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <i className="ri-phone-line text-green-600"></i>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                      </div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <Input
                          label="Email Address"
                          type="email"
                          name="email"
                          id="email"
                          value={fields.email.value}
                          onChange={(e) => setValue('email', e.target.value)}
                          error={fields.email.touched ? fields.email.error : ''}
                          placeholder="Enter your email"
                          required
                          disabled={!isEditing}
                          icon={<i className="ri-mail-line"></i>}
                        />
                        <Input
                          label="Phone Number"
                          type="tel"
                          name="phone"
                          id="phone"
                          value={fields.phone.value}
                          onChange={(e) => setValue('phone', e.target.value)}
                          error={fields.phone.touched ? fields.phone.error : ''}
                          placeholder="Enter your phone number"
                          required
                          disabled={!isEditing}
                          icon={<i className="ri-phone-line"></i>}
                        />
                      </div>
                    </div>

                    {/* Address Information Section */}
                    <div className="border-t border-gray-100 pt-8">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <i className="ri-map-pin-line text-purple-600"></i>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Address Information</h3>
                      </div>

                      {!isEditing ? (
                        // When not editing: display full address as one line
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                          <p className="text-gray-900">
                            {[
                              fields.state.value,
                              fields.city.value,
                              fields.address.value,
                              fields.zipCode.value
                            ].filter(Boolean).join(', ') || 'Not provided'}
                          </p>
                        </div>
                      ) : (
                        // When editing: inline layout (Province → City → Barangay → ZIP Code)
                        <div className="flex gap-4 overflow-x-auto">
                          <Input
                            label="Province"
                            type="text"
                            name="state"
                            id="state"
                            value={fields.state.value}
                            onChange={(e) => setValue('state', e.target.value)}
                            error={fields.state.touched ? fields.state.error : ''}
                            placeholder="Province"
                            required
                            disabled={!isEditing}
                            icon={<i className="ri-map-line"></i>}
                          />

                          <Input
                            label="City / Municipality"
                            type="text"
                            name="city"
                            id="city"
                            value={fields.city.value}
                            onChange={(e) => setValue('city', e.target.value)}
                            error={fields.city.touched ? fields.city.error : ''}
                            placeholder="City"
                            required
                            disabled={!isEditing}
                            icon={<i className="ri-building-line"></i>}
                          />

                          <Select
                            label="Barangay"
                            name="address"
                            id="address"
                            value={fields.address.value}
                            onChange={(e) => setValue('address', e.target.value)}
                            error={fields.address.touched ? fields.address.error : ''}
                            required
                            disabled={!isEditing}
                            options={rosarioBarangays.map(b => ({ value: b.name, label: b.name }))}
                          />

                          <Input
                            label="ZIP Code"
                            type="text"
                            name="zipCode"
                            id="zipCode"
                            value={fields.zipCode.value}
                            onChange={(e) => setValue('zipCode', e.target.value)}
                            error={fields.zipCode.touched ? fields.zipCode.error : ''}
                            placeholder="ZIP"
                            required
                            disabled={!isEditing}
                            icon={<i className="ri-mail-line"></i>}
                          />
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {isEditing && (
                      <div className="border-t border-gray-100 pt-8">
                        <div className="flex flex-col sm:flex-row gap-4">
                          <Button type="submit" variant="primary" size="lg" disabled={isSubmitting}>
                            {isSubmitting ? (
                              <>
                                <i className="ri-loader-4-line animate-spin mr-2"></i>
                                Saving Changes...
                              </>
                            ) : (
                              <>
                                <i className="ri-save-line mr-2"></i>
                                Save Changes
                              </>
                            )}
                          </Button>
                          <Button type="button" variant="outline" size="lg" onClick={handleCancel} disabled={isSubmitting}>
                            <i className="ri-close-line mr-2"></i>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Action Button for Mobile */}
          {!isEditing && (
            <div className="fixed bottom-6 right-6 lg:hidden">
              <Button
                variant="primary"
                size="lg"
                onClick={handleEdit}
                className="rounded-full w-14 h-14 shadow-2xl hover:shadow-3xl"
              >
                <i className="ri-edit-line text-xl"></i>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
        userData={userData}
        isLoading={isLoggingOut}
      />
    </div>
  );
}
