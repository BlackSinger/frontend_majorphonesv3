import { setUserId } from 'firebase/analytics';
import { analytics } from '../firebase/config';

// Same user_id the backend sends with purchases: GA joins visits from any device or browser
// to the same user, so returning customers stop counting as new users
export const GA_UID_KEY = 'mp_ga_uid';

export const identifyAnalyticsUser = (uid: string | null) => {
  try {
    if (uid) localStorage.setItem(GA_UID_KEY, uid);
    else localStorage.removeItem(GA_UID_KEY);
  } catch {
    // storage blocked: user_id only from the moment the session is restored
  }
  if (!analytics) return;
  try {
    setUserId(analytics, uid);
  } catch (error) {
    console.error('Analytics user id failed:', error);
  }
};
