import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAuthState } from '../../../utils/auth';
import { incidentsApi } from '../../../utils/api';

interface Incident {
  incident_id: number;
  incident_type: string;
  description: string;
  location: string;
  status: string;
  priority_level: string;
  date_reported: string;
}

interface DashboardStats {
  totalIncidents: number;
  pendingIncidents: number;
  inProgressIncidents: number;
  resolvedIncidents: number;
  criticalIncidents: number;
  highPriorityIncidents: number;
}

const StaffDashboardPage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalIncidents: 0,
    pendingIncidents: 0,
    inProgressIncidents: 0,
    resolvedIncidents: 0,
    criticalIncidents: 0,
    highPriorityIncidents: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  const authState = getAuthState();
  const currentStaffId = authState.userData?.id || authState.userData?.staff_id || authState.userData?.user_id;
  
  console.log('🔐 Auth state:', authState);
  console.log('👤 Current staff ID:', currentStaffId);

  useEffect(() => {
    if (currentStaffId) {
      fetchIncidents();
    }
    
    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, [currentStaffId]);

  useEffect(() => {
    calculateStats();
    setRecentIncidents(incidents.slice(0, 5)); // Show last 5 incidents
  }, [incidents]);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching incidents for staff ID:', currentStaffId);
      const response = await incidentsApi.getIncidents();
      
      if (response.success && response.incidents) {
        console.log('📋 All incidents:', response.incidents);
        // Filter incidents assigned to current staff member
        const assignedIncidents = response.incidents.filter((incident: any) => {
          console.log('🔍 Checking incident:', incident.incident_id, 'assigned_staff_id:', incident.assigned_staff_id, 'currentStaffId:', currentStaffId);
          return incident.assigned_staff_id === currentStaffId;
        });
        console.log('✅ Assigned incidents:', assignedIncidents);
        setIncidents(assignedIncidents);
      }
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const total = incidents.length;
    const pending = incidents.filter(incident => incident.status === 'pending').length;
    const inProgress = incidents.filter(incident => incident.status === 'in_progress').length;
    const resolved = incidents.filter(incident => incident.status === 'resolved').length;
    const critical = incidents.filter(incident => incident.priority_level === 'critical').length;
    const highPriority = incidents.filter(incident => incident.priority_level === 'high').length;

    setStats({
      totalIncidents: total,
      pendingIncidents: pending,
      inProgressIncidents: inProgress,
      resolvedIncidents: resolved,
      criticalIncidents: critical,
      highPriorityIncidents: highPriority
    });
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

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {getGreeting()}, {authState.userData?.name}!
            </h1>
            <p className="text-blue-100 text-lg">
              Welcome to your emergency response dashboard
            </p>
            <p className="text-blue-200 text-sm mt-2">
              {currentTime.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })} • {currentTime.toLocaleTimeString()}
            </p>
          </div>
          <div className="hidden md:block">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <i className="ri-shield-check-line text-3xl"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Incidents */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <i className="ri-alert-line text-blue-600 text-2xl"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Incidents</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalIncidents}</p>
            </div>
          </div>
        </div>

        {/* Pending Incidents */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <i className="ri-time-line text-yellow-600 text-2xl"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-3xl font-bold text-gray-900">{stats.pendingIncidents}</p>
            </div>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <i className="ri-loader-4-line text-blue-600 text-2xl"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-3xl font-bold text-gray-900">{stats.inProgressIncidents}</p>
            </div>
          </div>
        </div>

        {/* Critical Incidents */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <i className="ri-error-warning-line text-red-600 text-2xl"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Critical</p>
              <p className="text-3xl font-bold text-gray-900">{stats.criticalIncidents}</p>
            </div>
          </div>
        </div>
      </div>



      {/* Recent Incidents */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">Recent Incidents</h3>
            <Link
              to="/staff/incidents"
              className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
            >
              View All
              <i className="ri-arrow-right-line ml-1"></i>
            </Link>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {recentIncidents.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-inbox-line text-3xl text-gray-400"></i>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No incidents yet</h3>
              <p className="text-gray-600">You don't have any assigned incidents at the moment.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Incident
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentIncidents.map((incident) => (
                  <tr key={incident.incident_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {incident.incident_type}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {incident.description}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{incident.location}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(incident.priority_level)}`}>
                        {incident.priority_level.charAt(0).toUpperCase() + incident.priority_level.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(incident.status)}`}>
                        {getStatusText(incident.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(incident.date_reported).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Emergency Contacts */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Emergency Contacts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-center p-4 border border-gray-200 rounded-lg">
            <div className="p-2 bg-red-100 rounded-lg mr-3">
              <i className="ri-phone-line text-red-600"></i>
            </div>
            <div>
              <p className="font-medium text-gray-900">Emergency Hotline</p>
              <p className="text-sm text-gray-600">911</p>
            </div>
          </div>
          <div className="flex items-center p-4 border border-gray-200 rounded-lg">
            <div className="p-2 bg-blue-100 rounded-lg mr-3">
              <i className="ri-building-line text-blue-600"></i>
            </div>
            <div>
              <p className="font-medium text-gray-900">MDRRMO Office</p>
              <p className="text-sm text-gray-600">(123) 456-7890</p>
            </div>
          </div>
          <div className="flex items-center p-4 border border-gray-200 rounded-lg">
            <div className="p-2 bg-green-100 rounded-lg mr-3">
              <i className="ri-user-line text-green-600"></i>
            </div>
            <div>
              <p className="font-medium text-gray-900">Supervisor</p>
              <p className="text-sm text-gray-600">(123) 456-7891</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboardPage;
