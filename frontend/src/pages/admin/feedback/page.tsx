import React, { useState, useEffect } from 'react';
import { feedbackApi } from '../../../utils/api';
import Card from '../../../components/base/Card';
import Button from '../../../components/base/Button';
import ExportPreviewModal from '../../../components/base/ExportPreviewModal';
import type { ExportColumn } from '../../../utils/exportUtils';
import ExportUtils from '../../../utils/exportUtils';
import { useToast } from '../../../components/base/Toast';

interface Feedback {
  id: number;
  message: string;
  rating: number | null;
  created_at: string;
  updated_at: string;
  user_info: {
    id: number;
    name: string;
    email: string;
    type: 'user' | 'staff' | 'admin';
    position?: string;
    department?: string;
  };
}

const AdminFeedbackPage: React.FC = () => {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<'all' | 'user' | 'staff'>('all');
  const toast = useToast();

  const exportColumns: ExportColumn[] = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'type', label: 'Type' },
    { key: 'message', label: 'Message' },
    { key: 'rating', label: 'Rating', format: (value) => value ? `${value}/5` : 'N/A' },
    { key: 'created_at', label: 'Created At', format: ExportUtils.formatDateTime },
  ];

  const flattenedData = feedbackList.map(fb => ({
    name: fb.user_info.name,
    email: fb.user_info.email,
    type: fb.user_info.type,
    message: fb.message,
    rating: fb.rating,
    created_at: fb.created_at,
  }));

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await feedbackApi.getFeedback({ page: 1, limit: 50 });
      if (response.success) {
        setFeedbackList(response.feedback);
      } else {
        setError('Failed to fetch feedback');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Feedback</h1>
          <p className="text-gray-600 mt-1">View and manage user feedback</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchFeedback}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="ri-refresh-line mr-2"></i>
            Refresh
          </button>
          <button
            onClick={() => setExportModalOpen(true)}
            disabled={loading || feedbackList.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="ri-download-line mr-2"></i>
            Export Feeback
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <i className="ri-error-warning-line text-red-400 mr-3 mt-0.5"></i>
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Feedback List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : feedbackList.length === 0 ? (
          <div className="p-12 text-center">
            <i className="ri-chat-1-line text-4xl text-gray-400 mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No feedback available</h3>
            <p className="text-gray-600">No user feedback has been submitted yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {feedbackList.map((fb) => (
              <div key={fb.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <i className="ri-user-line text-blue-600"></i>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-sm font-medium text-gray-900">{fb.user_info.name}</span>
                      {fb.user_info.type === 'user' && (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                          {fb.user_info.type.charAt(0).toUpperCase() + fb.user_info.type.slice(1)}
                        </span>
                      )}
                      {fb.user_info.type === 'staff' && (
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {fb.user_info.type.charAt(0).toUpperCase() + fb.user_info.type.slice(1)}
                        </span>
                      )}
                    
                      {fb.user_info.type === 'staff' && fb.user_info.department && (
                        <>
                          <span className="text-sm text-gray-500">•</span>
                          <span className="text-sm text-blue-600">{fb.user_info.department.charAt(0).toUpperCase() + fb.user_info.department.slice(1)}</span>
                        </>
                      )}
                      {fb.rating !== null && (
                        <>
                          <span className="text-sm text-gray-500">•</span>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <i
                                key={i}
                                className={`ri-star-${i < fb.rating! ? 'fill' : 'line'} text-yellow-400 text-sm`}
                              ></i>
                            ))}
                            <span className="ml-1 text-sm text-gray-600">({fb.rating})</span>
                          </div>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{fb.message}</p>
                    <div className="flex items-center text-xs text-gray-500">
                      <span>
                        <i className="ri-time-line mr-1"></i>
                        {new Date(fb.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )} 
      </div>

      <ExportPreviewModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExportCSV={() => {
          ExportUtils.exportToCSV(flattenedData, exportColumns, { filename: 'feedback', title: 'User Feedback' });
          setExportModalOpen(false);
          toast.showToast({ type: 'success', message: 'Feedback exported to CSV successfully!' });
        }}
        onExportExcel={() => {
          ExportUtils.exportToExcel(flattenedData, exportColumns, { filename: 'feedback', title: 'User Feedback' });
          setExportModalOpen(false);
          toast.showToast({ type: 'success', message: 'Feedback exported to Excel successfully!' });
        }}
        onExportPDF={() => {
          ExportUtils.exportToPDF(flattenedData, exportColumns, { filename: 'feedback', title: 'User Feedback' });
          setExportModalOpen(false);
          toast.showToast({ type: 'success', message: 'Feedback exported to PDF successfully!' });
        }}
        data={flattenedData}
        columns={exportColumns.map(c => ({ key: c.key, label: c.label }))}
        title="Export User Feedback"
      />
    </div>
  );
};

export default AdminFeedbackPage;
