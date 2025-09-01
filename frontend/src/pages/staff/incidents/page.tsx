import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAuthState } from '../../../utils/auth';
import { incidentsApi, teamsApi, staffManagementApi } from '../../../utils/api';

interface Incident {
  incident_id: number;
  incident_type: string;
  description: string;
  location: string;
  latitude: number | string;
  longitude: number | string;
  priority_level: string;
  reporter_safe_status: string;
  status: string;
  reported_by: string;
  reporter_name: string;
  assigned_team_id?: number | null;
  assigned_team_name?: string;
  assigned_staff_id?: number | null;
  assigned_staff_name?: string;
  date_reported: string;
  date_resolved?: string;
  assignment_type?: 'individual' | 'team' | 'unknown';
  resolvedLocation?: string;
}

interface Team {
  id: number;
  name: string;
  description: string;
  member_count: number;
}

const StaffIncidentsPage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filteredIncidents, setFilteredIncidents] = useState<Incident[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [availableStaff, setAvailableStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('all'); // 'all', 'individual', 'team'
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [assignmentType, setAssignmentType] = useState<'team' | 'staff'>('team');
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [emailStatus, setEmailStatus] = useState<{sent: boolean, details?: any} | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string>('');
  const [updateNotes, setUpdateNotes] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<Array<{id: string, message: string, type: 'info' | 'success' | 'warning' | 'error'}>>([]);

  const addNotification = (message: string, type: 'info' | 'success' | 'warning' | 'error') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };
  const [locationCache, setLocationCache] = useState<{[key: string]: string}>({});
  const [geocodingInProgress, setGeocodingInProgress] = useState<{[key: string]: boolean}>({});

  const authState = getAuthState();
  const currentStaffId = authState.userData?.id || authState.userData?.staff_id || authState.userData?.user_id;
  const currentStaffTeamId = authState.userData?.assigned_team_id;
  
  console.log('🔐 Auth state:', authState);
  console.log('👤 Current staff ID:', currentStaffId);
  console.log('👥 Current staff team ID:', currentStaffTeamId);

  useEffect(() => {
    if (currentStaffId) {
      fetchIncidents();
      fetchTeams();
      fetchAvailableStaff();
    }
  }, [currentStaffId]);

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh && currentStaffId) {
      // Set up auto-refresh every 30 seconds
      const interval = window.setInterval(() => {
        console.log('🔄 Auto-refreshing incidents...');
        fetchIncidents();
        setLastRefresh(new Date());
      }, 30000); // 30 seconds

      setRefreshInterval(interval);

      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [autoRefresh, currentStaffId]);

  useEffect(() => {
    filterIncidents();
  }, [incidents, searchTerm, statusFilter, priorityFilter, assignmentFilter]);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching incidents for staff ID:', currentStaffId);
      
      // Use the new staff-specific endpoint
      if (!currentStaffId) {
        console.error('❌ No staff ID available');
        return;
      }
      const response = await incidentsApi.getStaffIncidents(Number(currentStaffId));
      
      if (response.success && response.incidents) {
        console.log('📋 Staff incidents response:', response);
        console.log('👤 Staff info:', response.staffInfo);
        console.log('📊 Assignment stats:', response.assignmentStats);
        
        // Geocode locations for each incident
        const incidentsWithLocations = await Promise.all(
          response.incidents.map(async (incident: any) => {
            try {
              const locationName = await getLocationName(incident.latitude, incident.longitude);
              return {
                ...incident,
                resolvedLocation: locationName
              };
            } catch (error) {
              console.error('Error geocoding incident location:', error);
              return {
                ...incident,
                resolvedLocation: `${Number(incident.latitude).toFixed(4)}, ${Number(incident.longitude).toFixed(4)}`
              };
            }
          })
        );
        
        setIncidents(incidentsWithLocations);
        
        // Update team ID from the response if available
        if (response.staffInfo?.teamId && !currentStaffTeamId) {
          console.log('🔄 Updating team ID from response:', response.staffInfo.teamId);
          // Note: In a real app, you might want to update the auth state here
        }
      }
    } catch (error) {
      console.error('Error fetching staff incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await teamsApi.getTeams();
      if (response.success && response.teams) {
        setTeams(response.teams);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchAvailableStaff = async () => {
    try {
      const response = await staffManagementApi.getStaff({ status: 'active' });
      if (response.success && response.data?.users) {
        setAvailableStaff(response.data.users);
      }
    } catch (error) {
      console.error('Error fetching available staff:', error);
    }
  };

  const handleManualRefresh = async () => {
    console.log('🔄 Manual refresh triggered');
    setLastRefresh(new Date());
    await fetchIncidents();
    
    // Add notification
    const notificationId = Date.now().toString();
    setNotifications(prev => [...prev, {
      id: notificationId,
      message: 'Incidents refreshed successfully',
      type: 'success'
    }]);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }, 3000);
  };

  // Geocoding function to convert coordinates to location names
  const getLocationName = async (latitude: number | string, longitude: number | string): Promise<string> => {
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
      // Use OpenStreetMap Nominatim API (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        
        // Extract location name from response
        let locationName = '';
        
        if (data.display_name) {
          // Parse the display_name to get a more readable format
          const parts = data.display_name.split(', ');
          // Take the first 3 parts for a concise location name
          locationName = parts.slice(0, 3).join(', ');
        } else if (data.address) {
          // Fallback to address components
          const address = data.address;
          if (address.road && address.city) {
            locationName = `${address.road}, ${address.city}`;
          } else if (address.city) {
            locationName = address.city;
          } else if (address.town) {
            locationName = address.town;
          } else if (address.village) {
            locationName = address.village;
          } else {
            locationName = 'Unknown Location';
          }
        } else {
          locationName = 'Unknown Location';
        }
        
        // Cache the result
        setLocationCache(prev => ({
          ...prev,
          [cacheKey]: locationName
        }));
        
        return locationName;
      }
    } catch (error) {
      console.error('Error geocoding coordinates:', error);
    } finally {
      // Clear geocoding in progress
      setGeocodingInProgress(prev => ({ ...prev, [cacheKey]: false }));
    }
    
    // Fallback to coordinates if geocoding fails
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  const filterIncidents = () => {
    let filtered = incidents;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(incident =>
        incident.incident_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(incident => incident.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(incident => incident.priority_level === priorityFilter);
    }

    // Assignment filter
    if (assignmentFilter !== 'all') {
      if (assignmentFilter === 'individual') {
        filtered = filtered.filter(incident => incident.assigned_staff_id === currentStaffId);
      } else if (assignmentFilter === 'team') {
        filtered = filtered.filter(incident => incident.assigned_team_id === currentStaffTeamId);
      }
    }

    setFilteredIncidents(filtered);
  };

  const handleAssignTeam = async (incidentId: number, teamId: number | null) => {
    try {
      setIsAssigning(true);
      setEmailStatus(null);
      
      console.log('🔄 Assigning team to incident:', { incidentId, teamId });
      
      const response = await incidentsApi.assignTeamToIncident(incidentId, teamId);
      
      console.log('✅ Team assignment response:', response);
      
      // Update local state
      setIncidents(prev => prev.map(incident => {
        if (incident.incident_id === incidentId) {
          const selectedTeam = teams.find(team => team.id === teamId);
          return {
            ...incident,
            assigned_team_id: teamId,
            assigned_team_name: selectedTeam?.name || undefined,
            assigned_staff_id: undefined, // Clear staff assignment when team is assigned
            assigned_staff_name: undefined
          };
        }
        return incident;
      }));
      
      // Show email status
      if (response?.emailSent) {
        setEmailStatus({
          sent: true,
          details: response.emailDetails
        });
        console.log('📧 Email notifications sent successfully:', response.emailDetails);
      } else {
        setEmailStatus({
          sent: false,
          details: response.emailDetails || { error: 'No email details provided' }
        });
        console.log('⚠️ Email notifications failed:', response.emailDetails);
      }
      
      setTimeout(() => {
        setShowAssignmentModal(false);
        setEmailStatus(null);
      }, 3000);
      
    } catch (error) {
      console.error('❌ Error assigning team to incident:', error);
      setEmailStatus({
        sent: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleAssignStaff = async (incidentId: number, staffId: number | null) => {
    try {
      setIsAssigning(true);
      setEmailStatus(null);
      
      console.log('🔄 Assigning staff to incident:', { incidentId, staffId });
      
      const response = await incidentsApi.assignStaffToIncident(incidentId, staffId);
      
      console.log('✅ Staff assignment response:', response);
      
      // Update local state
      setIncidents(prev => prev.map(incident => {
        if (incident.incident_id === incidentId) {
          return {
            ...incident,
            assigned_staff_id: staffId,
            assigned_staff_name: staffId ? 'Assigned Staff' : undefined,
            assigned_team_id: undefined, // Clear team assignment when staff is assigned
            assigned_team_name: undefined
          };
        }
        return incident;
      }));
      
      // Show email status
      if (response?.emailSent) {
        setEmailStatus({
          sent: true,
          details: response.emailDetails
        });
        console.log('📧 Email notification sent successfully:', response.emailDetails);
      } else {
        setEmailStatus({
          sent: false,
          details: response.emailDetails || { error: 'No email details provided' }
        });
        console.log('⚠️ Email notification failed:', response.emailDetails);
      }
      
      setTimeout(() => {
        setShowAssignmentModal(false);
        setEmailStatus(null);
      }, 3000);
      
    } catch (error) {
      console.error('❌ Error assigning staff to incident:', error);
      setEmailStatus({
        sent: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUpdateIncident = async (incidentId: number, status: string, notes: string) => {
    try {
      setIsUpdating(true);
      setEmailStatus(null);
      
      console.log('🔄 Updating incident:', { incidentId, status, notes });
      
      // Call the update API
      const response = await incidentsApi.updateIncidentStatus(incidentId, { status, notes });
      
      console.log('✅ Update response:', response);
      
      // Update local state
      setIncidents(prev => prev.map(incident => {
        if (incident.incident_id === incidentId) {
          return {
            ...incident,
            status: status
          };
        }
        return incident;
      }));
      
      // Show success notification
      const notificationId = Date.now().toString();
      setNotifications(prev => [...prev, {
        id: notificationId,
        message: 'Incident updated successfully',
        type: 'success'
      }]);
      
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      }, 3000);
      
      // Close modal
      setTimeout(() => {
        setShowUpdateModal(false);
        setUpdateStatus('');
        setUpdateNotes('');
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error updating incident:', error);
      
      // Show error notification
      const notificationId = Date.now().toString();
      setNotifications(prev => [...prev, {
        id: notificationId,
        message: 'Failed to update incident',
        type: 'error'
      }]);
      
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      }, 3000);
    } finally {
      setIsUpdating(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getAssignmentType = (incident: Incident) => {
    // Use the assignment_type from backend if available, otherwise fallback to logic
    if (incident.assignment_type) {
      return incident.assignment_type;
    }
    
    if (incident.assigned_staff_id === currentStaffId) {
      return 'individual';
    } else if (incident.assigned_team_id === currentStaffTeamId) {
      return 'team';
    }
    return 'unknown';
  };

  const getAssignmentBadge = (incident: Incident) => {
    const assignmentType = getAssignmentType(incident);
    if (assignmentType === 'individual') {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">Individual</span>;
    } else if (assignmentType === 'team') {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200">Team</span>;
    }
    return null;
  };

  const openIncidentModal = (incident: Incident) => {
    setSelectedIncident(incident);
    setShowIncidentModal(true);
  };

  const closeIncidentModal = () => {
    setShowIncidentModal(false);
    setSelectedIncident(null);
  };

  const openAssignmentModal = (incident: Incident) => {
    setSelectedIncident(incident);
    setAssignmentType('team');
    setSelectedTeamId(incident.assigned_team_id || null);
    setSelectedStaffId(incident.assigned_staff_id || null);
    setShowAssignmentModal(true);
  };

  const closeAssignmentModal = () => {
    setShowAssignmentModal(false);
    setSelectedIncident(null);
    setSelectedTeamId(null);
    setSelectedStaffId(null);
    setEmailStatus(null);
  };

  const openUpdateModal = (incident: Incident) => {
    // Prevent opening update modal for resolved or closed incidents
    if (incident.status === 'resolved' || incident.status === 'closed') {
      addNotification('Cannot update incident. Resolved and closed incidents cannot be modified.', 'error');
      return;
    }
    
    setSelectedIncident(incident);
    setUpdateStatus(incident.status);
    setUpdateNotes('');
    setShowUpdateModal(true);
  };

  const closeUpdateModal = () => {
    setShowUpdateModal(false);
    setSelectedIncident(null);
    setUpdateStatus('');
    setUpdateNotes('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Incidents</h1>
              <p className="text-gray-600">Manage incidents assigned to you individually or to your team</p>
              <div className="flex items-center mt-2 space-x-4">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span className="text-sm text-gray-500">
                    {autoRefresh ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
                  </span>
                </div>
                <span className="text-sm text-gray-400">
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleManualRefresh}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <i className={`ri-refresh-line mr-2 ${loading ? 'animate-spin' : ''}`}></i>
                Refresh
              </button>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`inline-flex items-center px-3 py-2 border rounded-md shadow-sm text-sm font-medium ${
                  autoRefresh 
                    ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100' 
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                <i className={`ri-${autoRefresh ? 'pause' : 'play'}-line mr-2`}></i>
                {autoRefresh ? 'Pause' : 'Resume'} Auto-refresh
              </button>
              <Link
                to="/staff"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <i className="ri-arrow-left-line mr-2"></i>
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search incidents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Assignment Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assignment</label>
              <select
                value={assignmentFilter}
                onChange={(e) => setAssignmentFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Assignments</option>
                <option value="individual">Individual</option>
                <option value="team">Team</option>
              </select>
            </div>

            {/* Results Count */}
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                {filteredIncidents.length} of {incidents.length} incidents
              </div>
            </div>
          </div>
        </div>

        {/* Team Assignment Summary */}
        {incidents.some(i => i.assignment_type === 'team') && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <i className="ri-team-line text-blue-600 text-xl"></i>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">Team Assignment Summary</h3>
                  <p className="text-blue-700 text-sm">
                    You have {incidents.filter(i => i.assignment_type === 'team').length} team-assigned incidents
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-900">
                  {incidents.filter(i => i.assignment_type === 'team').length}
                </div>
                <div className="text-blue-700 text-sm">Team Incidents</div>
              </div>
            </div>
          </div>
        )}

        {/* Incidents List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Assigned Incidents</h3>
              <div className="text-sm text-gray-500">
                Showing {filteredIncidents.length} of {incidents.length} incidents
              </div>
            </div>
          </div>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading incidents...</p>
            </div>
          ) : filteredIncidents.length === 0 ? (
            <div className="text-center py-12">
              <i className="ri-inbox-line text-4xl text-gray-400 mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No incidents found</h3>
              <p className="text-gray-600">
                {incidents.length === 0 
                  ? "You don't have any assigned incidents yet."
                  : "No incidents match your current filters."
                }
              </p>
              {incidents.length === 0 && (
                <div className="mt-4">
                  <div className="text-xs text-gray-400">
                    <i className="ri-information-line mr-1"></i>
                    Incidents will appear here when assigned to you or your team
                  </div>
                </div>
              )}
            </div>
                      ) : (
                        <>
              {/* Card-based Layout (All Screen Sizes) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
                {filteredIncidents.map((incident) => (
                  <div key={incident.incident_id} className={`bg-white rounded-lg shadow-sm border transition-shadow duration-200 ${
                    incident.status === 'resolved' || incident.status === 'closed'
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 hover:shadow-md'
                  }`}>
                    {/* Header with Incident ID and Status */}
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            incident.status === 'resolved' || incident.status === 'closed'
                              ? 'bg-green-500'
                              : 'bg-blue-500'
                          }`}></div>
                          <span className="text-xs font-medium text-gray-500">#{incident.incident_id}</span>
                          {(incident.status === 'resolved' || incident.status === 'closed') && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              <i className="ri-check-line mr-1"></i>
                              Completed
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(incident.priority_level)}`}>
                            {incident.priority_level.charAt(0).toUpperCase() + incident.priority_level.slice(1)}
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(incident.status)}`}>
                            {getStatusText(incident.status)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Incident Type and Description */}
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {incident.incident_type}
                      </h3>
                      <p className="text-sm text-gray-600 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {incident.description}
                      </p>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-3">
                      {/* Location */}
                      <div className="flex items-start space-x-2">
                        <i className="ri-map-pin-line text-gray-400 mt-0.5 flex-shrink-0"></i>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">
                            {geocodingInProgress[`${incident.latitude},${incident.longitude}`] ? (
                              <div className="flex items-center">
                                <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600 mr-2"></div>
                                <span className="text-gray-500">Loading location...</span>
                              </div>
                            ) : (
                              incident.resolvedLocation || incident.location
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Assignment */}
                      <div className="flex items-center space-x-2">
                        <i className="ri-user-line text-gray-400 flex-shrink-0"></i>
                        <div className="flex items-center space-x-2">
                          {getAssignmentBadge(incident)}
                          {incident.assigned_team_name && (
                            <span className="text-xs text-gray-500">
                              • {incident.assigned_team_name}
                            </span>
                          )}
                          {incident.assigned_staff_name && (
                            <span className="text-xs text-gray-500">
                              • {incident.assigned_staff_name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Date and Reporter */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-2">
                          <i className="ri-time-line"></i>
                          <span>{new Date(incident.date_reported).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{new Date(incident.date_reported).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <i className="ri-user-line"></i>
                          <span>{incident.reporter_name}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="px-4 pb-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openIncidentModal(incident)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors"
                        >
                          <i className="ri-eye-line mr-2"></i>
                          View Details
                        </button>
                        <button
                          onClick={() => openUpdateModal(incident)}
                          disabled={incident.status === 'resolved' || incident.status === 'closed'}
                          className={`flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                            incident.status === 'resolved' || incident.status === 'closed'
                              ? 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed'
                              : 'text-green-600 hover:text-green-900 hover:bg-green-50 border-green-200'
                          }`}
                        >
                          <i className="ri-edit-line mr-2"></i>
                          {incident.status === 'resolved' || incident.status === 'closed' ? 'Completed' : 'Update'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Incident Detail Modal */}
      {showIncidentModal && selectedIncident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <i className="ri-alert-line text-xl"></i>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      Incident #{selectedIncident.incident_id}
                    </h2>
                    <p className="text-blue-100 text-sm">
                      {selectedIncident.incident_type}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeIncidentModal}
                  className="text-white hover:text-blue-100 transition-colors p-2 rounded-lg hover:bg-white hover:bg-opacity-20"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Description */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <i className="ri-file-text-line text-blue-600"></i>
                      <h3 className="font-semibold text-gray-900">Description</h3>
                    </div>
                    <p className="text-gray-700 leading-relaxed">
                      {selectedIncident.description}
                    </p>
                  </div>

                  {/* Location */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <i className="ri-map-pin-line text-red-600"></i>
                      <h3 className="font-semibold text-gray-900">Location</h3>
                    </div>
                    <p className="text-gray-700 mb-2">
                      {selectedIncident.resolvedLocation || selectedIncident.location}
                    </p>
                    {selectedIncident.resolvedLocation && selectedIncident.resolvedLocation !== selectedIncident.location && (
                      <p className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        Coordinates: {Number(selectedIncident.latitude).toFixed(4)}, {Number(selectedIncident.longitude).toFixed(4)}
                      </p>
                    )}
                  </div>

                  {/* Assignment */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <i className="ri-team-line text-green-600"></i>
                      <h3 className="font-semibold text-gray-900">Assignment</h3>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getAssignmentBadge(selectedIncident)}
                      {selectedIncident.assigned_team_name && (
                        <div className="flex items-center space-x-1">
                          <i className="ri-team-line text-gray-400"></i>
                          <span className="text-sm text-gray-700">{selectedIncident.assigned_team_name}</span>
                        </div>
                      )}
                      {selectedIncident.assigned_staff_name && (
                        <div className="flex items-center space-x-1">
                          <i className="ri-user-line text-gray-400"></i>
                          <span className="text-sm text-gray-700">{selectedIncident.assigned_staff_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Priority & Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <i className="ri-flag-line text-orange-600"></i>
                        <h3 className="font-semibold text-gray-900">Priority</h3>
                      </div>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getPriorityColor(selectedIncident.priority_level)}`}>
                        {selectedIncident.priority_level.charAt(0).toUpperCase() + selectedIncident.priority_level.slice(1)}
                      </span>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <i className="ri-time-line text-purple-600"></i>
                        <h3 className="font-semibold text-gray-900">Status</h3>
                      </div>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(selectedIncident.status)}`}>
                        {getStatusText(selectedIncident.status)}
                      </span>
                    </div>
                  </div>

                  {/* Reporter */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <i className="ri-user-line text-indigo-600"></i>
                      <h3 className="font-semibold text-gray-900">Reporter</h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                        <i className="ri-user-line text-indigo-600 text-sm"></i>
                      </div>
                      <span className="text-gray-700">{selectedIncident.reporter_name}</span>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <i className="ri-calendar-line text-gray-600"></i>
                      <h3 className="font-semibold text-gray-900">Timeline</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Reported:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {new Date(selectedIncident.date_reported).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Time:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {new Date(selectedIncident.date_reported).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      {selectedIncident.date_resolved && (
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                          <span className="text-sm text-gray-600">Resolved:</span>
                          <span className="text-sm font-medium text-green-600">
                            {new Date(selectedIncident.date_resolved).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    closeIncidentModal();
                    openUpdateModal(selectedIncident);
                  }}
                  disabled={selectedIncident.status === 'resolved' || selectedIncident.status === 'closed'}
                  className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedIncident.status === 'resolved' || selectedIncident.status === 'closed'
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  <i className="ri-edit-line mr-2"></i>
                  {selectedIncident.status === 'resolved' || selectedIncident.status === 'closed' ? 'Incident Completed' : 'Update Incident'}
                </button>
                <button
                  onClick={closeIncidentModal}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <i className="ri-close-line mr-2"></i>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignmentModal && selectedIncident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Reassign Incident #{selectedIncident.incident_id}
                </h2>
                <button
                  onClick={closeAssignmentModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Type</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="team"
                        checked={assignmentType === 'team'}
                        onChange={(e) => setAssignmentType(e.target.value as 'team' | 'staff')}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Team Assignment</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="staff"
                        checked={assignmentType === 'staff'}
                        onChange={(e) => setAssignmentType(e.target.value as 'team' | 'staff')}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Individual Staff Assignment</span>
                    </label>
                  </div>
                </div>

                {assignmentType === 'team' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Team</label>
                    <select
                      value={selectedTeamId || ''}
                      onChange={(e) => setSelectedTeamId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Clear Assignment</option>
                      {teams.map(team => (
                        <option key={team.id} value={team.id}>
                          {team.name} ({team.member_count} members)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {assignmentType === 'staff' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Staff</label>
                    <select
                      value={selectedStaffId || ''}
                      onChange={(e) => setSelectedStaffId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Clear Assignment</option>
                      {availableStaff.map(staff => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name} - {staff.position}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {emailStatus && (
                  <div className={`p-3 rounded-md ${
                    emailStatus.sent 
                      ? 'bg-green-50 border border-green-200 text-green-800' 
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}>
                    <div className="flex items-center">
                      <i className={`mr-2 ${emailStatus.sent ? 'ri-check-line' : 'ri-error-warning-line'}`}></i>
                      <span className="text-sm font-medium">
                        {emailStatus.sent ? 'Email notifications sent successfully' : 'Email notifications failed'}
                      </span>
                    </div>
                    {emailStatus.details && (
                      <div className="mt-2 text-xs">
                        {emailStatus.details.error && <p>Error: {emailStatus.details.error}</p>}
                        {emailStatus.details.teamName && <p>Team: {emailStatus.details.teamName}</p>}
                        {emailStatus.details.totalMembers && <p>Members: {emailStatus.details.totalMembers}</p>}
                        {emailStatus.details.emailsSent && <p>Sent: {emailStatus.details.emailsSent}</p>}
                        {emailStatus.details.emailsFailed && <p>Failed: {emailStatus.details.emailsFailed}</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={closeAssignmentModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={isAssigning}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!selectedIncident) return;
                    
                    if (assignmentType === 'team') {
                      handleAssignTeam(selectedIncident.incident_id, selectedTeamId);
                    } else {
                      handleAssignStaff(selectedIncident.incident_id, selectedStaffId);
                    }
                  }}
                  disabled={isAssigning}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
                    isAssigning
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isAssigning ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Assigning...
                    </>
                  ) : (
                    'Assign'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Incident Modal */}
      {showUpdateModal && selectedIncident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Update Incident #{selectedIncident.incident_id}
                </h2>
                <button
                  onClick={closeUpdateModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Status</label>
                  <div className="text-sm text-gray-900 mb-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(selectedIncident.status)}`}>
                      {getStatusText(selectedIncident.status)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Update Status</label>
                  <select
                    value={updateStatus}
                    onChange={(e) => setUpdateStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                  <textarea
                    value={updateNotes}
                    onChange={(e) => setUpdateNotes(e.target.value)}
                    placeholder="Add any notes about this update..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={closeUpdateModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!selectedIncident) return;
                    handleUpdateIncident(selectedIncident.incident_id, updateStatus, updateNotes);
                  }}
                  disabled={isUpdating || !updateStatus}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
                    isUpdating || !updateStatus
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isUpdating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    'Update Incident'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`px-4 py-3 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 ${
              notification.type === 'success' ? 'bg-green-500 text-white' :
              notification.type === 'error' ? 'bg-red-500 text-white' :
              notification.type === 'warning' ? 'bg-yellow-500 text-white' :
              'bg-blue-500 text-white'
            }`}
          >
            <div className="flex items-center">
              <i className={`mr-2 ${
                notification.type === 'success' ? 'ri-check-line' :
                notification.type === 'error' ? 'ri-error-warning-line' :
                notification.type === 'warning' ? 'ri-alert-line' :
                'ri-information-line'
              }`}></i>
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StaffIncidentsPage;
