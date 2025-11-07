// src/services/cognito.js
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

// Đăng ký
export const register = (username, email, password) => {
  return new Promise((resolve, reject) => {
    const attributes = [new CognitoUserAttribute({ Name: 'email', Value: email })];
    userPool.signUp(username, password, attributes, null, (err, result) => {
      if (err) reject(err);
      else resolve(result.user);
    });
  });
};

// Xác minh OTP
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

// Gửi lại OTP
export const resendConfirmationCode = (username) => {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: username, Pool: userPool });
    user.resendConfirmationCode((err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

// Đăng nhập
export const login = (username, password) => {
  return new Promise((resolve, reject) => {
    const authDetails = new AuthenticationDetails({ Username: username, Password: password });
    const userData = { Username: username, Pool: userPool };
    const cognitoUser = new CognitoUser(userData);
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session) => {
        localStorage.setItem('idToken', session.getIdToken().getJwtToken());
        resolve(session);
      },
      onFailure: (err) => reject(err)
    });
  });
};

// Đăng xuất
export const signOut = () => {
  localStorage.removeItem('idToken');
};

// Kiểm tra đăng nhập 
export const isAuthenticated = () => {
  const token = localStorage.getItem('idToken');
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp > Date.now() / 1000;
  } catch (e) {
    return false;
  }
};

// Lấy thông tin user hiện tại nếu session còn hiệu lực
export const getCurrentUser = () => {
  return new Promise((resolve) => {
    const currentUser = userPool.getCurrentUser();
    if (!currentUser) {
      resolve(null);
      return;
    }

    currentUser.getSession((err, session) => {
      if (err || !session.isValid()) {
        resolve(null);
        return;
      }

      // ✅ Lưu lại idToken mỗi lần refresh session
      localStorage.setItem('idToken', session.getIdToken().getJwtToken());

      // ✅ Lấy thêm thông tin user (attributes)
      currentUser.getUserAttributes((attrErr, attributes) => {
        if (attrErr) {
          resolve({ username: currentUser.getUsername() });
        } else {
          const userData = {
            username: currentUser.getUsername(),
            attributes: Object.fromEntries(
              attributes.map((a) => [a.getName(), a.getValue()])
            ),
          };
          resolve(userData);
        }
      });
    });
  });
};
