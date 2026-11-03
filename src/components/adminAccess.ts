// Only this admin can open the Temp Emails page. The getUserTempEmails and getRecentTempEmails functions
// allow the same account, so the other admins get 403 there anyway
export const TEMP_EMAIL_ADMIN = 'orlianpay2@gmail.com';

export const canViewTempEmails = (user: { email: string | null; emailVerified: boolean } | null | undefined) =>
  !!user && user.emailVerified === true && user.email === TEMP_EMAIL_ADMIN;

// Same administrators as ADMIN_EMAILS in the backend's requireAdmin.js. getDesktopUsageReport and
// getDesktopUsageStats check them again on every request; this only hides the page from everyone else
export const ADMIN_EMAILS = ['orlianpay2@gmail.com', 'marylorenaosuna@gmail.com'];

export const canViewDesktopMetrics = (user: { email: string | null; emailVerified: boolean } | null | undefined) =>
  !!user && user.emailVerified === true && !!user.email && ADMIN_EMAILS.includes(user.email);
