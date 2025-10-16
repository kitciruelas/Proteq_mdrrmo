# Real-Time Notifications Implementation

## Overview
This implementation adds real-time notifications to the PROTEQ-MDRRMO system, allowing admin users to receive instant notifications when new incidents or welfare reports are submitted without needing to refresh the page.

## Features

### ✅ Real-Time Incident Notifications
- **Automatic Updates**: New incident reports appear instantly in the admin dashboard
- **No Page Refresh**: Notifications update in real-time via WebSocket connection
- **Browser Notifications**: Desktop notifications for new incidents (with user permission)
- **Visual Indicators**: Live connection status and new notification counters

### ✅ Real-Time Welfare Notifications
- **Welfare Alerts**: Instant notifications when users report "needs help" status
- **User Information**: Includes user details in welfare notifications
- **Priority Handling**: Welfare reports are treated as high-priority notifications

### ✅ WebSocket Connection Management
- **Auto-Reconnection**: Automatically reconnects if connection is lost
- **Connection Status**: Visual indicator showing connection state (Live/Connecting/Offline)
- **Token Authentication**: Secure WebSocket connections with JWT token validation

## Technical Implementation

### Frontend Components

#### 1. WebSocket Service (`frontend/src/services/websocketService.ts`)
- Singleton WebSocket service for managing real-time connections
- Automatic reconnection with exponential backoff
- Event-based message handling
- Connection state management

#### 2. AdminLayout Component (`frontend/src/components/AdminLayout.tsx`)
- Real-time notification handlers for incidents and welfare reports
- WebSocket connection initialization on admin login
- Browser notification integration
- Visual indicators for new notifications

### Backend Components

#### 1. Enhanced WebSocket Server (`backend/server.js`)
- JWT token authentication for WebSocket connections
- User type-based broadcasting (admin, staff, user)
- Connection management and cleanup
- Global broadcasting functions

#### 2. Incident Routes (`backend/routes/incidentRoutes.js`)
- Real-time broadcasting when new incidents are created
- Support for both authenticated and guest incident reports
- Comprehensive incident data in notifications

#### 3. Welfare Routes (`backend/routes/welfareRoutes.js`)
- Real-time broadcasting for welfare reports with "needs help" status
- User information included in welfare notifications

## Usage

### For Admin Users
1. **Login**: WebSocket connection is automatically established upon admin login
2. **Real-Time Updates**: New incidents and welfare reports appear instantly
3. **Browser Notifications**: Desktop notifications for new reports (requires permission)
4. **Connection Status**: Monitor WebSocket connection status in the notification panel

### Connection States
- 🟢 **Live**: WebSocket connected and receiving real-time updates
- 🟡 **Connecting**: Attempting to establish WebSocket connection
- 🔴 **Offline**: WebSocket disconnected, falling back to manual refresh

### Notification Types
- **Incident Reports**: New incidents from registered users and guests
- **Welfare Reports**: Users reporting "needs help" status
- **Priority Indicators**: High-priority incidents and welfare reports highlighted

## Configuration

### Environment Variables
```env
# WebSocket server runs on the same port as the HTTP server
# Default: ws://localhost:5000 (or your configured port)
```

### Browser Notifications
- Users are prompted to allow browser notifications on first visit
- Notifications include incident type, location, and timestamp
- Unique tags prevent duplicate notifications

## Security Features

### Authentication
- JWT token validation for WebSocket connections
- User type verification (admin, staff, user)
- Automatic disconnection on invalid tokens

### Data Validation
- Input validation for all notification data
- Sanitized user information in notifications
- Error handling for malformed messages

## Performance Considerations

### Connection Management
- Automatic cleanup of disconnected clients
- Efficient message broadcasting to specific user types
- Minimal memory footprint for connection tracking

### Notification Optimization
- Duplicate prevention for existing notifications
- Limited notification history (10 incidents, 5 welfare reports)
- Efficient state updates with React hooks

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check if backend server is running
   - Verify JWT token is valid
   - Check browser console for connection errors

2. **No Real-Time Updates**
   - Verify WebSocket connection status in notification panel
   - Check if user has admin privileges
   - Ensure backend broadcasting functions are working

3. **Browser Notifications Not Working**
   - Check browser notification permissions
   - Verify HTTPS connection (required for notifications)
   - Test with different browsers

### Debug Information
- WebSocket connection logs in browser console
- Backend broadcasting logs in server console
- Connection status indicator in admin dashboard

## Future Enhancements

### Planned Features
- [ ] Notification sound alerts
- [ ] Custom notification preferences
- [ ] Notification history persistence
- [ ] Mobile push notifications
- [ ] Notification categories and filtering

### Performance Improvements
- [ ] Message queuing for offline users
- [ ] Notification batching for high-volume periods
- [ ] Connection pooling optimization
- [ ] Message compression for large payloads

## Support

For technical support or feature requests related to real-time notifications, please refer to the development team or create an issue in the project repository.
