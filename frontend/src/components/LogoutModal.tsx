import React from 'react';
import Button from './base/Button';
import Avatar from './base/Avatar';
import { UserData } from '../utils/auth';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userData?: UserData;
  isLoading?: boolean;
}

export default function LogoutModal({
  isOpen,
  onClose,
  onConfirm,
  userData,
  isLoading = false
}: LogoutModalProps) {
  if (!isOpen) return null;

  const userName = userData?.firstName && userData?.lastName 
    ? `${userData.firstName} ${userData.lastName}`
    : userData?.email || 'User';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-red-500 to-pink-600 px-6 py-8 text-center">
            <div className="mb-4">
              <Avatar
                name={userName}
                email={userData?.email}
                size="xl"
                className="mx-auto ring-4 ring-white/30"
              />
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Sign Out</h3>
            <p className="text-red-100 text-sm">
              Goodbye, {userData?.firstName || 'there'}!
            </p>
          </div>
          
          {/* Content */}
          <div className="p-6">
            {/* User Info Card */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="ri-user-line text-blue-600"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{userName}</p>
                  <p className="text-sm text-gray-600 truncate">{userData?.email}</p>
                </div>
              </div>
              
              {/* Session Info */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <i className="ri-time-line"></i>
                  <span>Session active</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Online</span>
                </div>
              </div>
            </div>

            {/* Warning Message */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i className="ri-information-line text-amber-600 text-sm"></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-800 mb-1">
                    You're about to sign out
                  </p>
                  <p className="text-xs text-amber-700">
                    You'll need to log in again to access your account and continue using the emergency response system.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-6">
              <p className="text-xs font-medium text-gray-700 mb-3">Before you go:</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                  <i className="ri-save-line text-blue-600 text-sm"></i>
                  <span className="text-xs text-blue-700">Data saved</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                  <i className="ri-shield-check-line text-green-600 text-sm"></i>
                  <span className="text-xs text-green-700">Secure session</span>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex flex-col gap-3">
              <Button
                variant="secondary"
                size="lg"
                onClick={onConfirm}
                disabled={isLoading}
                fullWidth
              >
                {isLoading ? (
                  <>
                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                    Signing out...
                  </>
                ) : (
                  <>
                    <i className="ri-logout-box-line mr-2"></i>
                    Yes, Sign Out
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={onClose}
                disabled={isLoading}
                fullWidth
              >
                <i className="ri-arrow-left-line mr-2"></i>
                Stay Logged In
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
