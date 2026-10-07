import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
export function adminDb() {
  if (!getApps().length) {
    const credentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!credentials) throw new Error("Server Firebase credentials are not configured.");
    initializeApp({ credential: cert(JSON.parse(credentials)) });
  }
  return getFirestore();
}
export async function requireAdmin(request: Request) {
  adminDb();
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) throw new Error("Administrator sign-in required.");
  const user = await getAuth().verifyIdToken(token, true);
  const allowed = (process.env.ADMIN_UIDS ?? "").split(",").map(s => s.trim());
  if (user.admin !== true && !allowed.includes(user.uid)) throw new Error("Administrator access required.");
  return user.uid;
}
