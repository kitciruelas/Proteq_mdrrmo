// ...existing code...
import React, { useState, useEffect } from 'react';
import { adminDashboardApi } from '../../../utils/api';

interface DashboardStats {
  totalIncidents: number;
  activeIncidents: number;
  totalUsers: number;
  totalStaff: number;
  totalAlerts: number;
  activeAlerts: number;
}

interface RecentActivity {
  action: string;
  details: string;
  created_at: string;
  user_type: string;
  user_id: number;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalIncidents: 0,
    activeIncidents: 0,
    totalUsers: 0,
    totalStaff: 0,
    totalAlerts: 0,
    activeAlerts: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [incidentTrend, setIncidentTrend] = useState<string | null>(null);
  const [userTrend, setUserTrend] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminDashboardApi.getStats();

      if (response.success) {
        setStats({
          totalIncidents: response.stats.incidents.total_incidents,
          activeIncidents: response.stats.incidents.active_incidents,
          totalUsers: response.stats.users.total_users,
          totalStaff: response.stats.staff.total_staff,
          totalAlerts: response.stats.alerts.total_alerts,
          activeAlerts: response.stats.alerts.active_alerts
        });

        setRecentActivity(response.recentActivity || []);

        // Set trends based on response data
        if (response.trends) {
          // Example: calculate percentage change for incidents and users
          const incidentsTrendData = response.trends.incidents;
          const usersTrendData = response.trends.users;

          if (incidentsTrendData && incidentsTrendData.length >= 2) {
            const latest = incidentsTrendData[incidentsTrendData.length - 1].count;
            const previous = incidentsTrendData[incidentsTrendData.length - 2].count;
            const change = previous === 0 ? 0 : ((latest - previous) / previous) * 100;
            setIncidentTrend(`${change >= 0 ? '+' : ''}${change.toFixed(1)}% from last period`);
          } else {
            setIncidentTrend(null);
          }

          if (usersTrendData && usersTrendData.length >= 2) {
            const latest = usersTrendData[usersTrendData.length - 1].count;
            const previous = usersTrendData[usersTrendData.length - 2].count;
            const change = previous === 0 ? 0 : ((latest - previous) / previous) * 100;
            setUserTrend(`${change >= 0 ? '+' : ''}${change.toFixed(1)}% from last period`);
          } else {
            setUserTrend(null);
          }
        } else {
          setIncidentTrend(null);
          setUserTrend(null);
        }
      } else {
        setError('Failed to fetch dashboard statistics');
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: number;
    icon: string;
    color: string;
    trend?: string;
  }> = ({ title, value, icon, color, trend }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value?.toLocaleString() || '0'}</p>
          {trend && (
            <p className="text-sm text-green-600 mt-1">
              <i className="ri-arrow-up-line mr-1"></i>
              {trend}
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
          <i className={`${icon} text-xl text-white`}></i>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <i className="ri-error-warning-line text-red-500 text-xl mr-3"></i>
          <div>
            <h3 className="text-red-800 font-medium">Error Loading Dashboard</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <button
              onClick={fetchDashboardStats}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Analytics</h1>
          <p className="text-gray-600 mt-1">Overview of emergency management system</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDashboardStats}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className={`ri-refresh-line mr-2 ${loading ? 'animate-spin' : ''}`}></i>
            Refresh Data
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Incidents"
          value={stats.totalIncidents}
          icon="ri-error-warning-line"
          color="bg-red-500"
          trend={incidentTrend || undefined}
        />
        <StatCard
          title="Active Incidents"
          value={stats.activeIncidents}
          icon="ri-alarm-warning-line"
          color="bg-orange-500"
        />
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon="ri-user-line"
          color="bg-blue-500"
          trend={userTrend || undefined}
        />
        <StatCard
          title="Staff Members"
          value={stats.totalStaff}
          icon="ri-team-line"
          color="bg-green-500"
        />
        <StatCard
          title="Total Alerts"
          value={stats.totalAlerts}
          icon="ri-notification-line"
          color="bg-purple-500"
        />
        <StatCard
          title="Active Alerts"
          value={stats.activeAlerts}
          icon="ri-alarm-warning-line"
          color="bg-indigo-500"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Incidents */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Incidents</h3>
            <a href="/admin/incidents/view" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All
            </a>
          </div>
          <div className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      activity.action.includes('incident') ? 'bg-red-500' :
                      activity.action.includes('alert') ? 'bg-orange-500' : 'bg-blue-500'
                    }`}></div>
                    <div>
                      <p className="font-medium text-gray-900 capitalize">{activity.action.replace('_', ' ')}</p>
                      <p className="text-sm text-gray-600">{activity.details}</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(activity.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <i className="ri-inbox-line text-3xl mb-2"></i>
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
          <div className="space-y-4">
            {[
              { name: 'Emergency Alert System', status: 'Online', color: 'bg-green-500' },
              { name: 'GPS Tracking', status: 'Online', color: 'bg-green-500' },
              { name: 'Communication Network', status: 'Online', color: 'bg-green-500' },
              { name: 'Database Backup', status: 'Scheduled', color: 'bg-blue-500' }
            ].map((system, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${system.color}`}></div>
                  <span className="text-gray-900">{system.name}</span>
                </div>
                <span className="text-sm text-gray-600">{system.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex flex-col items-center p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
            <i className="ri-alarm-warning-line text-2xl text-red-600 mb-2"></i>
            <span className="text-sm font-medium text-red-700">Send Alert</span>
          </button>
          <button className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
            <i className="ri-map-pin-add-line text-2xl text-blue-600 mb-2"></i>
            <span className="text-sm font-medium text-blue-700">Add Location</span>
          </button>
          <button className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
            <i className="ri-user-add-line text-2xl text-green-600 mb-2"></i>
            <span className="text-sm font-medium text-green-700">Add Staff</span>
          </button>
          <button className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
            <i className="ri-file-chart-line text-2xl text-purple-600 mb-2"></i>
            <span className="text-sm font-medium text-purple-700">Generate Report</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
