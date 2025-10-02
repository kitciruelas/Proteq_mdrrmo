import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { safetyProtocolsApi } from '../../utils/api';
import { getAuthState, type UserData } from '../../utils/auth';


interface SafetyProtocol {
  protocol_id: number;
  title: string;
  description: string;
  type: 'fire' | 'earthquake' | 'medical' | 'intrusion' | 'general';
  file_attachment: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

const SafetyProtocolsPage: React.FC = () => {
  const [protocols, setProtocols] = useState<SafetyProtocol[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    const authState = getAuthState();
    // Only allow user type to access this page
    if (authState.isAuthenticated && authState.userType !== 'user') {
      // Redirect admin/staff users to their respective dashboards
      if (authState.userType === 'admin') {
        window.location.href = '/admin';
        return;
      } else if (authState.userType === 'staff') {
        window.location.href = '/staff';
        return;
      }
    }
    
    const isUserAuth = authState.isAuthenticated && authState.userType === 'user';
    setIsAuthenticated(isUserAuth);
    setUserData(isUserAuth ? authState.userData : null);

    // Listen for authentication state changes
    const handleAuthStateChange = () => {
      const newAuthState = getAuthState();
      // Only allow user type to access this page
      if (newAuthState.isAuthenticated && newAuthState.userType !== 'user') {
        // Redirect admin/staff users to their respective dashboards
        if (newAuthState.userType === 'admin') {
          window.location.href = '/admin';
          return;
        } else if (newAuthState.userType === 'staff') {
          window.location.href = '/staff';
          return;
        }
      }
      
      const isNewUserAuth = newAuthState.isAuthenticated && newAuthState.userType === 'user';
      setIsAuthenticated(isNewUserAuth);
      setUserData(isNewUserAuth ? newAuthState.userData : null);
    };

    window.addEventListener('storage', handleAuthStateChange);
    window.addEventListener('authStateChanged', handleAuthStateChange);

    // Fetch safety protocols data
    safetyProtocolsApi.getProtocols()
      .then(rows => {
        if (Array.isArray(rows)) {
          setProtocols(rows as unknown as SafetyProtocol[]);
        } else {
          console.error('Expected array but got:', rows);
          setProtocols([]);
        }
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching safety protocols:', error);
        setProtocols([]);
        setIsLoading(false);
      });

    return () => {
      window.removeEventListener('storage', handleAuthStateChange);
      window.removeEventListener('authStateChanged', handleAuthStateChange);
    };
  }, []);



  // Enhanced filtering logic
  const filteredProtocols = protocols.filter(protocol => {
    const matchesType = selectedType === 'all' || protocol.type === selectedType;
    const matchesSearch = searchQuery === '' ||
      protocol.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      protocol.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      protocol.type.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesType && matchesSearch;
  });

  const protocolTypes = ['all', 'fire', 'earthquake', 'medical', 'intrusion', 'general'];

  // Get protocol statistics
  const protocolStats = {
    total: protocols.length,
    fire: protocols.filter(p => p.type === 'fire').length,
    earthquake: protocols.filter(p => p.type === 'earthquake').length,
    medical: protocols.filter(p => p.type === 'medical').length,
    intrusion: protocols.filter(p => p.type === 'intrusion').length,
    general: protocols.filter(p => p.type === 'general').length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl blur-lg opacity-30 scale-110"></div>
            <div className="relative w-20 h-20 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center shadow-xl">
              <i className="ri-loader-4-line text-3xl text-white animate-spin"></i>
            </div>
          </div>
          <p className="text-xl text-gray-600 font-medium">Loading safety protocols...</p>
          <p className="text-gray-500 mt-2">Please wait while we fetch the latest information</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-100">
      <Navbar isAuthenticated={isAuthenticated} userData={userData || undefined} />

      {/* Enhanced Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/5 to-emerald-600/5"></div>
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, rgba(34, 197, 94, 0.05) 2px, transparent 0)`,
            backgroundSize: '50px 50px'
          }}></div>
        </div>

        <div className="relative container mx-auto px-4 py-16">
          <div className="text-center max-w-4xl mx-auto">
            {/* Icon with enhanced styling */}
            <div className="relative inline-flex items-center justify-center mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl blur-lg opacity-30 scale-110"></div>
              <div className="relative w-20 h-20 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center shadow-xl">
                <i className="ri-shield-check-line text-3xl text-white"></i>
              </div>
            </div>

            {/* Enhanced Typography */}
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-green-900 to-emerald-900 bg-clip-text text-transparent mb-6 leading-tight">
              Safety Protocols
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
              Rosario, Batangas
              <span className="block text-lg text-gray-500 mt-2">Emergency Procedures & Safety Guidelines</span>
            </p>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 max-w-4xl mx-auto">
              <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl p-4 shadow-lg">
                <div className="text-2xl font-bold text-green-600">{protocolStats.total}</div>
                <div className="text-sm text-gray-600">Total Protocols</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl p-4 shadow-lg">
                <div className="text-2xl font-bold text-red-600">{protocolStats.fire}</div>
                <div className="text-sm text-gray-600">Fire Safety</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl p-4 shadow-lg">
                <div className="text-2xl font-bold text-yellow-600">{protocolStats.earthquake}</div>
                <div className="text-sm text-gray-600">Earthquake</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl p-4 shadow-lg">
                <div className="text-2xl font-bold text-blue-600">{protocolStats.medical}</div>
                <div className="text-sm text-gray-600">Medical</div>
              </div>
            </div>

            {/* Enhanced Info Banner */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/50 rounded-2xl p-6 max-w-3xl mx-auto shadow-lg backdrop-blur-sm">
              <div className="flex items-center justify-center text-green-800">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <i className="ri-information-line text-green-600"></i>
                </div>
                <p className="font-semibold text-lg">
                  Comprehensive safety protocols for all emergency situations
                </p>
              </div>
              <p className="text-green-600 text-sm mt-2 opacity-80">
                Updated regularly • Last update: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-8">

        {/* Enhanced View Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl p-1.5 shadow-xl border border-white/20">
            {/* Sliding background */}
            <div
              className={`absolute top-1.5 bottom-1.5 w-1/2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl shadow-lg transition-transform duration-300 ease-out ${
                viewMode === 'list' ? 'translate-x-full' : 'translate-x-0'
              }`}
            ></div>

            <div className="relative flex">
              <button
                onClick={() => setViewMode('grid')}
                className={`relative px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-2 min-w-[120px] justify-center ${
                  viewMode === 'grid'
                    ? 'text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <i className={`ri-grid-line text-lg transition-transform duration-300 ${
                  viewMode === 'grid' ? 'scale-110' : ''
                }`}></i>
                <span>Grid</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`relative px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-2 min-w-[120px] justify-center ${
                  viewMode === 'list'
                    ? 'text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <i className={`ri-list-unordered text-lg transition-transform duration-300 ${
                  viewMode === 'list' ? 'scale-110' : ''
                }`}></i>
                <span>List</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Search Input */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <i className="ri-search-line mr-2"></i>
                  Search Protocols
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by title, description, or type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                  />
                  <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <i className="ri-close-line"></i>
                    </button>
                  )}
                </div>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <i className="ri-filter-line mr-2"></i>
                  Filter by Type
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full py-3 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                >
                  {protocolTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)} {type === 'all' ? 'Protocols' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Results Summary */}
            <div className="mt-4 flex items-center justify-between text-sm">
              <div className="text-gray-600">
                Showing <span className="font-semibold text-green-600">{filteredProtocols.length}</span> of{' '}
                <span className="font-semibold">{protocols.length}</span> protocols
                {searchQuery && (
                  <span className="ml-2 text-green-600">
                    for "{searchQuery}"
                  </span>
                )}
              </div>

              {(searchQuery || selectedType !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedType('all');
                  }}
                  className="text-green-600 hover:text-green-700 font-medium flex items-center space-x-1"
                >
                  <i className="ri-refresh-line"></i>
                  <span>Clear Filters</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Protocol Cards */}
        {filteredProtocols.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-2xl flex items-center justify-center">
              <i className="ri-search-line text-3xl text-gray-400"></i>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No protocols found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || selectedType !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'No safety protocols are currently available'
              }
            </p>
            {(searchQuery || selectedType !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedType('all');
                }}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <i className="ri-refresh-line mr-2"></i>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className={`${
            viewMode === 'grid'
              ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          }`}>
            {filteredProtocols.map((protocol) => (
              <div
                key={protocol.protocol_id}
                className={`bg-white/90 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 ${
                  viewMode === 'grid' ? 'p-6' : 'p-6 flex items-center space-x-6'
                }`}
              >
                {/* Protocol Icon and Type */}
                <div className={`${viewMode === 'list' ? 'flex-shrink-0' : 'flex items-center justify-between mb-4'}`}>
                  <div className={`relative ${viewMode === 'list' ? 'w-16 h-16' : 'w-14 h-14'} rounded-2xl flex items-center justify-center ${
                    protocol.type === 'fire' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                    protocol.type === 'earthquake' ? 'bg-gradient-to-r from-yellow-500 to-orange-600' :
                    protocol.type === 'medical' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                    protocol.type === 'intrusion' ? 'bg-gradient-to-r from-purple-500 to-purple-600' :
                    'bg-gradient-to-r from-green-500 to-green-600'
                  } shadow-lg`}>
                    <i className={`${viewMode === 'list' ? 'text-2xl' : 'text-xl'} text-white ${
                      protocol.type === 'fire' ? 'ri-fire-line' :
                      protocol.type === 'earthquake' ? 'ri-earthquake-line' :
                      protocol.type === 'medical' ? 'ri-heart-pulse-line' :
                      protocol.type === 'intrusion' ? 'ri-shield-keyhole-line' :
                      'ri-alert-line'
                    }`}></i>
                  </div>

                  {viewMode === 'grid' && (
                    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                      protocol.type === 'fire' ? 'bg-red-100 text-red-800' :
                      protocol.type === 'earthquake' ? 'bg-yellow-100 text-yellow-800' :
                      protocol.type === 'medical' ? 'bg-blue-100 text-blue-800' :
                      protocol.type === 'intrusion' ? 'bg-purple-100 text-purple-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {protocol.type.charAt(0).toUpperCase() + protocol.type.slice(1)}
                    </span>
                  )}
                </div>

                {/* Protocol Content */}
                <div className={`${viewMode === 'list' ? 'flex-1' : ''}`}>
                  <div className={`${viewMode === 'list' ? 'flex items-start justify-between' : ''}`}>
                    <div className={`${viewMode === 'list' ? 'flex-1 pr-4' : ''}`}>
                      <h3 className={`font-bold text-gray-900 mb-2 ${viewMode === 'list' ? 'text-xl' : 'text-lg'}`}>
                        {protocol.title}
                      </h3>
                      <p className={`text-gray-600 mb-4 ${viewMode === 'list' ? 'text-base' : 'text-sm'} line-clamp-3`}>
                        {protocol.description}
                      </p>
                    </div>

                    {viewMode === 'list' && (
                      <div className="flex-shrink-0 flex flex-col items-end space-y-2">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                          protocol.type === 'fire' ? 'bg-red-100 text-red-800' :
                          protocol.type === 'earthquake' ? 'bg-yellow-100 text-yellow-800' :
                          protocol.type === 'medical' ? 'bg-blue-100 text-blue-800' :
                          protocol.type === 'intrusion' ? 'bg-purple-100 text-purple-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {protocol.type.charAt(0).toUpperCase() + protocol.type.slice(1)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* File Attachment */}
                  {protocol.file_attachment && (
                    <a
                      href={`http://localhost:5000/uploads/${protocol.file_attachment}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-green-600 hover:text-green-700 font-semibold mb-4 transition-colors group"
                    >
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-2 group-hover:bg-green-200 transition-colors">
                        <i className="ri-file-text-line text-sm"></i>
                      </div>
                      <span className="text-sm">View Attachment</span>
                      <i className="ri-external-link-line ml-1 text-xs"></i>
                    </a>
                  )}

                  {/* Footer */}
                  <div className={`pt-4 mt-4 border-t border-gray-200 ${viewMode === 'list' ? 'flex items-center justify-between' : ''}`}>
                    <p className="text-xs text-gray-500">
                      <i className="ri-time-line mr-1"></i>
                      Updated: {new Date(protocol.updated_at).toLocaleDateString()}
                    </p>
                    {viewMode === 'list' && (
                      <button className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center space-x-1 transition-colors">
                        <span>View Details</span>
                        <i className="ri-arrow-right-line"></i>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SafetyProtocolsPage;