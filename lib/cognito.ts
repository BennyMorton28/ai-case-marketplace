import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { CognitoUser, CognitoUserPool, AuthenticationDetails } from 'amazon-cognito-identity-js';

// AWS Cognito configuration
export const COGNITO_CONFIG = {
  UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
  ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
  Region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
};

// Initialize Cognito client
export const cognitoClient = new CognitoIdentityProviderClient({
  region: COGNITO_CONFIG.Region,
});

// Initialize Cognito user pool
export const userPool = new CognitoUserPool({
  UserPoolId: COGNITO_CONFIG.UserPoolId,
  ClientId: COGNITO_CONFIG.ClientId,
});

// Helper function to get current authenticated user
export const getCurrentUser = (): CognitoUser | null => {
  return userPool.getCurrentUser();
};

// Helper function to get user attributes
export const getUserAttributes = async (): Promise<Record<string, string>> => {
  return new Promise((resolve, reject) => {
    const currentUser = getCurrentUser();
    
    if (!currentUser) {
      reject(new Error('No user is currently signed in'));
      return;
    }
    
    currentUser.getSession((err: any, session: any) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!session.isValid()) {
        reject(new Error('Invalid session'));
        return;
      }
      
      currentUser.getUserAttributes((err, attributes) => {
        if (err) {
          reject(err);
          return;
        }
        
        const userAttributes: Record<string, string> = {};
        attributes?.forEach(attribute => {
          userAttributes[attribute.getName()] = attribute.getValue();
        });
        
        resolve(userAttributes);
      });
    });
  });
};

// Helper function to sign out
export const signOut = (): void => {
  const currentUser = getCurrentUser();
  if (currentUser) {
    currentUser.signOut();
  }
}; 