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

export const hasTimedOut = (record: HistoryRecord): boolean => {
  if (record.serviceType !== 'Short' || record.status !== 'Pending' || !record.createdAt) {
    return false;
  }
  const now = new Date().getTime();
  // Usage updatedAt if available (for reused numbers), otherwise use createdAt
  // const startTime = record.updatedAt ? record.updatedAt.getTime() : record.createdAt.getTime();
  const startTime = record.createdAt.getTime();
  const fiveMinutes = 5 * 60 * 1000;
  const expiryTime = startTime + fiveMinutes;
  return now >= expiryTime;
};

export const hasTwoFortyFiveMinutesPassed = (createdAt?: Date): boolean => {
  if (!createdAt) return true;
  const now = new Date().getTime();
  const created = createdAt.getTime();
  const twoMinutesFortyFive = 2 * 60 * 1000 + 45 * 1000;
  return (now - created) >= twoMinutesFortyFive;
};

export const getShortDisplayStatus = (record: HistoryRecord): string => {
  if (hasTimedOut(record)) {
    return 'Timed out';
  }
  return record.status;
};

export const getShortStatusColor = (status: string) => {
  switch (status) {
    case 'Completed':
      return 'text-blue-400 border-blue-500/30 bg-blue-500/20';
    case 'Pending':
      return 'text-orange-400 border-orange-500/30 bg-orange-500/20';
    case 'Cancelled':
      return 'text-red-400 border-red-500/30 bg-red-500/20';
    case 'Expired':
      return 'text-gray-400 border-gray-500/30 bg-gray-500/20';
    case 'Timed out':
      return 'text-gray-400 border-gray-500/30 bg-gray-500/20';
    default:
      return 'text-gray-400 border-gray-500/30 bg-gray-500/20';
  }
};

export const calculateShortDuration = (createdAt: Date, expiry: Date, reuse?: boolean, maySend?: boolean): string => {
  const durationMs = expiry.getTime() - createdAt.getTime();

  // if (reuse === true && maySend === false) {
  //   const durationHours = Math.round(durationMs / (1000 * 60 * 60));
  //   return `Reusable for ${durationHours} hours`;
  // } else
  if (reuse === false && maySend === false) {
    const durationMinutes = Math.round(durationMs / (1000 * 60));
    return `Single use for ${durationMinutes} minutes`;
  } else if (reuse === false && maySend === true) {
    const durationMinutes = Math.round(durationMs / (1000 * 60));
    return `Receive/Respond for ${durationMinutes} minutes`;
  }

  return '';
};

export const getShortAvailableActions = (record: HistoryRecord): string[] => {
  const { status, reuse, maySend, code, createdAt, expiry } = record;
  const hasSms = code && code.trim() !== '';
  const displayStatus = getShortDisplayStatus(record);

  if (displayStatus === 'Timed out') {
    return [];
  }

  // Check for Reuse first - if reuse is true and Completed, always show Reuse
  // if (reuse === true && status === 'Completed') {
  //   return ['Reuse'];
  // }

  // if (reuse === true && maySend === false) {
  //   // Reusable type
  //   if (status === 'Pending') {
  //     // Only allow Cancel if 2:45 minutes have passed AND no SMS received
  //     if (!hasSms && hasTwoFortyFiveMinutesPassed(createdAt)) {
  //       return ['Cancel'];
  //     }
  //     return []; // Disabled if less than 2:45 minutes or SMS received
  //   }
  // } else
  if (reuse === false && maySend === false) {
    if (status === 'Pending') {
      if (!hasSms && hasTwoFortyFiveMinutesPassed(createdAt)) {
        return ['Cancel'];
      }
      return [];
    }
    return [];
  } else if (reuse === false && maySend === true) {
    if (status === 'Pending') {
      if (!hasSms && hasTwoFortyFiveMinutesPassed(createdAt)) {
        return ['Cancel'];
      }
      return [];
    } else if (status === 'Completed') {
      if (hasSms && expiry) {
        const now = new Date();
        if (expiry.getTime() > now.getTime()) {
          return ['Send'];
        }
      }
      return [];
    }
    return [];
  }

  return [];
};

export const handleCancelShort = async (
  orderId: string,
  setErrorMessage: (msg: string) => void,
  setShowErrorModal: (show: boolean) => void,
  setCancellingOrderId: (id: string | null) => void
) => {
  const currentUser = getAuth().currentUser;

  if (!currentUser) {
    setErrorMessage('You are not authenticated or your token is invalid');
    setShowErrorModal(true);
    return;
  }

  setCancellingOrderId(orderId);

  try {
    const idToken = await currentUser.getIdToken();

    const response = await fetch('https://cancelshortnumber-ezeznlhr5a-uc.a.run.app', {
      method: 'POST',
      headers: {
        'authorization': `${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ orderId })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      setCancellingOrderId(null);
    } else {
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
    setErrorMessage('Please contact our customer support');
    setShowErrorModal(true);
    setCancellingOrderId(null);
  }
};

// Handle reuse number
// export const handleReuseNumber = async (
//   orderId: string,
//   setErrorMessage: (msg: string) => void,
//   setShowErrorModal: (show: boolean) => void,
//   setReusingOrderId: (id: string | null) => void
// ) => {
//   const currentUser = getAuth().currentUser;

//   if (!currentUser) {
//     setErrorMessage('You are not authenticated or your token is invalid');
//     setShowErrorModal(true);
//     return;
//   }

//   // Set reusing state
//   setReusingOrderId(orderId);

//   try {
//     // Get Firebase ID token
//     const idToken = await currentUser.getIdToken();

//     // Make API call to reuse number cloud function
//     const response = await fetch('https://activatereuseusa-ezeznlhr5a-uc.a.run.app', {
//       method: 'POST',
//       headers: {
//         'authorization': `${idToken}`,
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify({ orderId })
//     });

//     const data = await response.json();

//     if (response.ok && data.success) {
//       // Success - the listener will automatically update the table
//       // Clear the reusing state
//       setReusingOrderId(null);
//     } else {
//       // Handle error responses
//       let errorMsg = 'An unknown error occurred';

//       if (data.message === 'Unauthorized') {
//         errorMsg = 'You are not authenticated or your token is invalid';
//       } else if (data.message === 'Number is sleeping' || data.message === 'Number is asleep') {
//         errorMsg = 'The number you are trying to reuse is asleep, wait for the counter to end';
//       } else if (data.message === 'Insufficient balance') {
//         errorMsg = 'You do not have enough balance to reuse this number';
//       } else if (data.message === 'Error activating reuse') {
//         errorMsg = 'This number could not be reused, please try again or contact our customer support';
//       } else if (data.message === 'Internal Server Error') {
//         errorMsg = 'Please contact our customer support';
//       }

//       setErrorMessage(errorMsg);
//       setShowErrorModal(true);
//       setReusingOrderId(null);
//     }
//   } catch (error) {
//     setErrorMessage('Please contact our customer support');
//     setShowErrorModal(true);
//     setReusingOrderId(null);
//   }
// };
