// services/cognito.js
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute
} from 'amazon-cognito-identity-js';

// Cache pool để tránh tạo nhiều instance
const poolData = {
  UserPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
  ClientId: process.env.REACT_APP_COGNITO_CLIENT_ID
};

const userPool = new CognitoUserPool(poolData);

// Helper function để lấy user hiện tại
const getCurrentCognitoUser = () => {
  return userPool.getCurrentUser();
};

// Helper function để kiểm tra token hết hạn
const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp < Date.now() / 1000;
  } catch (e) {
    return true;
  }
};

// Đăng ký
export const register = (username, email, password) => {
  return new Promise((resolve, reject) => {
    const attributes = [new CognitoUserAttribute({ Name: 'email', Value: email })];
    userPool.signUp(username, password, attributes, null, (err, result) => {
      if (err) {
        console.error('Registration error:', err);
        reject(err);
      } else {
        resolve(result.user);
      }
    });
  });
};

// Xác minh OTP
export const confirmRegistration = (username, code) => {
  return new Promise((resolve, reject) => {
    const userData = { Username: username, Pool: userPool };
    const cognitoUser = new CognitoUser(userData);
    cognitoUser.confirmRegistration(code, true, (err, result) => {
      if (err) {
        console.error('Confirmation error:', err);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

// Gửi lại OTP
export const resendConfirmationCode = (username) => {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: username, Pool: userPool });
    user.resendConfirmationCode((err, result) => {
      if (err) {
        console.error('Resend code error:', err);
        reject(err);
      } else {
        resolve(result);
      }
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
        const idToken = session.getIdToken().getJwtToken();
        localStorage.setItem('idToken', idToken);
        localStorage.setItem('accessToken', session.getAccessToken().getJwtToken());
        localStorage.setItem('refreshToken', session.getRefreshToken().getToken());
        resolve(session);
      },
      onFailure: (err) => {
        console.error('Login error:', err);
        reject(err);
      }
    });
  });
};

// Đăng xuất
export const signOut = () => {
  const currentUser = getCurrentCognitoUser();
  if (currentUser) {
    currentUser.signOut();
  }
  localStorage.removeItem('idToken');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('username');
};

// Kiểm tra đăng nhập
export const isAuthenticated = () => {
  const token = localStorage.getItem('idToken');
  return token && !isTokenExpired(token);
};

// Lấy thông tin user hiện tại
export const getCurrentUser = () => {
  return new Promise((resolve) => {
    const currentUser = getCurrentCognitoUser();
    if (!currentUser) {
      resolve(null);
      return;
    }

    currentUser.getSession((err, session) => {
      if (err || !session || !session.isValid()) {
        resolve(null);
        return;
      }

      // Cập nhật token vào localStorage
      const idToken = session.getIdToken().getJwtToken();
      localStorage.setItem('idToken', idToken);

      // Lấy thông tin user
      currentUser.getUserAttributes((attrErr, attributes) => {
        if (attrErr) {
          resolve({ 
            username: currentUser.getUsername(),
            attributes: {}
          });
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

// Refresh token nếu hết hạn
export const refreshToken = async () => {
  const currentUser = getCurrentCognitoUser();
  if (!currentUser) return null;

  return new Promise((resolve) => {
    currentUser.getSession((err, session) => {
      if (err || !session) {
        resolve(null);
        return;
      }

      if (session.isValid()) {
        // Token còn hiệu lực
        const idToken = session.getIdToken().getJwtToken();
        localStorage.setItem('idToken', idToken);
        resolve(idToken);
        return;
      }

      // Token hết hạn, refresh
      const refreshToken = session.getRefreshToken();
      currentUser.refreshSession(refreshToken, (refreshErr, newSession) => {
        if (refreshErr) {
          console.error('Token refresh error:', refreshErr);
          resolve(null);
        } else {
          const newIdToken = newSession.getIdToken().getJwtToken();
          localStorage.setItem('idToken', newIdToken);
          resolve(newIdToken);
        }
      });
    });
  });
};

// Đổi mật khẩu
export const changePassword = async (currentPassword, newPassword) => {
  const API_BASE = (
    process.env.REACT_APP_API_BASE ||
    process.env.REACT_APP_API_GATEWAY_URL ||
    ""
  ).replace(/\/+$/, "");

  if (!API_BASE) {
    throw new Error('API configuration error');
  }

  const idToken = localStorage.getItem("idToken");
  if (!idToken) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({
      currentPassword,
      newPassword
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Failed to change password');
  }

  return response.json();
};

// Export tất cả các function với tên duy nhất
export {
  getCurrentCognitoUser,
  isTokenExpired,
  refreshToken as cognitoRefreshToken // Đổi tên để tránh trùng
};