import { getAuth } from 'firebase/auth';

interface HistoryRecord {
  id: string;
  date: string;
  expirationDate: string;
  number: string;
  serviceType: 'Short' | 'Middle' | 'Long' | 'Empty simcard';
  status: 'Pending' | 'Cancelled' | 'Completed' | 'Inactive' | 'Active' | 'Expired' | 'Timed out';
  service: string;
  price: number;
  duration: string;
  code: string;
  country: string;
  reuse?: boolean;
  maySend?: boolean;
  asleep?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  expiry?: Date;
  awakeIn?: Date;
  codeAwakeAt?: Date;
  orderId?: string;
}

// Function to check if a Middle number has timed out (for display purposes only)
export const hasMiddleTimedOut = (record: HistoryRecord): boolean => {
  if (record.serviceType !== 'Middle' || record.status !== 'Active' || !record.createdAt) {
    return false;
  }
  const hasSms = record.code && record.code.trim() !== '';
  // If SMS already received, don't show as timed out
  if (hasSms) {
    return false;
  }
  const now = new Date().getTime();
  const startTime = record.createdAt.getTime();
  const fiveMinutes = 5 * 60 * 1000; // 5:00 in milliseconds
  const expiryTime = startTime + fiveMinutes;
  return now >= expiryTime;
};

// Get display status for Middle numbers
export const getMiddleDisplayStatus = (record: HistoryRecord): string => {
  if (hasMiddleTimedOut(record)) {
    return 'Inactive';
  }
  return record.status;
};

// Get status color for Middle numbers
export const getMiddleStatusColor = (status: string) => {
  switch (status) {
    case 'Active':
      return 'text-green-400 border-green-500/30 bg-green-500/20';
    case 'Cancelled':
      return 'text-red-400 border-red-500/30 bg-red-500/20';
    case 'Inactive':
      return 'text-gray-400 border-gray-500/30 bg-gray-500/20';
    case 'Expired':
      return 'text-red-400 border-red-500/30 bg-red-500/20';
    case 'Timed out':
      return 'text-gray-400 border-gray-500/30 bg-gray-500/20';
    default:
      return 'text-gray-400 border-gray-500/30 bg-gray-500/20';
  }
};

// Calculate duration for Middle numbers
export const calculateMiddleDuration = (createdAt: Date, expiry: Date): string => {
  const durationMs = expiry.getTime() - createdAt.getTime();
  const durationDays = Math.round(durationMs / (1000 * 60 * 60 * 24));
  return `${durationDays} day${durationDays !== 1 ? 's' : ''}`;
};

// Get available actions for Middle numbers
export const getMiddleAvailableActions = (record: HistoryRecord): string[] => {
  const { status, code } = record;
  const hasSms = code && code.trim() !== '';
  const displayStatus = getMiddleDisplayStatus(record);

  // Check if displaying as Inactive (ficticio) - disable actions
  if (displayStatus === 'Inactive' && status === 'Active') {
    // Ficticio Inactive (still Active in Firestore) - no actions (disabled)
    return [];
  }

  if (status === 'Active') {
    if (hasSms) {
      // Active with SMS - no actions (disabled)
      return [];
    } else {
      // Active without SMS - only Cancel
      return ['Cancel'];
    }
  } else if (status === 'Inactive') {
    // Real Inactive status (from Firestore) - always show Activate (regardless of SMS)
    return ['Activate'];
  } else if (status === 'Cancelled' || status === 'Expired') {
    // Cancelled or Expired - no actions (disabled)
    return [];
  }

  return [];
};

// Handle cancel middle number
export const handleCancelMiddle = async (
  recordId: string,
  orderId: string | undefined,
  setErrorMessage: (msg: string) => void,
  setShowErrorModal: (show: boolean) => void,
  setCancellingOrderId: (id: string | null) => void
) => {
  if (!orderId) {
    setErrorMessage('Invalid order ID');
    setShowErrorModal(true);
    return;
  }

  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    setErrorMessage('You are not authenticated or your token is invalid');
    setShowErrorModal(true);
    return;
  }

  // Set cancelling state
  setCancellingOrderId(recordId);

  try {
    // Get Firebase ID token
    const idToken = await currentUser.getIdToken();

    // Make API call to cancel middle number cloud function
    const response = await fetch('https://cancelmiddleusa-ezeznlhr5a-uc.a.run.app', {
      method: 'POST',
      headers: {
        'authorization': `${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ orderId })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // Success - the listener will automatically update the status to Cancelled
      // Backend will change status to Cancelled and buttons will be disabled
      setCancellingOrderId(null);
    } else {
      // Handle error responses
      let errorMsg = 'An unknown error occurred';

      if (data.message === 'Unauthorized') {
        errorMsg = 'You are not authenticated or your token is invalid';
      } else if (data.message === 'Bad Request: Missing orderId' || data.message === 'Order not found') {
        errorMsg = 'Please refresh the page and try again';
      } else if (data.message === 'Error cancelling number') {
        errorMsg = 'This number could not be cancelled, please try again or contact our customer support';
      } else if (data.message === 'Error updating balance') {
        errorMsg = 'Please refresh the page and try again';
      } else if (data.message === 'Internal Server Error') {
        errorMsg = 'Please contact our customer support';
      }

      setErrorMessage(errorMsg);
      setShowErrorModal(true);
      setCancellingOrderId(null);
    }
  } catch (error) {
    console.error('Cancel middle number error:', error);
    setErrorMessage('Please contact our customer support');
    setShowErrorModal(true);
    setCancellingOrderId(null);
  }
};

// Handle activate Middle number
export const handleActivateMiddle = async (
  recordId: string,
  orderId: string | undefined,
  setErrorMessage: (msg: string) => void,
  setShowErrorModal: (show: boolean) => void,
  setActivatingOrderId: (id: string | null) => void
) => {
  if (!orderId) {
    setErrorMessage('Invalid order ID');
    setShowErrorModal(true);
    return;
  }

  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    setErrorMessage('You are not authenticated or your token is invalid');
    setShowErrorModal(true);
    return;
  }

  // Set activating state
  setActivatingOrderId(recordId);

  try {
    // Get Firebase ID token
    const idToken = await currentUser.getIdToken();

    // Make API call to activate middle number cloud function
    const response = await fetch('https://activatemiddleusa-ezeznlhr5a-uc.a.run.app', {
      method: 'POST',
      headers: {
        'authorization': `${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ orderId })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // Success - the listener will automatically update the status to Active
      setActivatingOrderId(null);
    } else {
      // Handle error responses
      let errorMsg = 'An unknown error occurred';

      if (data.message === 'Unauthorized') {
        errorMsg = 'You are not authenticated or your token is invalid';
      } else if (data.message === 'Bad Request: Missing orderId' || data.message === 'Order not found') {
        errorMsg = 'Please refresh the page and try again';
      } else if (data.message === 'Number is not inactive') {
        errorMsg = 'This number is not inactive and cannot be activated';
      } else if (data.message === 'Error activating number') {
        errorMsg = 'This number could not be activated, please try again or contact our customer support';
      } else if (data.message === 'Error updating balance') {
        errorMsg = 'Please refresh the page and try again';
      } else if (data.message === 'Internal Server Error') {
        errorMsg = 'Please contact our customer support';
      }

      setErrorMessage(errorMsg);
      setShowErrorModal(true);
      setActivatingOrderId(null);
    }
  } catch (error) {
    console.error('Activate middle number error:', error);
    setErrorMessage('Please contact our customer support');
    setShowErrorModal(true);
    setActivatingOrderId(null);
  }
};
