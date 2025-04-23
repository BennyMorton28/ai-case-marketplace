import { Session } from 'next-auth';

// Define the case/demo access structure
export interface AccessControlEntry {
  userId: string;
  resourceId: string; // Can be a case ID, demo ID, etc.
  resourceType: 'case' | 'demo';
  permissions: {
    view: boolean;
    edit?: boolean;
  };
}

// Mock database of access controls (replace with actual DB implementation)
// In a real app, this would be stored in your database (PostgreSQL)
export let accessControlList: AccessControlEntry[] = [];

/**
 * Check if a user has access to a specific resource
 */
export function checkAccess(userId: string, resourceId: string, resourceType: 'case' | 'demo', permission: 'view' | 'edit' = 'view'): boolean {
  // Admin users always have access to everything
  // In a real implementation, you'd check the user's Cognito groups or claims
  
  // Find the access control entry for this user and resource
  const entry = accessControlList.find(
    (ace) => ace.userId === userId && ace.resourceId === resourceId && ace.resourceType === resourceType
  );
  
  // If no entry exists, deny access
  if (!entry) return false;
  
  // Check the specific permission
  if (permission === 'view') {
    return entry.permissions.view;
  } else if (permission === 'edit') {
    return entry.permissions.edit || false;
  }
  
  return false;
}

/**
 * Grant access to a user for a specific resource
 */
export function grantAccess(userId: string, resourceId: string, resourceType: 'case' | 'demo', permissions: { view: boolean; edit?: boolean }): void {
  // First remove any existing access control entries for this user and resource
  accessControlList = accessControlList.filter(
    (ace) => !(ace.userId === userId && ace.resourceId === resourceId && ace.resourceType === resourceType)
  );
  
  // Add the new access control entry
  accessControlList.push({
    userId,
    resourceId,
    resourceType,
    permissions,
  });
}

/**
 * Revoke access to a user for a specific resource
 */
export function revokeAccess(userId: string, resourceId: string, resourceType: 'case' | 'demo'): void {
  accessControlList = accessControlList.filter(
    (ace) => !(ace.userId === userId && ace.resourceId === resourceId && ace.resourceType === resourceType)
  );
}

/**
 * Get all resources a user has access to
 */
export function getUserResources(userId: string, resourceType?: 'case' | 'demo'): string[] {
  return accessControlList
    .filter((ace) => 
      ace.userId === userId && 
      ace.permissions.view && 
      (resourceType ? ace.resourceType === resourceType : true)
    )
    .map((ace) => ace.resourceId);
}

/**
 * Get all users who have access to a specific resource
 */
export function getResourceUsers(resourceId: string, resourceType: 'case' | 'demo'): string[] {
  return accessControlList
    .filter((ace) => 
      ace.resourceId === resourceId && 
      ace.resourceType === resourceType && 
      ace.permissions.view
    )
    .map((ace) => ace.userId);
} 