// FILE: src/services/auth.js
import { CognitoUserPool, CognitoUser, AuthenticationDetails } from "amazon-cognito-identity-js";

const ENV = (typeof import.meta !== "undefined" && import.meta.env) || {};
export const USE_MOCK = ENV.VITE_USE_MOCK === "true";

const MOCK_KEY = "omni_mock_agent";
let currentAgent = null;

function getStorage() {
  return typeof globalThis !== "undefined" && globalThis.localStorage ? globalThis.localStorage : null;
}

const pool =
  USE_MOCK || !ENV.VITE_COGNITO_USER_POOL_ID || !ENV.VITE_COGNITO_CLIENT_ID
    ? null
    : new CognitoUserPool({
        UserPoolId: ENV.VITE_COGNITO_USER_POOL_ID,
        ClientId: ENV.VITE_COGNITO_CLIENT_ID,
      });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function resolveAgentId(claims = {}) {
  const username = claims["cognito:username"];
  const email = claims.email;
  if (username && !UUID_RE.test(username)) return username;
  return email || username || "agent";
}

export function usernameFromSession(session) {
  return resolveAgentId(session.getIdToken().decodePayload());
}

// Đối chiếu Amendment #1 (Ngày 3): inspect cả cognito:username và email để chốt định danh với Vi/Hoài Nam/Duy
export function inspectSessionClaims(session) {
  if (!session || session.mock) return null;
  const p = session.getIdToken().decodePayload();
  return {
    "cognito:username": p["cognito:username"],
    email: p.email,
    sub: p.sub,
  };
}

export function getAgentName() {
  if (USE_MOCK) {
    return currentAgent || getStorage()?.getItem(MOCK_KEY) || "agent";
  }
  // Khi USE_MOCK=false, tuyệt đối KHÔNG fallback đọc omni_mock_agent từ localStorage
  return currentAgent || null;
}

// Trả về { session, username, claims? } hoặc null nếu chưa đăng nhập / hết hạn hẳn.
export function getCurrentSession() {
  if (USE_MOCK) {
    const name = getStorage()?.getItem(MOCK_KEY);
    if (name) currentAgent = name;
    return Promise.resolve(name ? { mock: true, username: name } : null);
  }
  if (!pool) return Promise.resolve(null);
  return new Promise((resolve) => {
    const user = pool.getCurrentUser();
    if (!user) return resolve(null);
    user.getSession((err, session) => {
      if (err || !session || !session.isValid()) {
        currentAgent = null;
        return resolve(null);
      }
      currentAgent = usernameFromSession(session);
      resolve({ session, username: currentAgent, claims: inspectSessionClaims(session) });
    });
  });
}

export async function getIdToken() {
  if (USE_MOCK) return "mock-token";
  const s = await getCurrentSession();
  if (!s) throw new Error("NOT_AUTHENTICATED");
  return s.session.getIdToken().getJwtToken();
}

// Kết quả: { status: "OK" } hoặc { status: "NEW_PASSWORD_REQUIRED", completeNewPassword(newPwd) }
export function login(username, password) {
  const cleanUser = String(username || "").trim();
  if (!cleanUser) return Promise.reject(new Error("Vui lòng nhập tên đăng nhập"));

  if (USE_MOCK) {
    getStorage()?.setItem(MOCK_KEY, cleanUser);
    currentAgent = cleanUser;
    return Promise.resolve({ status: "OK" });
  }
  if (!pool) return Promise.reject(new Error("Thiếu cấu hình Cognito User Pool"));

  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: cleanUser, Pool: pool });
    user.authenticateUser(new AuthenticationDetails({ Username: cleanUser, Password: password }), {
      onSuccess: (session) => {
        currentAgent = usernameFromSession(session);
        resolve({ status: "OK", claims: inspectSessionClaims(session) });
      },
      onFailure: (err) => reject(err),
      newPasswordRequired: (userAttributes) => {
        delete userAttributes.email_verified;
        delete userAttributes.phone_number_verified;
        resolve({
          status: "NEW_PASSWORD_REQUIRED",
          completeNewPassword: (newPassword) =>
            new Promise((res, rej) =>
              user.completeNewPasswordChallenge(
                newPassword,
                {},
                {
                  onSuccess: (session) => {
                    currentAgent = usernameFromSession(session);
                    res({ status: "OK", claims: inspectSessionClaims(session) });
                  },
                  onFailure: rej,
                }
              )
            ),
        });
      },
    });
  });
}

export function logout() {
  currentAgent = null;
  if (USE_MOCK) {
    getStorage()?.removeItem(MOCK_KEY);
    return;
  }
  const user = pool?.getCurrentUser();
  if (user) user.signOut();
}
