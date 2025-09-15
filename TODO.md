# Status Update Fix - TODO

## Completed Tasks
- [x] Updated `userManagementApi.updateUserStatus` to accept `status: number` instead of `string`
- [x] Updated `staffManagementApi.updateStaffStatus` to accept `status: number` for consistency
- [x] Modified `handleStatusChange` in `page.tsx` to pass `newStatus` directly without string conversion
- [x] Verified no other usages of these functions in the codebase

## Next Steps
- [ ] Test the user status update functionality in the application
- [ ] Verify that status changes work correctly (Active/Inactive)
- [ ] Check if there are similar issues with other status-related API calls
- [ ] Monitor for any TypeScript errors after the changes

## Files Modified
- `frontend/src/utils/api.ts`
- `frontend/src/pages/admin/users/page.tsx`

## Summary of Changes
The issue was that the frontend was sending status values as strings ('active'/'inactive') but the backend expected numbers (0/1). Fixed by:
1. Changing API function parameter types from `string` to `number`
2. Removing the string conversion in the frontend call
3. Now sends 0 for inactive, 1 for active as expected by backend
