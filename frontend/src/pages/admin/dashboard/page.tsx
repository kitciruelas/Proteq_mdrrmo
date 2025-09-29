// ...existing code...
import React, { useState, useEffect } from 'react';
import { adminDashboardApi } from '../../../utils/api';
import BarChart from '../../../components/charts/BarChart';
import PieChart from '../../../components/charts/PieChart';
import StackedBarChart from '../../../components/charts/StackedBarChart';
import LineChart from '../../../components/charts/LineChart';

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

interface IncidentTypeData {
  incident_type: string;
  count: number;
}

interface PriorityData {
  priority: string;
  count: number;
}

interface MonthlyIncidentData {
  month: string;
  period?: string; // For backward compatibility with new API
  total_incidents: number;
  resolved_incidents: number;
  high_priority_incidents: number;
}

interface PeakHoursData {
  hour: number;
  incident_count: number;
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
  const [incidentTypes, setIncidentTypes] = useState<IncidentTypeData[]>([]);
  const [priorityData, setPriorityData] = useState<PriorityData[]>([]);
  const [locationIncidents, setLocationIncidents] = useState<Array<{ name: string; [key: string]: string | number }>>([]);
  const [monthlyIncidents, setMonthlyIncidents] = useState<MonthlyIncidentData[]>([]);
  const [trendsPeriod, setTrendsPeriod] = useState<'days' | 'weeks' | 'months'>('months');
  const [trendsLimit, setTrendsLimit] = useState<number>(12);
  const [peakHoursData, setPeakHoursData] = useState<PeakHoursData[]>([]);
  const [seasonalData, setSeasonalData] = useState<Array<{
    period: string;
    floods?: number;
    fires?: number;
    accidents?: number;
    otherIncidents?: number;
    allIncidents?: number;
    total: number;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // Fetch trends data when filter changes
  useEffect(() => {
    fetchTrendsData(trendsPeriod, trendsLimit);
  }, [trendsPeriod, trendsLimit]);

  // Helper function to format hour data for peak hours chart
  const formatPeakHoursData = (peakHours: PeakHoursData[]) => {
    const hourLabels = [
      '12 AM', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM',
      '6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM',
      '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM',
      '6 PM', '7 PM', '8 PM', '9 PM', '10 PM', '11 PM'
    ];

    return peakHours.map(item => ({
      name: hourLabels[item.hour] || `${item.hour}:00`,
      count: item.incident_count,
      percentage: 0 // Will be calculated if total is provided
    }));
  };

  const fetchTrendsData = async (period: 'days' | 'weeks' | 'months' = 'months', limit: number = 12) => {
    try {
      const trendsResponse = await adminDashboardApi.getMonthlyTrends(period, limit);
      if (trendsResponse.success) {
        // Map the API response to the expected interface format
        const mappedData = trendsResponse.trendsData.map(item => ({
          month: item.period, // Use period as month for compatibility
          period: item.period,
          total_incidents: item.total_incidents,
          resolved_incidents: item.resolved_incidents,
          high_priority_incidents: item.high_priority_incidents
        }));
        setMonthlyIncidents(mappedData);
      }
    } catch (error) {
      console.warn('Failed to fetch trends data:', error);
      setMonthlyIncidents([]);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch stats, overview, and analytics data
      const [statsResponse, overviewResponse, analyticsResponse] = await Promise.all([
        adminDashboardApi.getStats(),
        adminDashboardApi.getOverview(),
        adminDashboardApi.getAnalytics()
      ]);

      // Fetch trends data with current filter settings
      await fetchTrendsData(trendsPeriod, trendsLimit);

      // Try to fetch location data, but don't fail if it doesn't work
      let locationResponse = null;
      try {
        locationResponse = await adminDashboardApi.getLocationIncidents();
      } catch (error) {
        console.warn('Location incidents endpoint not available, using fallback data:', error);
        // Set empty data as fallback
        locationResponse = { success: true, locationIncidents: [] };
      }

      // Try to fetch seasonal patterns data, but don't fail if it doesn't work
      let seasonalResponse = null;
      try {
        seasonalResponse = await adminDashboardApi.getSeasonalPatterns();
      } catch (error) {
        console.warn('Seasonal patterns endpoint not available, using fallback data:', error);
        // Set empty data as fallback
        seasonalResponse = { success: true, seasonalData: [] };
      }

      if (statsResponse.success) {
        setStats({
          totalIncidents: statsResponse.stats.incidents.total_incidents,
          activeIncidents: statsResponse.stats.incidents.active_incidents,
          totalUsers: statsResponse.stats.users.total_users,
          totalStaff: statsResponse.stats.staff.total_staff,
          totalAlerts: statsResponse.stats.alerts.total_alerts,
          activeAlerts: statsResponse.stats.alerts.active_alerts
        });

        setRecentActivity(statsResponse.recentActivity || []);

        // Set trends based on response data
        if (statsResponse.trends) {
          // Example: calculate percentage change for incidents and users
          const incidentsTrendData = statsResponse.trends.incidents;
          const usersTrendData = statsResponse.trends.users;

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

      // Set incident types data from overview response
      if (overviewResponse.success) {
        setIncidentTypes(overviewResponse.overview.incidentTypes || []);
      }

      // Set priority data from analytics response
      if (analyticsResponse.success) {
        setPriorityData(analyticsResponse.analytics.incidentPriority || []);
        setMonthlyIncidents(analyticsResponse.analytics.monthlyIncidents || []);
        setPeakHoursData(analyticsResponse.analytics.peakHours || []);
      }

      // Set location incidents data from location response
      if (locationResponse && locationResponse.success) {
        setLocationIncidents(locationResponse.locationIncidents || []);
      } else {
        // Set empty data if location response failed
        setLocationIncidents([]);
      }

      // Set seasonal patterns data from seasonal response
      if (seasonalResponse && seasonalResponse.success) {
        setSeasonalData(seasonalResponse.seasonalData || []);
      } else {
        // Set empty data if seasonal response failed
        setSeasonalData([]);
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Common Incident Types Chart */}
        <BarChart
          data={incidentTypes.map(item => ({
            name: item.incident_type,
            count: item.count
          }))}
          title="Most Common Incident Types"
          dataKey="count"
          color="#ef4444"
          height={300}
        />

        {/* Priority Level Distribution Chart */}
        <PieChart
          data={priorityData.map(item => ({
            name: item.priority,
            count: item.count
          }))}
          title="Priority Level Distribution"
          dataKey="count"
          nameKey="name"
          height={300}
          colors={{
            low: "#10B981",
            moderate: "#FFD966",
            high: "#E67E22",
            critical: "#EF4444"
          }}
        />
      </div>

      {/* Monthly Trends Line Chart with Filter */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Incident Trends Analysis</h3>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Period:</label>
                <select
                  value={trendsPeriod}
                  onChange={(e) => setTrendsPeriod(e.target.value as 'days' | 'weeks' | 'months')}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Last:</label>
                <select
                  value={trendsLimit}
                  onChange={(e) => setTrendsLimit(parseInt(e.target.value))}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={7}>7</option>
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                  <option value={30}>30</option>
                </select>
                <span className="text-sm text-gray-600">{trendsPeriod}</span>
              </div>
              <button
                onClick={() => fetchTrendsData(trendsPeriod, trendsLimit)}
                className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
              >
                <i className="ri-refresh-line mr-1"></i>
                Refresh
              </button>
            </div>
          </div>
          <LineChart
            data={monthlyIncidents.map(item => ({
              date: item.month || item.period || 'Unknown',
              count: item.total_incidents || 0
            }))}
            title={`Incident Trends (Last ${trendsLimit} ${trendsPeriod})`}
            color="#10b981"
            height={350}
          />
        </div>
        {monthlyIncidents.length === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <i className="ri-information-line text-green-500 text-lg mr-3"></i>
              <div>
                <h4 className="text-green-800 font-medium">Trends Analytics</h4>
                <p className="text-green-600 text-sm mt-1">
                  This line chart shows incident volume trends with customizable time periods.
                  Use the filters above to view data by days, weeks, or months. It helps identify patterns and peak periods.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Peak Hours Analysis */}
      <div className="grid grid-cols-1 gap-6">
        <BarChart
          data={formatPeakHoursData(peakHoursData)}
          title="Peak Hours Analysis (Last 30 Days)"
          dataKey="count"
          color="#f59e0b"
          height={350}
        />
        {peakHoursData.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center">
              <i className="ri-information-line text-amber-500 text-lg mr-3"></i>
              <div>
                <h4 className="text-amber-800 font-medium">Peak Hours Analysis</h4>
                <p className="text-amber-600 text-sm mt-1">
                  This bar chart shows incident distribution by hour of day over the past 30 days.
                  It helps identify peak hours when incidents are most likely to occur, enabling better resource allocation.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Barangay-based Risk Analysis Chart */}
      <div className="grid grid-cols-1 gap-6">
        {(() => {
          // Debug: Log the actual data structure
          console.log('Location incidents data:', locationIncidents);

          // Get all possible incident type keys from the data
          const allKeys: string[] = [];
          locationIncidents.forEach(item => {
            Object.keys(item).forEach(key => {
              if (key !== 'name' && !allKeys.includes(key)) {
                allKeys.push(key);
              }
            });
          });

          console.log('Available incident type keys:', allKeys);

          return (
            <StackedBarChart
              data={locationIncidents.length > 0 ? locationIncidents : []}
              title="Risky Areas by Barangay"
              stackKeys={allKeys}
              height={400}
            />
          );
        })()}
        {locationIncidents.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <i className="ri-information-line text-blue-500 text-lg mr-3"></i>
              <div>
                <h4 className="text-blue-800 font-medium">Barangay-based Risk Analysis</h4>
                <p className="text-blue-600 text-sm mt-1">
                  This chart shows incident distribution by barangay. Barangay names are extracted from incident descriptions.
                  If no data appears, ensure incidents have barangay information in their descriptions or check the backend server.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Seasonal Patterns Analysis Chart */}
      <div className="grid grid-cols-1 gap-6">
        <BarChart
          data={seasonalData.map(item => ({
            name: item.period,
            floods: item.floods || 0,
            fires: item.fires || 0,
            accidents: item.accidents || 0,
            otherIncidents: item.otherIncidents || 0,
            allIncidents: item.allIncidents || 0
          }))}
          title="Seasonal Incident Patterns"
          stacked={true}
          stackKeys={['floods', 'fires', 'accidents', 'otherIncidents', 'allIncidents']}
          height={400}
        />
        {seasonalData.length === 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center">
              <i className="ri-information-line text-purple-500 text-lg mr-3"></i>
              <div>
                <h4 className="text-purple-800 font-medium">Seasonal Patterns Analysis</h4>
                <p className="text-purple-600 text-sm mt-1">
                  This clustered column chart compares incident patterns across different seasons:
                  floods during rainy season (June-November), fires during summer (March-May),
                  and accidents during holiday periods. Data covers the last 2 years.
                </p>
              </div>
            </div>
          </div>
        )}
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

        
      </div>

      
    </div>
  );
};

export default AdminDashboard;
