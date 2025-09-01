import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/base/Button';
import Input from '../../components/base/Input';
import useForm from '../../hooks/useForm';
import useGeolocation from '../../hooks/useGeolocation';
import Navbar from '../../components/Navbar';
import { getAuthState, type UserData } from '../../utils/auth';


interface IncidentReportFormData {
  incidentType: string;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  priorityLevel: string;
  safetyStatus: string;
}

export default function IncidentReportPage() {
  const navigate = useNavigate();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [locationMethod, setLocationMethod] = useState<'auto' | 'manual'>('manual');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Get user location
  const { latitude, longitude, error: locationError, loading: locationLoading, getCurrentLocation } = useGeolocation();

  useEffect(() => {
    const authState = getAuthState();
    setIsAuthenticated(authState.isAuthenticated);
    setUserData(authState.userData);

    // Listen for authentication state changes
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

  const { fields, setValue, validateAll, getValues, isSubmitting, setIsSubmitting } = useForm<IncidentReportFormData>(
    {
      incidentType: '',
      description: '',
      location: '',
      latitude: null,
      longitude: null,
      priorityLevel: '',
      safetyStatus: ''
    },
    {
      incidentType: {
        required: true
      },
      description: {
        required: true,
        minLength: 20
      },
      location: {
        required: true
      },
      priorityLevel: {
        required: true
      },
      safetyStatus: {
        required: true
      }
    }
  );

  // Local reverse geocoding function using coordinate-based area detection
  const reverseGeocode = async (lat: number, lng: number) => {
    setIsReverseGeocoding(true);

    try {
      // Define local areas in San Juan, Batangas with approximate coordinates
      const localAreas = [
        { name: "University of Batangas Campus Area", lat: 13.7565, lng: 121.0583, radius: 0.005 },
        { name: "San Juan City Center", lat: 13.7500, lng: 121.0600, radius: 0.008 },
        { name: "San Juan Public Market Area", lat: 13.7520, lng: 121.0590, radius: 0.003 },
        { name: "Barangay Poblacion", lat: 13.7550, lng: 121.0575, radius: 0.006 },
        { name: "San Juan Industrial Area", lat: 13.7480, lng: 121.0620, radius: 0.010 },
        { name: "San Juan Residential District", lat: 13.7530, lng: 121.0580, radius: 0.012 },
        { name: "San Juan Coastal Area", lat: 13.7400, lng: 121.0650, radius: 0.015 }
      ];

      // Calculate distance and find nearest area
      let nearestArea = null;
      let minDistance = Infinity;

      for (const area of localAreas) {
        const distance = Math.sqrt(
          Math.pow(lat - area.lat, 2) + Math.pow(lng - area.lng, 2)
        );

        if (distance < area.radius && distance < minDistance) {
          minDistance = distance;
          nearestArea = area;
        }
      }

      // Create descriptive location string
      let locationString;
      if (nearestArea) {
        locationString = `${nearestArea.name}, San Juan, Batangas (GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      } else {
        // General San Juan area if no specific area matches
        locationString = `GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      }

      setValue('location', locationString);
      return locationString;

    } catch (error) {
      console.error('Local reverse geocoding failed:', error);
      // Final fallback
      const fallbackLocation = `GPS Location: ${lat.toFixed(6)}, ${lng.toFixed(6)} (San Juan, Batangas)`;
      setValue('location', fallbackLocation);
      return fallbackLocation;
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  // Rosario, Batangas barangays with lat/lng
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

  // Completely local location search function
  const searchLocation = async (query: string) => {
    if (query.length < 2) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearchingLocation(true);

    // Add barangays to the local database for search
    const localDatabase = [
      ...rosarioBarangays.map(b => ({
        display_name: `Barangay ${b.name}, Rosario, Batangas`,
        lat: b.lat.toString(),
        lon: b.lng.toString(),
        address: { city: 'Rosario', province: 'Batangas' },
        category: 'Barangay'
      })),
      // ...existing code for other locations if needed...
    ];

    setTimeout(() => {
      const searchTerms = query.toLowerCase().split(' ');
      const filteredSuggestions = localDatabase.filter(location => {
        const locationText = location.display_name.toLowerCase();
        return searchTerms.some(term =>
          locationText.includes(term) ||
          location.category.toLowerCase().includes(term)
        );
      });
      const sortedSuggestions = filteredSuggestions.sort((a, b) => {
        const aExact = a.display_name.toLowerCase().includes(query.toLowerCase());
        const bExact = b.display_name.toLowerCase().includes(query.toLowerCase());
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return 0;
      });
      const limitedSuggestions = sortedSuggestions.slice(0, 6);
      setLocationSuggestions(limitedSuggestions);
      setShowSuggestions(limitedSuggestions.length > 0);
      setIsSearchingLocation(false);
    }, 200);
  };

  // Handle location suggestion selection
  const handleLocationSelect = (suggestion: any) => {
    setValue('location', suggestion.display_name);
    setValue('latitude', parseFloat(suggestion.lat));
    setValue('longitude', parseFloat(suggestion.lon));
    setShowSuggestions(false);
    setLocationMethod('manual');
  };

  // Auto-fill location when geolocation is available
  useEffect(() => {
    if (latitude && longitude && locationMethod === 'auto') {
      setValue('latitude', latitude);
      setValue('longitude', longitude);

      // Perform local reverse geocoding to get readable address
      reverseGeocode(latitude, longitude);
    }
  }, [latitude, longitude, locationMethod, setValue]);

  // Handle auto-location
  const handleAutoLocation = async () => {
    setLocationMethod('auto');
    setIsLoadingLocation(true);
    try {
      await getCurrentLocation();
    } catch (error) {
      console.error('Failed to get location:', error);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Debounced location search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (fields.location.value && locationMethod === 'manual') {
        searchLocation(fields.location.value);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [fields.location.value, locationMethod]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('Form submission started...');
    console.log('Current form values:', getValues());
    console.log('Authentication status:', isAuthenticated);

    // Validate all fields
    const isValid = validateAll();
    console.log('Form validation result:', isValid);

    if (!isValid) {
      console.log('Form validation failed. Field errors:', fields);
      const errorMessages = Object.entries(fields)
        .filter(([_, field]) => field.error)
        .map(([name, field]) => `${name}: ${field.error}`)
        .join('; ');
      setErrorMessage(errorMessages || 'Please fill in all required fields correctly.');
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 5000);
      return;
    }

    // Check if user is authenticated before submitting
    if (!isAuthenticated) {
      console.log('User not authenticated, redirecting to login');
      navigate('/auth/login');
      return;
    }

    setIsSubmitting(true);
    setShowErrorMessage(false);
    setShowSuccessMessage(false);

    try {
      const raw = getValues();
      const payload = {
        incidentType: (raw.incidentType || '').trim(),
        description: (raw.description || '').trim(),
        location: (raw.location || '').trim(),
        latitude: typeof raw.latitude === 'number' ? raw.latitude : (raw.latitude ? parseFloat(String(raw.latitude)) : null),
        longitude: typeof raw.longitude === 'number' ? raw.longitude : (raw.longitude ? parseFloat(String(raw.longitude)) : null),
        priorityLevel: (raw.priorityLevel || '').trim(),
        safetyStatus: (raw.safetyStatus || '').trim(),
      };

      // If location is empty but coordinates exist, synthesize a readable fallback
      if (!payload.location && payload.latitude && payload.longitude) {
        payload.location = `GPS Location: ${payload.latitude.toFixed(6)}, ${payload.longitude.toFixed(6)} (San Juan, Batangas)`;
      }

      console.log('=== FORM SUBMISSION DEBUG ===');
      console.log('Raw form data:', raw);
      console.log('Prepared payload:', payload);
      console.log('JSON payload:', JSON.stringify(payload, null, 2));

      // Real API call to save to database
      const response = await fetch('http://localhost:5000/api/incidents/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (response.ok) {
        const responseData = await response.json();
        console.log('SUCCESS: Incident report saved to database:', responseData);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 5000);
        // Redirect to home page after successful submission
        setTimeout(() => {
          navigate('/');
        }, 3000);
      } else {
        const data = await response.json();
        console.error('ERROR: Database save failed');
        console.error('Status:', response.status);
        console.error('Response data:', data);
        setErrorMessage(
          data.message || (data.missingFields?.length
            ? `Missing: ${data.missingFields.join(', ')}`
            : 'Failed to submit incident report. Please try again.')
        );
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 5000);
      }

    } catch (error) {
      console.error('Incident report submission failed:', error);
      setErrorMessage('Network error. Please try again.');
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-orange-100">
        <Navbar isAuthenticated={isAuthenticated} userData={userData || undefined} />

        {/* Enhanced Hero Section for Unauthenticated */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/5 to-orange-600/5"></div>
          <div className="absolute inset-0 opacity-40">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 25px 25px, rgba(239, 68, 68, 0.05) 2px, transparent 0)`,
              backgroundSize: '50px 50px'
            }}></div>
          </div>

          <div className="relative container mx-auto px-4 py-16">
            <div className="text-center max-w-4xl mx-auto">
              {/* Enhanced Icon */}
              <div className="relative inline-flex items-center justify-center mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl blur-lg opacity-30 scale-110"></div>
                <div className="relative w-20 h-20 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl">
                  <i className="ri-error-warning-line text-3xl text-white"></i>
                </div>
              </div>

              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-red-900 to-orange-900 bg-clip-text text-transparent mb-6 leading-tight">
                Report an Incident
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
                Emergency Incident Reporting System
                <span className="block text-lg text-gray-500 mt-2">Please sign in to submit an incident report</span>
              </p>

              {/* Enhanced Info Banner */}
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200/50 rounded-2xl p-6 max-w-3xl mx-auto shadow-lg backdrop-blur-sm mb-8">
                <div className="flex items-center justify-center text-red-800">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                    <i className="ri-information-line text-red-600"></i>
                  </div>
                  <p className="font-semibold text-lg">
                    Authentication required for incident reporting
                  </p>
                </div>
                <p className="text-red-600 text-sm mt-2 opacity-80">
                  This helps us track and respond to incidents effectively
                </p>
              </div>

              {/* Login Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/auth/login"
                  className="px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl hover:from-red-700 hover:to-orange-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <i className="ri-login-box-line mr-2"></i>
                  Sign In
                </Link>
                <Link
                  to="/auth/signup"
                  className="px-8 py-4 border-2 border-red-600 text-red-600 rounded-xl hover:bg-red-50 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <i className="ri-user-add-line mr-2"></i>
                  Create Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-orange-100">
      <Navbar isAuthenticated={isAuthenticated} userData={userData || undefined} />

      {/* Enhanced Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/5 to-orange-600/5"></div>
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, rgba(239, 68, 68, 0.05) 2px, transparent 0)`,
            backgroundSize: '50px 50px'
          }}></div>
        </div>

        <div className="relative container mx-auto px-4 py-16">
          <div className="text-center max-w-4xl mx-auto">
            {/* Enhanced Icon */}
            <div className="relative inline-flex items-center justify-center mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl blur-lg opacity-30 scale-110"></div>
              <div className="relative w-20 h-20 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl">
                <i className="ri-error-warning-line text-3xl text-white"></i>
              </div>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-red-900 to-orange-900 bg-clip-text text-transparent mb-6 leading-tight">
              Report an Incident
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
              Emergency Incident Reporting System
              <span className="block text-lg text-gray-500 mt-2">Please provide detailed information about the incident</span>
            </p>

            {/* Enhanced Info Banner */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200/50 rounded-2xl p-6 max-w-3xl mx-auto shadow-lg backdrop-blur-sm">
              <div className="flex items-center justify-center text-red-800">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <i className="ri-information-line text-red-600"></i>
                </div>
                <p className="font-semibold text-lg">
                  Your report helps us respond quickly to emergencies
                </p>
              </div>
              <p className="text-red-600 text-sm mt-2 opacity-80">
                All reports are treated with urgency and confidentiality
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-8">
        <div className="max-w-4xl mx-auto">

          {/* Success Message */}
          {showSuccessMessage && (
            <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/50 rounded-2xl shadow-lg backdrop-blur-sm">
              <div className="flex items-center gap-3 text-green-800">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <i className="ri-check-circle-line text-green-600"></i>
                </div>
                <div>
                  <p className="font-semibold text-lg">Incident report submitted successfully!</p>
                  <p className="text-green-600 text-sm mt-1">Emergency responders have been notified</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {showErrorMessage && (
            <div className="mb-6 p-6 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200/50 rounded-2xl shadow-lg backdrop-blur-sm">
              <div className="flex items-center gap-3 text-red-800">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <i className="ri-error-warning-line text-red-600"></i>
                </div>
                <div>
                  <p className="font-semibold text-lg">Failed to submit report</p>
                  <p className="text-red-600 text-sm mt-1">{errorMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Incident Report Form */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Incident Type Section */}
              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                      <i className="ri-alert-line text-red-600"></i>
                    </div>
                    Incident Information
                  </h3>
                  <p className="text-gray-600 mt-2">Please provide details about the incident</p>
                </div>

                <div>
                  <label htmlFor="incidentType" className="block text-sm font-semibold text-gray-700 mb-3">
                    <i className="ri-error-warning-line mr-2 text-red-600"></i>
                    Incident Type <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <i className="ri-alert-line text-gray-400"></i>
                    </div>
                    <select
                      id="incidentType"
                      name="incidentType"
                      value={fields.incidentType.value}
                      onChange={(e) => setValue('incidentType', e.target.value)}
                      className={`w-full pl-10 pr-4 py-4 border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all appearance-none bg-white ${
                        fields.incidentType.error ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select incident type...</option>
                      <option value="fire">🔥 Fire Emergency</option>
                      <option value="medical">❤️ Medical Emergency</option>
                      <option value="security">🛡️ Security Incident</option>
                      <option value="accident">🚗 Accident</option>
                      <option value="natural">🌪️ Natural Disaster</option>
                      <option value="other">⚠️ Other Emergency</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <i className="ri-arrow-down-s-line text-gray-400"></i>
                    </div>
                  </div>
                  {fields.incidentType.touched && fields.incidentType.error && (
                    <p className="text-red-600 text-sm mt-2">{fields.incidentType.error}</p>
                  )}
                </div>
              </div>

              {/* Location Section */}
              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <i className="ri-map-pin-line text-blue-600"></i>
                    </div>
                    Location Information
                  </h3>
                  <p className="text-gray-600 mt-2">Specify where the incident occurred</p>
                </div>

                <div className="space-y-4">
                  {/* Location Method Toggle */}
                  <div className="flex items-center space-x-4 mb-4">
                    <label className="block text-sm font-semibold text-gray-700">
                      Location Method:
                    </label>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setLocationMethod('manual')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          locationMethod === 'manual'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <i className="ri-edit-line mr-2"></i>
                        Manual Entry
                      </button>
                      <button
                        type="button"
                        onClick={handleAutoLocation}
                        disabled={isLoadingLocation || locationLoading}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          locationMethod === 'auto'
                            ? 'bg-green-600 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        } ${(isLoadingLocation || locationLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isLoadingLocation || locationLoading ? (
                          <>
                            <i className="ri-loader-4-line animate-spin mr-2"></i>
                            Getting Location...
                          </>
                        ) : (
                          <>
                            <i className="ri-gps-line mr-2"></i>
                            Auto-Detect
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Location Input with Search */}
                  <div className="relative">
                    {/* Rosario Barangays Dropdown */}
                    <div className="mt-2 mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        <i className="ri-map-pin-line mr-2 text-blue-600"></i>
                        Select Barangay (Rosario, Batangas)
                      </label>
                      <select
                        className="w-full px-3 py-3 border border-blue-200 rounded-lg text-sm text-blue-800 font-medium bg-blue-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all mb-1"
                        value={rosarioBarangays.find(b => `Barangay ${b.name}, Rosario, Batangas` === fields.location.value) ? fields.location.value : ''}
                        onChange={e => {
                          const selected = rosarioBarangays.find(b => `Barangay ${b.name}, Rosario, Batangas` === e.target.value);
                          if (selected) {
                            setValue('location', `Barangay ${selected.name}, Rosario, Batangas`);
                            setValue('latitude', selected.lat);
                            setValue('longitude', selected.lng);
                            setShowSuggestions(false);
                            setLocationMethod('manual');
                          } else {
                            setValue('location', '');
                            setValue('latitude', null);
                            setValue('longitude', null);
                          }
                        }}
                      >
                        <option value="">-- Select Barangay --</option>
                        {rosarioBarangays.map(b => (
                          <option key={b.name} value={`Barangay ${b.name}, Rosario, Batangas`}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-gray-400 text-xs mt-1">Choose a barangay to quickly fill location and coordinates.</p>
                    </div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      <i className="ri-map-pin-line mr-2 text-blue-600"></i>
                      Location Description <span className="text-red-500">*</span>
                    </label>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <i className="ri-map-pin-line text-gray-400"></i>
                      </div>
                      <input
                        type="text"
                        name="location"
                        id="location"
                        value={fields.location.value}
                        onChange={(e) => {
                          setValue('location', e.target.value);
                          if (locationMethod === 'auto') {
                            setLocationMethod('manual');
                          }
                        }}
                        onFocus={() => {
                          if (locationSuggestions.length > 0) {
                            setShowSuggestions(true);
                          }
                        }}
                        onBlur={() => {
                          // Delay hiding suggestions to allow clicking
                          setTimeout(() => setShowSuggestions(false), 200);
                        }}
                        className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        placeholder={locationMethod === 'auto' ? 'Auto-detected location will appear here...' : 'Search for location (e.g., "University of Batangas", "San Juan City Hall")'}
                        required
                      />

                      {/* Loading indicator for search */}
                      {(isSearchingLocation || isReverseGeocoding) && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                          <i className="ri-loader-4-line animate-spin text-blue-600"></i>
                        </div>
                      )}
                    </div>

                    {/* Location Suggestions Dropdown */}
                    {showSuggestions && locationSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                        {locationSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleLocationSelect(suggestion)}
                            className="w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b border-gray-100 last:border-b-0 transition-colors"
                          >
                            <div className="flex items-start space-x-3">
                              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <i className="ri-map-pin-line text-blue-600 text-sm"></i>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {suggestion.display_name}
                                </p>
                                {suggestion.address && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {suggestion.address.city || suggestion.address.town || suggestion.address.municipality}, {suggestion.address.province || suggestion.address.state}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Error Messages */}
                    {fields.location.touched && fields.location.error && (
                      <p className="text-red-600 text-sm mt-2">
                        <i className="ri-error-warning-line mr-1"></i>
                        {fields.location.error}
                      </p>
                    )}

                    {locationError && (
                      <p className="text-red-600 text-sm mt-2">
                        <i className="ri-error-warning-line mr-1"></i>
                        {locationError}
                      </p>
                    )}

                    {/* GPS Coordinates Display */}
                    {latitude && longitude && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                            <i className="ri-gps-line text-green-600 text-sm"></i>
                          </div>
                          <div>
                            <p className="text-green-800 font-medium text-sm">GPS Location Detected</p>
                            <p className="text-green-600 text-xs">
                              Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Search Help Text */}
                    <div className="mt-2 space-y-2">
                      <p className="text-gray-500 text-sm">
                        <i className="ri-information-line mr-1"></i>
                        Start typing to search for locations, or use auto-detect to get your current position
                      </p>
                      <p className="text-gray-400 text-xs">
                        <i className="ri-map-pin-line mr-1"></i>
                        Available locations: University of Batangas, City Hall, Public Market, Schools, Barangays, and more
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Priority Level Section */}
              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                      <i className="ri-alarm-warning-line text-orange-600"></i>
                    </div>
                    Priority Level
                  </h3>
                  <p className="text-gray-600 mt-2">How urgent is this incident?</p>
                </div>

                <div>
                  <label htmlFor="priorityLevel" className="block text-sm font-semibold text-gray-700 mb-3">
                    <i className="ri-alarm-warning-line mr-2 text-orange-600"></i>
                    Priority Level <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <i className="ri-alarm-warning-line text-gray-400"></i>
                    </div>
                    <select
                      id="priorityLevel"
                      name="priorityLevel"
                      value={fields.priorityLevel.value}
                      onChange={(e) => setValue('priorityLevel', e.target.value)}
                      className={`w-full pl-10 pr-4 py-4 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all appearance-none bg-white ${
                        fields.priorityLevel.error ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select priority level...</option>
                      <option value="low">🟢 Low Priority - Non-urgent, can wait</option>
                      <option value="medium">🟡 Medium Priority - Moderate urgency</option>
                      <option value="high">🟠 High Priority - Urgent attention needed</option>
                      <option value="critical">🔴 Critical - Immediate response required</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <i className="ri-arrow-down-s-line text-gray-400"></i>
                    </div>
                  </div>
                  {fields.priorityLevel.touched && fields.priorityLevel.error && (
                    <p className="text-red-600 text-sm mt-2">{fields.priorityLevel.error}</p>
                  )}
                </div>
              </div>

              {/* Safety Status Section */}
              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <i className="ri-shield-check-line text-green-600"></i>
                    </div>
                    Your Safety Status
                  </h3>
                  <p className="text-gray-600 mt-2">Are you currently safe?</p>
                </div>

                <div>
                  <label htmlFor="safetyStatus" className="block text-sm font-semibold text-gray-700 mb-3">
                    <i className="ri-shield-check-line mr-2 text-green-600"></i>
                    Your Safety Status <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <i className="ri-shield-check-line text-gray-400"></i>
                    </div>
                    <select
                      id="safetyStatus"
                      name="safetyStatus"
                      value={fields.safetyStatus.value}
                      onChange={(e) => setValue('safetyStatus', e.target.value)}
                      className={`w-full pl-10 pr-4 py-4 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all appearance-none bg-white ${
                        fields.safetyStatus.error ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select your safety status...</option>
                      <option value="safe">🟢 I am safe - Not in immediate danger</option>
                      <option value="injured">🟡 I am injured - Need medical attention</option>
                      <option value="danger">🔴 I am in danger - Need immediate help</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <i className="ri-arrow-down-s-line text-gray-400"></i>
                    </div>
                  </div>
                  {fields.safetyStatus.touched && fields.safetyStatus.error && (
                    <p className="text-red-600 text-sm mt-2">{fields.safetyStatus.error}</p>
                  )}
                </div>
              </div>

              {/* Description Section */}
              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                      <i className="ri-file-text-line text-purple-600"></i>
                    </div>
                    Incident Description
                  </h3>
                  <p className="text-gray-600 mt-2">Provide detailed information about what happened</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    <i className="ri-file-text-line mr-2 text-purple-600"></i>
                    Detailed Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={fields.description.value}
                    onChange={(e) => setValue('description', e.target.value)}
                    className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all resize-none"
                    rows={6}
                    placeholder="Please provide a detailed description of the incident including:
• What happened?
• When did it occur?
• Who was involved?
• Any injuries or damages?
• Current situation status..."
                    required
                  />
                  {fields.description.touched && fields.description.error && (
                    <p className="text-red-600 text-sm mt-2">{fields.description.error}</p>
                  )}
                  <p className="text-gray-500 text-sm mt-2">
                    Minimum 20 characters required. Be as specific as possible to help emergency responders.
                  </p>
                </div>
              </div>


              {/* Submit Section */}
              <div className="border-t border-gray-200 pt-8">
              

                <div className="flex flex-col sm:flex-row gap-4">
                  {isAuthenticated ? (
                    <>
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        fullWidth
                        disabled={isSubmitting}
                        className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
                      >
                        {isSubmitting ? (
                          <>
                            <i className="ri-loader-4-line animate-spin mr-2"></i>
                            Submitting Emergency Report...
                          </>
                        ) : (
                          <>
                            <i className="ri-send-plane-line mr-2"></i>
                            Submit Emergency Report
                          </>
                        )}
                      </Button>

                     

                    
                    </>
                  ) : (
                    <Link
                      to="/auth/login"
                      className="px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl hover:from-red-700 hover:to-orange-700 transition-all duration-300 font-semibold text-center flex-1 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <i className="ri-login-box-line mr-2"></i>
                      Sign In to Submit Report
                    </Link>
                  )}
                  <Link
                    to="/"
                    className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 font-semibold text-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <i className="ri-arrow-left-line mr-2"></i>
                    Cancel
                  </Link>
                </div>

               
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}