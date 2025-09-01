// New alerts page with updated schema
import React, { useState, useEffect } from 'react';
import type { Alert } from '../../../api/alerts';
import { alertsApi } from '../../../api/alerts';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ConfirmModal } from '../../../components/base/Modal';
import { useToast } from '../../../components/base/Toast';

// Setup alert marker icon
const alertMarkerIcon = L.divIcon({
  html: `
    <div style="
      background-color: #ef4444;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">
    </div>
  `,
  className: 'alert-location-marker',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAlert, setNewAlert] = useState({
    title: '',
    description: '',
    alert_type: 'weather',
    alert_severity: 'info' as Alert['alert_severity'],
    latitude: null as number | null,
    longitude: null as number | null,
    radius_km: 5,
    recipients: [] as string[]
  });

  // Map state
  const [mapCenter] = useState<[number, number]>([13.7565, 121.3851]); // San Juan, Batangas
  const [mapZoom] = useState(13);

  const { showToast } = useToast();

  useEffect(() => {
    fetchAlerts();
  }, []);

  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        const { lat, lng } = e.latlng;
        setNewAlert(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng
        }));
      },
    });
    return null;
  };

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await alertsApi.getAlerts();
      if (response.success) {
        setAlerts(response.alerts);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = async () => {
    try {
      if (!newAlert.title || !newAlert.description) {
        showToast({ type: 'warning', message: 'Please fill in all required fields' });
        return;
      }

      const alertData = {
        title: newAlert.title,
        message: newAlert.description,
        type: newAlert.alert_type as Alert['alert_type'],
        priority: 'medium' as Alert['priority'],
        recipients: newAlert.recipients,
        latitude: newAlert.latitude ?? 13.7565,
        longitude: newAlert.longitude ?? 121.3851,
        radius_km: newAlert.radius_km
      };

      const response = await alertsApi.createAlert(alertData);

      if (response.success) {
        await fetchAlerts();
        setNewAlert({
          title: '',
          description: '',
          alert_type: 'weather',
          alert_severity: 'info',
          latitude: null,
          longitude: null,
          radius_km: 5,
          recipients: []
        });
        setShowCreateModal(false);
        showToast({ type: 'success', message: 'Alert created successfully' });
      }
    } catch (error) {
      console.error('Error creating alert:', error);
      showToast({ type: 'error', message: 'Failed to create alert' });
    }
  };

  const handleSendAlert = async (alertId: number) => {
    try {
      const response = await alertsApi.sendAlert(alertId);
      if (response.success) {
        await fetchAlerts();
        showToast({ type: 'success', message: 'Alert sent successfully' });
      }
    } catch (error) {
      console.error('Error sending alert:', error);
      showToast({ type: 'error', message: 'Failed to send alert' });
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [alertIdToDelete, setAlertIdToDelete] = useState<number | null>(null);

  const requestDeleteAlert = (alertId: number) => {
    setAlertIdToDelete(alertId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAlert = async () => {
    if (alertIdToDelete == null) return;
    try {
      const response = await alertsApi.deleteAlert(alertIdToDelete);
      if (response.success) {
        await fetchAlerts();
        showToast({ type: 'success', message: 'Alert deleted successfully' });
      } else {
        showToast({ type: 'error', message: 'Failed to delete alert' });
      }
    } catch (error) {
      console.error('Error deleting alert:', error);
      showToast({ type: 'error', message: 'Failed to delete alert' });
    } finally {
      setShowDeleteConfirm(false);
      setAlertIdToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Alert Management</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Create Alert
        </button>
      </div>

      <div className="grid gap-6 mb-6 md:grid-cols-3">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Active Alerts</h3>
          <p className="text-2xl font-bold">{alerts.filter(a => a.status === 'active').length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Emergency Alerts</h3>
          <p className="text-2xl font-bold text-red-600">
            {alerts.filter(a => a.alert_severity === 'emergency').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Total Alerts</h3>
          <p className="text-2xl font-bold">{alerts.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {alerts.map(alert => (
          <div key={alert.id} className="p-4 border-b last:border-b-0 hover:bg-gray-50">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{alert.title}</h3>
                <p className="text-gray-600 mt-1">{alert.description}</p>
                <div className="flex gap-2 mt-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    alert.alert_severity === 'emergency' ? 'bg-red-100 text-red-700' :
                    alert.alert_severity === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {alert.alert_severity.toUpperCase()}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    alert.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {alert.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  Created: {new Date(alert.created_at).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-2">
                {alert.status === 'active' && (
                  <button
                    onClick={() => handleSendAlert(alert.id)}
                    className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                  >
                    Send
                  </button>
                )}
                <button
                  onClick={() => requestDeleteAlert(alert.id)}
                  className="bg-red-100 text-red-600 px-3 py-1 rounded text-sm hover:bg-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Create New Alert</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={newAlert.title}
                  onChange={(e) => setNewAlert(prev => ({ ...prev, title: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={newAlert.alert_type}
                  onChange={(e) => setNewAlert(prev => ({ ...prev, alert_type: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="weather">Weather</option>
                  <option value="earthquake">Earthquake</option>
                  <option value="flood">Flood</option>
                  <option value="fire">Fire</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Severity</label>
                <select
                  value={newAlert.alert_severity}
                  onChange={(e) => setNewAlert(prev => ({ ...prev, alert_severity: e.target.value as Alert['alert_severity'] }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="info">Information</option>
                  <option value="warning">Warning</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newAlert.description}
                  onChange={(e) => setNewAlert(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <div className="h-64 rounded-lg overflow-hidden border border-gray-300">
                  <MapContainer
                    center={mapCenter}
                    zoom={mapZoom}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <MapClickHandler />
                    {newAlert.latitude && newAlert.longitude && (
                      <>
                        <Marker
                          position={[newAlert.latitude, newAlert.longitude]}
                          icon={alertMarkerIcon}
                        />
                        <Circle
                          center={[newAlert.latitude, newAlert.longitude]}
                          radius={newAlert.radius_km * 1000}
                          pathOptions={{
                            color: '#ef4444',
                            fillColor: '#ef4444',
                            fillOpacity: 0.1,
                          }}
                        />
                      </>
                    )}
                  </MapContainer>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Alert Radius (km)</label>
                <input
                  type="number"
                  value={newAlert.radius_km}
                  onChange={(e) => setNewAlert(prev => ({ ...prev, radius_km: Number(e.target.value) }))}
                  min={0.1}
                  max={50}
                  step={0.1}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAlert}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Alert
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setAlertIdToDelete(null); }}
        onConfirm={confirmDeleteAlert}
        title="Delete Alert"
        message="Are you sure you want to delete this alert? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="secondary"
        icon="ri-delete-bin-line"
        iconColor="text-red-600"
      />
    </div>
  );
};

export default AlertsPage;
