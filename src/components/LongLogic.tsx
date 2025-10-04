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

// Get status color for Long numbers
export const getLongStatusColor = (status: string) => {
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

// Calculate duration for Long numbers
export const calculateLongDuration = (createdAt: Date, expiry: Date): string => {
  const durationMs = expiry.getTime() - createdAt.getTime();
  const durationDays = Math.round(durationMs / (1000 * 60 * 60 * 24));
  return `${durationDays} days`;
};

// Get available actions for Long numbers
export const getLongAvailableActions = (record: HistoryRecord): string[] => {
  const { status, code } = record;
  const hasSms = code && code.trim() !== '';

  if (status === 'Active') {
    if (hasSms) {
      // Active with SMS - no actions (disabled)
      return [];
    } else {
      // Active without SMS - only Cancel
      return ['Cancel'];
    }
  } else if (status === 'Inactive') {
    if (hasSms) {
      // Inactive with SMS - only Activate
      return ['Activate'];
    } else {
      // Inactive without SMS - Cancel and Activate
      return ['Cancel', 'Activate'];
    }
  } else if (status === 'Cancelled' || status === 'Expired') {
    // Cancelled or Expired - no actions (disabled)
    return [];
  }

  return [];
};

// Handle cancel long number (uses same endpoint as Middle)
export const handleCancelLong = async (
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

    // Make API call to cancel long number cloud function (same as middle)
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
    console.error('Cancel long number error:', error);
    setErrorMessage('Please contact our customer support');
    setShowErrorModal(true);
    setCancellingOrderId(null);
  }
};

// Handle activate Long number
export const handleActivateLong = async (
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

    // Make API call to activate long number cloud function (same as middle)
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
    console.error('Activate long number error:', error);
    setErrorMessage('Please contact our customer support');
    setShowErrorModal(true);
    setActivatingOrderId(null);
  }
};
