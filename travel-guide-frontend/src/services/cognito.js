import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute
} from 'amazon-cognito-identity-js';

const poolData = {
  UserPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
  ClientId: process.env.REACT_APP_COGNITO_CLIENT_ID
};

const userPool = new CognitoUserPool(poolData);

export const register = (username, email, password) => {
  return new Promise((resolve, reject) => {
    const attributeList = [
      new CognitoUserAttribute({ Name: 'email', Value: email })
    ];
    userPool.signUp(username, password, attributeList, null, (err, result) => {
      if (err) reject(err);
      else resolve(result.user);
    });
  });
};

export const confirmRegistration = (username, code) => {
  return new Promise((resolve, reject) => {
    const userData = { Username: username, Pool: userPool };
    const cognitoUser = new CognitoUser(userData);
    cognitoUser.confirmRegistration(code, true, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

export const login = (username, password) => {
  return new Promise((resolve, reject) => {
    const authDetails = new AuthenticationDetails({ Username: username, Password: password });
    const userData = { Username: username, Pool: userPool };
    const cognitoUser = new CognitoUser(userData);
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session) => resolve(session.getIdToken().getJwtToken()),
      onFailure: (err) => reject(err)
    });
  });
};

export const getIdToken = () => {
  return localStorage.getItem('idToken');
};

export const signOut = () => {
  localStorage.removeItem('idToken');
};

export const isAuthenticated = () => {
  const token = getIdToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp > Date.now() / 1000;
  } catch (e) {
    return false;
  }
};