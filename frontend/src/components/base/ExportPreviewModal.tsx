import React from 'react';

interface ExportPreviewModalProps {
  open: boolean;
  onClose: () => void;
  onExport: () => void;
  staff: any[];
  columns: { key: string; label: string }[];
  title?: string;
}

const ExportPreviewModal: React.FC<ExportPreviewModalProps> = ({ open, onClose, onExport, staff, columns, title }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title || 'Export Preview'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>
        <div className="p-6">
          <table className="w-full border">
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.key} className="px-4 py-2 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map((row, idx) => (
                <tr key={idx}>
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-2 border-b text-sm text-gray-900">{row[col.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
          <button onClick={onExport} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">Export to PDF</button>
        </div>
      </div>
    </div>
  );
};

export default ExportPreviewModal;
