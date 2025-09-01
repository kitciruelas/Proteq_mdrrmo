import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/base/Button';
import Card from '../../components/base/Card';
import Navbar from '../../components/Navbar';
import { getAuthState, type UserData } from '../../utils/auth';

interface TimelineEvent {
  id: string;
  stage: string;
  status: string;
  timestamp: string;
  description: string;
  assignedTo?: string;
  notes?: string;
}

interface IncidentReport {
  incident_id: string;
  incident_type: string;
  description: string;
  location: string;
  latitude?: number;
  longitude?: number;
  priority_level: string;
  reporter_safe_status: string;
  status: string;
  date_reported: string;
  updated_at: string;
  assigned_team_name?: string;
  assigned_staff_name?: string;
  reporter_name?: string;
  validation_status?: string;
  validation_notes?: string;
  assigned_to?: string;
  timeline?: TimelineEvent[];
}

// Extended UserData interface for this component
interface ExtendedUserData {
  userId?: number;
  user_id?: number;
  id?: string | number;
  firstName?: string;
  lastName?: string;
  email?: string;
  userType?: string;
  [key: string]: any;
}

export default function HistoryReportPage() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<ExtendedUserData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [incidentReports, setIncidentReports] = useState<IncidentReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  const [geocodedLocations, setGeocodedLocations] = useState<Record<string, string>>({});
  const [geocodingStatus, setGeocodingStatus] = useState<Record<string, 'loading' | 'completed' | 'error'>>({});
  const [locationCache, setLocationCache] = useState<{[key: string]: string}>({});
  const [geocodingInProgress, setGeocodingInProgress] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    const authState = getAuthState();
    console.log('Auth state in History Report:', authState);
    if (!authState.isAuthenticated) {
      navigate('/auth/login');
      return;
    }
    console.log('User data in History Report:', authState.userData);
    setUserData(authState.userData as ExtendedUserData);
    setIsAuthenticated(true);

    // Listen for authentication state changes
    const handleAuthStateChange = () => {
      const newAuthState = getAuthState();
      if (!newAuthState.isAuthenticated) {
        navigate('/auth/login');
        return;
      }
      setIsAuthenticated(newAuthState.isAuthenticated);
      setUserData(newAuthState.userData);
    };

    window.addEventListener('storage', handleAuthStateChange);
    window.addEventListener('authStateChanged', handleAuthStateChange);

    return () => {
      window.removeEventListener('storage', handleAuthStateChange);
      window.removeEventListener('authStateChanged', handleAuthStateChange);
    };
  }, [navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchIncidentReports();
    }
  }, [isAuthenticated]);

  // Trigger geocoding for reports with coordinates
  useEffect(() => {
    const geocodeReports = async () => {
      for (const report of incidentReports) {
        if (report.latitude && report.longitude && !report.location) {
          const coordKey = `${report.latitude},${report.longitude}`;
          if (!geocodedLocations[coordKey]) {
            // Set loading status
            setGeocodingStatus(prev => ({
              ...prev,
              [coordKey]: 'loading'
            }));
            
            try {
              // Add delay to avoid rate limiting (1 second between requests)
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              const address = await geocodeCoordinates(report.latitude, report.longitude);
              setGeocodedLocations(prev => ({
                ...prev,
                [coordKey]: address
              }));
              setGeocodingStatus(prev => ({
                ...prev,
                [coordKey]: 'completed'
              }));
            } catch (error) {
              setGeocodingStatus(prev => ({
                ...prev,
                [coordKey]: 'error'
              }));
            }
          }
        }
      }
    };

    if (incidentReports.length > 0) {
      geocodeReports();
    }
  }, [incidentReports]);

  const fetchIncidentReports = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get user ID from auth state
      const authState = getAuthState();
      const userData = authState.userData as ExtendedUserData;
      let userId = userData?.userId || userData?.user_id || userData?.id;
      
      // Debug logging
      console.log('🔍 Auth state:', authState);
      console.log('🔍 User data for ID extraction:', userData);
      console.log('🔍 Extracted userId:', userId);
      
      // Fallback: try to get user ID from localStorage directly
      if (!userId) {
        try {
          // Try multiple storage keys for different user types
          const storageKeys = ['userInfo', 'user', 'admin', 'staff'];
          for (const key of storageKeys) {
            const storedData = localStorage.getItem(key) || sessionStorage.getItem(key);
            if (storedData) {
              try {
                const parsedData = JSON.parse(storedData);
                userId = parsedData.userId || parsedData.user_id || parsedData.id || parsedData.admin_id || parsedData.staff_id;
                if (userId) {
                  console.log(`✅ Found userId ${userId} in storage key: ${key}`);
                  break;
                }
              } catch (e) {
                console.error(`Error parsing ${key} from storage:`, e);
              }
            }
          }
        } catch (e) {
          console.error('Error checking storage for user ID:', e);
        }
      }
      
      if (!userId) {
        console.error('❌ No user ID found in any storage location');
        console.error('Available user data fields:', Object.keys(userData || {}));
        console.error('LocalStorage keys:', Object.keys(localStorage));
        console.error('SessionStorage keys:', Object.keys(sessionStorage));
        throw new Error('User ID not found. Please try logging in again.');
      }
      
      console.log('✅ Final userId for API call:', userId);

      // Check if backend is accessible
      try {
        console.log('🔍 Checking backend health...');
        const healthCheck = await fetch('/api/health');
        if (!healthCheck.ok) {
          throw new Error(`Backend health check failed: ${healthCheck.status} ${healthCheck.statusText}`);
        }
        console.log('✅ Backend health check passed');
      } catch (healthError) {
        console.error('❌ Backend health check failed:', healthError);
        throw new Error('Cannot connect to backend server. Please ensure the server is running.');
      }

      // Fetch incidents from backend API
      console.log(`🔍 Fetching incidents for user ID: ${userId}`);
      const response = await fetch(`/api/incidents/user/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      console.log('📡 Response status:', response.status, response.statusText);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        let errorText;
        try {
          errorText = await response.text();
          console.error('Response body (text):', errorText);
          
          // Try to parse as JSON if it looks like JSON
          if (errorText.trim().startsWith('{') || errorText.trim().startsWith('[')) {
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.message || `HTTP error! status: ${response.status}`);
          } else {
            throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
          }
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
          throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
      }

      const data = await response.json();
      console.log('✅ API response data:', data);
      
      if (data.success && data.incidents) {
        // Transform backend data to include timeline
        const reportsWithTimeline = data.incidents.map((incident: IncidentReport) => ({
          ...incident,
          timeline: generateTimelineFromIncident(incident)
        }));
        
        setIncidentReports(reportsWithTimeline);
        console.log(`✅ Successfully loaded ${reportsWithTimeline.length} incident reports`);
      } else {
        throw new Error(data.message || 'Failed to fetch incidents');
      }
    } catch (err) {
      console.error('❌ Error fetching incident reports:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch incident reports. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate timeline from incident data
  const generateTimelineFromIncident = (incident: IncidentReport): TimelineEvent[] => {
    const timeline: TimelineEvent[] = [];
    
    // Add initial report event
    timeline.push({
      id: `${incident.incident_id}-1`,
      stage: 'Reported',
      status: 'Submitted',
      timestamp: incident.date_reported,
      description: `Incident report submitted: ${incident.incident_type}`,
      notes: 'Initial report received and logged'
    });

    // Add validation event if incident has been validated
    if (incident.validation_status && incident.validation_status !== 'unvalidated') {
      timeline.push({
        id: `${incident.incident_id}-2`,
        stage: 'Validation',
        status: incident.validation_status === 'validated' ? 'Validated' : 'Rejected',
        timestamp: incident.updated_at || incident.date_reported,
        description: `Report ${incident.validation_status} by admin team`,
        assignedTo: 'Admin Team',
        notes: incident.validation_notes || 'Priority level confirmed'
      });
    }

    // Add assignment event if incident has been assigned
    if (incident.assigned_team_name || incident.assigned_staff_name) {
      timeline.push({
        id: `${incident.incident_id}-3`,
        stage: 'Assigned',
        status: 'Assigned',
        timestamp: incident.updated_at || incident.date_reported,
        description: `Incident assigned to ${incident.assigned_team_name || incident.assigned_staff_name}`,
        assignedTo: incident.assigned_team_name || incident.assigned_staff_name,
        notes: 'Response team notified and dispatched'
      });
    }

    // Add status progression events based on current status
    if (incident.status && incident.status !== 'pending') {
      // Add "In Progress" event if status has moved beyond pending
      if (incident.status === 'in_progress' || incident.status === 'investigation' || 
          incident.status === 'resolved' || incident.status === 'closed') {
        timeline.push({
          id: `${incident.incident_id}-4`,
          stage: 'In Progress',
          status: 'In Progress',
          timestamp: incident.updated_at || incident.date_reported,
          description: 'Response team dispatched and investigation started',
          assignedTo: incident.assigned_team_name || incident.assigned_staff_name,
          notes: 'Team arrived at scene and began assessment'
        });
      }



      // Add "Resolution" event for resolved incidents
      if (incident.status === 'resolved') {
        timeline.push({
          id: `${incident.incident_id}-6`,
          stage: 'Resolution',
          status: 'Resolved',
          timestamp: incident.updated_at || incident.date_reported,
          description: 'Incident successfully resolved and contained',
          assignedTo: incident.assigned_team_name || incident.assigned_staff_name,
          notes: 'All immediate threats addressed and situation stabilized'
        });
      }

      // Add "Closed" event for closed incidents
      if (incident.status === 'closed') {
        timeline.push({
          id: `${incident.incident_id}-7`,
          stage: 'Closed',
          status: 'Closed',
          timestamp: incident.updated_at || incident.date_reported,
          description: 'Incident officially closed and case completed',
          assignedTo: incident.assigned_team_name || incident.assigned_staff_name,
          notes: 'All documentation completed and follow-up scheduled'
        });
      }
    }

    // Add current stage indicator if different from last timeline event
    const currentStage = getCurrentStage(incident.status);
    const lastTimelineEvent = timeline[timeline.length - 1];
    
    if (lastTimelineEvent && lastTimelineEvent.stage !== currentStage) {
      timeline.push({
        id: `${incident.incident_id}-current`,
        stage: currentStage,
        status: incident.status?.replace('_', ' ').charAt(0).toUpperCase() + incident.status?.replace('_', ' ').slice(1) || 'Current',
        timestamp: incident.updated_at || incident.date_reported,
        description: `Currently at ${currentStage} stage`,
        assignedTo: incident.assigned_team_name || incident.assigned_staff_name,
        notes: 'Latest status update'
      });
    }

    return timeline;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'moderate':
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
      case 'in progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSafetyStatusColor = (safetyStatus: string) => {
    switch (safetyStatus?.toLowerCase()) {
      case 'safe':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'injured':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'unknown':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'reported':
        return 'bg-blue-500';
      case 'validation':
        return 'bg-yellow-500';
      case 'assigned':
        return 'bg-purple-500';
      case 'in progress':
        return 'bg-orange-500';
      case 'resolution':
      case 'resolved':
        return 'bg-green-500';
      case 'closed':
        return 'bg-indigo-500';
      case 'follow-up':
      case 'monitoring':
        return 'bg-teal-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Helper function to determine current stage based on status
  const getCurrentStage = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'Reported';
      case 'in_progress':
      case 'in progress':
        return 'In Progress';
      case 'resolved':
        return 'Resolution';
      case 'closed':
        return 'Closed';
      default:
        return 'Reported';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleReportExpansion = (reportId: string) => {
    const newExpanded = new Set(expandedReports);
    if (newExpanded.has(reportId)) {
      newExpanded.delete(reportId);
    } else {
      newExpanded.add(reportId);
    }
    setExpandedReports(newExpanded);
  };

  const filteredReports = incidentReports.filter(report => {
    const matchesStatus = filterStatus === 'all' || report.status?.toLowerCase() === filterStatus.toLowerCase();
    const matchesSearch = report.incident_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (report.location && report.location.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Geocoding function to convert coordinates to address
  const geocodeCoordinates = async (latitude: number, longitude: number): Promise<string> => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    const cacheKey = `${lat},${lng}`;
    
    // Check cache first
    if (locationCache[cacheKey]) {
      return locationCache[cacheKey];
    }

    // Set geocoding in progress
    setGeocodingInProgress(prev => ({ ...prev, [cacheKey]: true }));

    try {
      // Try using a CORS-friendly geocoding service first
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        // Build location name in the format: Street, Barangay, Municipality
        let locationParts = [];
        
        // First: Street name (road or locality)
        if (data.road) {
          locationParts.push(data.road);
        } else if (data.locality && !data.locality.includes('Barangay')) {
          locationParts.push(data.locality);
        }
        
        // Second: Barangay (locality if it contains "Barangay" or suburb)
        if (data.locality && data.locality.includes('Barangay')) {
          locationParts.push(data.locality);
        } else if (data.suburb && !data.suburb.includes('Barangay')) {
          // Check if suburb contains "Barangay"
          if (data.suburb.toLowerCase().includes('barangay')) {
            locationParts.push(data.suburb);
          }
        }
        
        // Third: Municipality (county or district)
        if (data.county && data.county !== data.locality && data.county !== data.suburb) {
          locationParts.push(data.county);
        }
        
        // Fourth: City (if different from municipality)
        if (data.city && data.city !== data.county && data.city !== data.locality && data.city !== data.suburb) {
          locationParts.push(data.city);
        }
        
        if (locationParts.length > 0) {
          const locationName = locationParts.join(', ');
          
          // Cache the result
          setLocationCache(prev => ({
            ...prev,
            [cacheKey]: locationName
          }));
          
          return locationName;
        }
      }
      
      // Fallback: Try OpenStreetMap through backend proxy
      try {
        const proxyResponse = await fetch(`/api/geocode?lat=${lat}&lon=${lng}`);
        if (proxyResponse.ok) {
          const proxyData = await proxyResponse.json();
                     if (proxyData.display_name) {
             const parts = proxyData.display_name.split(', ');
             // Take first 3 parts for: Street, Barangay, Municipality
             const locationName = parts.slice(0, 3).join(', ');
            
            // Cache the result
            setLocationCache(prev => ({
              ...prev,
              [cacheKey]: locationName
            }));
            
            return locationName;
          }
        }
      } catch (proxyError) {
        console.log('Backend proxy geocoding failed, using coordinate format');
      }
      
      // Final fallback: Format coordinates in a readable way
      const latDir = lat >= 0 ? 'N' : 'S';
      const lngDir = lng >= 0 ? 'E' : 'W';
      const latAbs = Math.abs(lat);
      const lngAbs = Math.abs(lng);
      
      const locationName = `${latAbs.toFixed(4)}°${latDir}, ${lngAbs.toFixed(4)}°${lngDir}`;
      
      // Cache the result
      setLocationCache(prev => ({
        ...prev,
        [cacheKey]: locationName
      }));
      
      return locationName;
      
    } catch (error) {
      console.error('Geocoding error:', error);
      
      // Ultimate fallback: Simple coordinate format
      const locationName = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      
      // Cache the result
      setLocationCache(prev => ({
        ...prev,
        [cacheKey]: locationName
      }));
      
      return locationName;
    } finally {
      // Clear geocoding in progress
      setGeocodingInProgress(prev => ({ ...prev, [cacheKey]: false }));
    }
  };

  // Function to get detailed location information
  const getDetailedLocation = async (latitude: number, longitude: number) => {
    try {
      // Try CORS-friendly service first
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        // Extract detailed location information in hierarchical format
        const locationParts = [];
        if (data.locality) locationParts.push(data.locality);
        if (data.county && data.county !== data.locality) locationParts.push(data.county);
        if (data.city && data.city !== data.locality && data.city !== data.county) locationParts.push(data.city);
        if (data.state && data.state !== data.city && data.state !== data.county) locationParts.push(data.state);
        
        return {
          locality: data.locality || '',           // Street/Barangay
          city: data.city || '',                   // City
          county: data.county || '',               // Municipality
          state: data.state || '',                 // Province/State
          country: data.countryName || '',         // Country
          fullAddress: locationParts.join(', '),  // Formatted: Street/Barangay, Municipality, City
          coordinates: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        };
      }
      
      // Fallback: Try backend proxy
      try {
        const proxyResponse = await fetch(`/api/geocode?lat=${latitude}&lon=${longitude}`);
        if (proxyResponse.ok) {
          const proxyData = await proxyResponse.json();
          const address = proxyData.address || {};
          return {
            locality: address.suburb || address.neighbourhood || '',
            city: address.city || address.town || address.village || '',
            county: address.county || '',
            state: address.state || address.province || '',
            country: address.country || '',
            fullAddress: proxyData.display_name || '',
            coordinates: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          };
        }
      } catch (proxyError) {
        console.log('Backend proxy detailed geocoding failed');
      }
      
      // Final fallback
      return {
        locality: '',
        city: '',
        county: '',
        state: '',
        country: '',
        fullAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        coordinates: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
      };
      
    } catch (error) {
      console.error('Detailed geocoding error:', error);
      return {
        locality: '',
        city: '',
        county: '',
        state: '',
        country: '',
        fullAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        coordinates: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
      };
    }
  };

  // Function to get location display text
  const getLocationDisplay = async (report: IncidentReport): Promise<string> => {
    if (report.location && report.location.trim() !== '') {
      return report.location;
    }
    
    if (report.latitude && report.longitude) {
      const coordKey = `${report.latitude},${report.longitude}`;
      
      // Check if we already have this location geocoded
      if (geocodedLocations[coordKey]) {
        return geocodedLocations[coordKey];
      }
      
      // Geocode the coordinates
      const address = await geocodeCoordinates(report.latitude, report.longitude);
      
      // Store the geocoded result
      setGeocodedLocations(prev => ({
        ...prev,
        [coordKey]: address
      }));
      
      return address;
    }
    
    return 'Location not specified';
  };

  const handleNewReport = () => {
    navigate('/incident-report');
  };

  // Manual geocoding refresh function
  const refreshGeocoding = async () => {
    setGeocodedLocations({});
    setGeocodingStatus({});
    
    // Re-trigger geocoding for all reports
    const geocodeReports = async () => {
      for (const report of incidentReports) {
        if (report.latitude && report.longitude && !report.location) {
          const coordKey = `${report.latitude},${report.longitude}`;
          
          // Set loading status
          setGeocodingStatus(prev => ({
            ...prev,
            [coordKey]: 'loading'
          }));
          
                      try {
              // Add delay to avoid rate limiting (1 second between requests)
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              const address = await geocodeCoordinates(report.latitude, report.longitude);
            setGeocodedLocations(prev => ({
              ...prev,
              [coordKey]: address
            }));
            setGeocodingStatus(prev => ({
              ...prev,
              [coordKey]: 'completed'
            }));
          } catch (error) {
            setGeocodingStatus(prev => ({
              ...prev,
              [coordKey]: 'error'
            }));
          }
        }
      }
    };

    if (incidentReports.length > 0) {
      geocodeReports();
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar isAuthenticated={isAuthenticated} userData={userData as UserData} />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div className="flex-1">
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">History Report</h1>
              <p className="text-gray-600 mt-2 text-sm lg:text-base">View and manage your incident reports with detailed timeline</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
             
             
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 lg:px-4 lg:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base min-w-[120px]"
              >
                <option value="all">All Status</option>
                <option value="resolved">Resolved</option>
                <option value="in_progress">In Progress</option>
                <option value="pending">Pending</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </Card>

                 {/* Reports List */}
         {isLoading ? (
           <Card>
             <div className="flex items-center justify-center py-12">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
               <span className="ml-3 text-gray-600">Loading reports...</span>
             </div>
             <div className="text-center text-sm text-gray-500 mt-4">
               <p>Connecting to backend server at http://localhost:5000...</p>
               <p className="mt-1">This may take a few moments</p>
               <div className="mt-3 text-xs text-gray-400">
                 <p>If this takes too long, check if the backend server is running</p>
               </div>
             </div>
           </Card>
                 ) : error ? (
           <Card>
             <div className="text-center py-12">
               <i className="ri-error-warning-line text-4xl text-red-500 mb-4"></i>
               <p className="text-red-600 mb-4 font-medium">{error}</p>
               
               {/* Debug Information */}
               <div className="text-sm text-gray-600 mb-6 max-w-md mx-auto text-left">
                 <p className="font-medium mb-2">Debug Information:</p>
                 <div className="bg-gray-100 p-3 rounded text-xs font-mono">
                   <p>API Endpoint: /api/incidents/user/{userData?.userId || userData?.user_id || userData?.id || 'unknown'}</p>
                   <p>Backend URL: http://localhost:5000</p>
                   <p>Frontend Port: 3000</p>
                   <p>User ID Found: {userData?.userId || userData?.user_id || userData?.id || 'No ID found'}</p>
                   <p>User Type: {userData?.userType || 'Unknown'}</p>
                 </div>
               </div>
               
               <div className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
                 <p>Common solutions:</p>
                 <ul className="text-left mt-2 space-y-1">
                   <li>• Ensure the backend server is running on port 5000</li>
                   <li>• Check if the backend server is accessible at http://localhost:5000</li>
                   <li>• Verify the database connection in the backend</li>
                   <li>• Check browser console for detailed error logs</li>
                 </ul>
               </div>
               
               <div className="flex gap-3 justify-center">
                 <Button
                   onClick={fetchIncidentReports}
                   className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                 >
                   <i className="ri-refresh-line mr-2"></i>
                   Try Again
                 </Button>
                 <Button
                   onClick={() => window.location.reload()}
                   className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
                 >
                   <i className="ri-restart-line mr-2"></i>
                   Refresh Page
                 </Button>
                 <Button
                   onClick={() => window.open('http://localhost:5000/api/health', '_blank')}
                   className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                 >
                   <i className="ri-external-link-line mr-2"></i>
                   Test Backend
                 </Button>
               </div>
             </div>
           </Card>
        ) : filteredReports.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <i className="ri-file-list-line text-4xl text-gray-400 mb-4"></i>
              <p className="text-gray-600 mb-4">
                {searchTerm || filterStatus !== 'all' 
                  ? 'No reports match your current filters.'
                  : 'No incident reports found.'
                }
              </p>
              {searchTerm || filterStatus !== 'all' ? (
                <Button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('all');
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Clear Filters
                </Button>
              ) : (
                <Button
                  onClick={handleNewReport}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Create First Report
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <Card key={report.incident_id} className="hover:shadow-md transition-shadow">
                <div className="p-4 lg:p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                        <h3 className="text-base lg:text-lg font-semibold text-gray-900">
                          {report.incident_type}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          <span className={`px-2 py-1 lg:px-3 lg:py-1 rounded-full text-xs font-medium border ${getPriorityColor(report.priority_level)}`}>
                            <span className="hidden sm:inline">{report.priority_level?.charAt(0).toUpperCase() + report.priority_level?.slice(1)} Priority</span>
                            <span className="sm:hidden">{report.priority_level?.charAt(0).toUpperCase() + report.priority_level?.slice(1)}</span>
                          </span>
                          <span className={`px-2 py-1 lg:px-3 lg:py-1 rounded-full text-xs font-medium border ${getStatusColor(report.status)}`}>
                            {report.status?.replace('_', ' ').charAt(0).toUpperCase() + report.status?.replace('_', ' ').slice(1)}
                          </span>
                          <span className={`px-2 py-1 lg:px-3 lg:py-1 rounded-full text-xs font-medium border ${getSafetyStatusColor(report.reporter_safe_status)}`}>
                            {report.reporter_safe_status?.charAt(0).toUpperCase() + report.reporter_safe_status?.slice(1)}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-gray-700 mb-3 line-clamp-2">{report.description}</p>
                      
                                                                                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                          <div className="flex items-start sm:items-center text-sm text-gray-500">
                            <i className="ri-map-pin-line mr-2 mt-1 sm:mt-0"></i>
                            <div className="flex-1">
                              <span className="text-sm lg:text-base">
                                {report.location && report.location.trim() !== '' 
                                  ? report.location 
                                  : (report.latitude && report.longitude)
                                    ? (geocodingInProgress[`${report.latitude},${report.longitude}`]
                                        ? <div className="flex items-center">
                                            <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600 mr-2"></div>
                                            <span className="text-gray-500">Loading location...</span>
                                          </div>
                                        : locationCache[`${report.latitude},${report.longitude}`] || `${Number(report.latitude).toFixed(6)}, ${Number(report.longitude).toFixed(6)}`)
                                    : 'Location not specified'
                                }
                              </span>
                              {(report.latitude && report.longitude) && (
                                <div className="text-xs text-gray-400 mt-1">
                                  <span className="hidden sm:inline">Lat: {Number(report.latitude).toFixed(6)}, Lng: {Number(report.longitude).toFixed(6)}</span>
                                  <span className="sm:hidden">Lat: {Number(report.latitude).toFixed(4)}, Lng: {Number(report.longitude).toFixed(4)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Show map button if coordinates are available */}
                          {(report.latitude && report.longitude) && (
                            <button
                              onClick={() => {
                                const lat = Number(report.latitude);
                                const lng = Number(report.longitude);
                                const url = `https://www.google.com/maps?q=${lat},${lng}`;
                                window.open(url, '_blank');
                              }}
                              className="flex items-center text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded self-start sm:self-center"
                            >
                              <i className="ri-map-line mr-1"></i>
                              <span className="hidden sm:inline">View on Map</span>
                              <span className="sm:hidden">Map</span>
                            </button>
                          )}
                        </div>
                      
                      {(report.assigned_team_name || report.assigned_staff_name) && (
                        <div className="flex items-center text-sm text-gray-500 mb-3">
                          <i className="ri-user-line mr-2"></i>
                          <span>Assigned to: {report.assigned_team_name || report.assigned_staff_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-4 mb-2 sm:mb-0">
                        <span>
                          <i className="ri-time-line mr-1"></i>
                          Reported: {formatDate(report.date_reported)}
                        </span>
                        <span>
                          <i className="ri-refresh-line mr-1"></i>
                          Updated: {formatDate(report.updated_at)}
                        </span>
                      </div>
                      
                      {report.validation_notes && (
                        <div className="flex items-start">
                          <i className="ri-chat-1-line mr-2 mt-0.5 text-blue-500"></i>
                          <span className="text-gray-600 italic">"{report.validation_notes}"</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timeline Toggle Button */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => toggleReportExpansion(report.incident_id)}
                      className="flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      <i className={`ri-arrow-down-s-line mr-2 transition-transform duration-200 ${
                        expandedReports.has(report.incident_id) ? 'rotate-180' : ''
                      }`}></i>
                      {expandedReports.has(report.incident_id) ? 'Hide Timeline' : 'View Timeline'}
                    </button>
                  </div>

                  {/* Timeline */}
                  {expandedReports.has(report.incident_id) && report.timeline && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <i className="ri-time-line mr-2 text-blue-600"></i>
                        Incident Timeline
                      </h4>
                      
                                             {/* Current Stage Summary */}
                       <div className="mb-6 p-3 lg:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                           <div className="flex items-center space-x-3">
                             <div className={`w-4 h-4 rounded-full ${getStageColor(getCurrentStage(report.status))} border-2 border-white shadow-sm`}></div>
                             <div>
                               <h5 className="font-semibold text-gray-900 text-sm lg:text-base">Current Stage</h5>
                               <p className="text-xs lg:text-sm text-gray-600">
                                 {getCurrentStage(report.status)} - {report.status?.replace('_', ' ').charAt(0).toUpperCase() + report.status?.replace('_', ' ').slice(1)}
                               </p>
                             </div>
                           </div>
                           <div className="text-left sm:text-right">
                             <div className="text-xs text-gray-500">Last Updated</div>
                             <div className="text-sm font-medium text-gray-900">{formatDate(report.updated_at)}</div>
                           </div>
                         </div>
                       </div>
                       
                       {/* Location Information */}
                       {(report.location || (report.latitude && report.longitude)) && (
                         <div className="mb-6 p-3 lg:p-4 bg-gray-50 border border-gray-200 rounded-lg">
                           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                             <div className="flex items-start sm:items-center space-x-3">
                               <i className="ri-map-pin-line text-lg text-gray-600 mt-1 sm:mt-0"></i>
                               <div className="flex-1">
                                 <h5 className="font-semibold text-gray-900 text-sm lg:text-base">Location Details</h5>
                                 <p className="text-sm text-gray-600">
                                   {report.location && report.location.trim() !== '' 
                                     ? report.location 
                                     : (report.latitude && report.longitude)
                                       ? (geocodingInProgress[`${report.latitude},${report.longitude}`]
                                           ? <div className="flex items-center">
                                               <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600 mr-2"></div>
                                               <span className="text-gray-500">Loading location...</span>
                                             </div>
                                           : locationCache[`${report.latitude},${report.longitude}`] || `${Number(report.latitude).toFixed(6)}, ${Number(report.longitude).toFixed(6)}`)
                                       : 'Location not specified'
                                   }
                                 </p>
                                 {(report.latitude && report.longitude) && (
                                   <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-100 rounded border">
                                     <div className="font-medium mb-1">Coordinates:</div>
                                     <div className="space-y-1">
                                       <div className="break-all">Lat: {Number(report.latitude).toFixed(6)}, Lng: {Number(report.longitude).toFixed(6)}</div>
                                     </div>
                                   </div>
                                 )}
                               </div>
                             </div>
                             
                             {/* Map button */}
                             {(report.latitude && report.longitude) && (
                               <button
                                 onClick={() => {
                                   const lat = Number(report.latitude);
                                   const lng = Number(report.longitude);
                                   const url = `https://www.google.com/maps?q=${lat},${lng}`;
                                   window.open(url, '_blank');
                                 }}
                                 className="flex items-center px-2 py-2 lg:px-3 lg:py-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 self-start sm:self-center"
                               >
                                 <i className="ri-map-line mr-2"></i>
                                 <span className="hidden sm:inline">Open in Maps</span>
                                 <span className="sm:hidden">Maps</span>
                               </button>
                             )}
                           </div>
                         </div>
                       )}
                      
                      <div className="relative">
                        {/* Timeline Line */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                        
                        {/* Timeline Events */}
                        <div className="space-y-4">
                          {report.timeline?.map((event, index) => {
                            const isCurrentStage = event.id.includes('current');
                            const isLastEvent = index === (report.timeline?.length || 0) - 1;
                            
                            return (
                              <div key={event.id} className="relative flex items-start">
                                {/* Timeline Dot */}
                                <div className={`absolute left-4 w-3 h-3 rounded-full ${getStageColor(event.stage)} border-2 border-white shadow-sm z-10 ${
                                  isCurrentStage ? 'ring-2 ring-blue-300 ring-offset-2' : ''
                                }`}></div>
                                
                                {/* Timeline Content */}
                                <div className="ml-8 flex-1">
                                  <div className={`rounded-lg p-4 border ${
                                    isCurrentStage 
                                      ? 'bg-blue-50 border-blue-200 shadow-md' 
                                      : 'bg-gray-50 border-gray-200'
                                  }`}>
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-center space-x-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStageColor(event.stage)} text-white ${
                                          isCurrentStage ? 'ring-2 ring-blue-300' : ''
                                        }`}>
                                          {event.stage}
                                          {isCurrentStage && <span className="ml-1">●</span>}
                                        </span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                                          isCurrentStage 
                                            ? 'bg-blue-100 text-blue-700 border-blue-300' 
                                            : 'bg-gray-100 text-gray-700'
                                        }`}>
                                          {event.status}
                                        </span>
                                      </div>
                                      <span className="text-xs text-gray-500">
                                        {formatDate(event.timestamp)}
                                      </span>
                                    </div>
                                    
                                    <p className="text-sm text-gray-700 mb-2">{event.description}</p>
                                    
                                    {event.assignedTo && (
                                      <div className="flex items-center text-xs text-gray-600 mb-2">
                                        <i className="ri-user-line mr-1"></i>
                                        <span>Assigned to: {event.assignedTo}</span>
                                      </div>
                                    )}
                                    
                                    {event.notes && (
                                      <div className={`text-xs italic p-2 rounded border-l-2 ${
                                        isCurrentStage 
                                          ? 'text-blue-600 bg-blue-50 border-blue-300' 
                                          : 'text-gray-600 bg-white border-blue-200'
                                      }`}>
                                        <i className="ri-chat-1-line mr-1 text-blue-500"></i>
                                        {event.notes}
                                      </div>
                                    )}
                                    
                                    {/* Current Stage Indicator */}
                                    {isCurrentStage && (
                                      <div className="mt-2 p-2 bg-blue-100 border border-blue-200 rounded text-xs text-blue-700 font-medium">
                                        <i className="ri-information-line mr-1"></i>
                                        Current Stage
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {filteredReports.length > 0 && (
          <Card className="mt-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 text-center">
              <div className="p-3 lg:p-4">
                <div className="text-xl lg:text-2xl font-bold text-blue-600">{filteredReports.length}</div>
                <div className="text-xs lg:text-sm text-gray-600">Total Reports</div>
              </div>
              <div className="p-3 lg:p-4">
                <div className="text-xl lg:text-2xl font-bold text-green-600">
                  {filteredReports.filter(r => r.status === 'resolved').length}
                </div>
                <div className="text-xs lg:text-sm text-gray-600">Resolved</div>
              </div>
              <div className="p-3 lg:p-4">
                <div className="text-xl lg:text-2xl font-bold text-yellow-600">
                  {filteredReports.filter(r => r.status === 'in_progress').length}
                </div>
                <div className="text-xs lg:text-sm text-gray-600">In Progress</div>
              </div>
              <div className="p-3 lg:p-4">
                <div className="text-xl lg:text-2xl font-bold text-red-600">
                  {filteredReports.filter(r => r.priority_level === 'critical').length}
                </div>
                <div className="text-xs lg:text-sm text-gray-600">Critical Priority</div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
