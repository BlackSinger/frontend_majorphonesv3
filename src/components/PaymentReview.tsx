import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getAuth } from 'firebase/auth';

const PaymentReview: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'ready' | 'processing' | 'error'>('loading');
  const [orderDetails, setOrderDetails] = useState<{
    amount: number;
    orderId: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrderDetails = async () => {
      try {
        // Get amazonCheckoutSessionId from URL
        const checkoutSessionId = searchParams.get('amazonCheckoutSessionId');

        if (!checkoutSessionId) {
          setStatus('error');
          setError('Missing checkout session ID');
          return;
        }

        console.log('[PaymentReview] Checkout Session ID:', checkoutSessionId);

        // Get orderId from localStorage
        const orderId = localStorage.getItem('amazonPayOrderId');

        if (!orderId) {
          setStatus('error');
          setError('Order ID not found. Please try again.');
          return;
        }

        console.log('[PaymentReview] Order ID:', orderId);

        // Get order details from Firestore
        const currentUser = getAuth().currentUser;
        if (!currentUser) {
          setStatus('error');
          setError('User not authenticated');
          return;
        }

        // TODO: Fetch order details from Firestore if needed
        // For now, we'll assume the order amount is stored or passed

        setOrderDetails({
          orderId,
          amount: 0 // This should be fetched from Firestore
        });

        setStatus('ready');
      } catch (err) {
        console.error('[PaymentReview] Error:', err);
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    loadOrderDetails();
  }, [searchParams]);

  const handleCompletePayment = async () => {
    try {
      setStatus('processing');

      const checkoutSessionId = searchParams.get('amazonCheckoutSessionId');
      const orderId = localStorage.getItem('amazonPayOrderId');

      if (!checkoutSessionId || !orderId) {
        setError('Missing required information');
        setStatus('error');
        return;
      }

      // Get Firebase auth token
      const currentUser = getAuth().currentUser;
      if (!currentUser) {
        setError('User not authenticated');
        setStatus('error');
        return;
      }

      const idToken = await currentUser.getIdToken();

      // Call completeCheckoutAmazonPay
      console.log('[PaymentReview] Calling completeCheckoutAmazonPay...');
      const response = await fetch(
        'https://us-central1-majorphonesv3.cloudfunctions.net/completeCheckoutAmazonPay',
        {
          method: 'POST',
          headers: {
            'Authorization': `${idToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            checkoutSessionId,
            orderId
          })
        }
      );

      const data = await response.json();
      console.log('[PaymentReview] Response:', data);

      if (!response.ok) {
        setStatus('error');
        setError(data.message || 'Payment processing failed');
        return;
      }

      if (data.success) {
        // Clean up localStorage
        localStorage.removeItem('amazonPayOrderId');

        // Redirect to transactions
        navigate('/transactions');
      } else {
        setStatus('error');
        setError(data.message || 'Payment was not successful');
      }

    } catch (err) {
      console.error('[PaymentReview] Error:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8">
        {status === 'loading' && (
          <div className="text-center">
            <div className="inline-block w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <h2 className="text-2xl font-bold text-white mb-2">Loading...</h2>
            <p className="text-slate-400">Preparing your order review</p>
          </div>
        )}

        {status === 'ready' && orderDetails && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-full mb-4">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Review Your Payment</h2>
            <p className="text-slate-400 mb-6">Please confirm your payment details</p>

            <div className="bg-slate-700/30 rounded-xl p-6 mb-6 text-left">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-400">Order ID:</span>
                <span className="text-white font-mono text-sm">{orderDetails.orderId.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Payment Method:</span>
                <span className="text-white">Amazon Pay</span>
              </div>
            </div>

            <button
              onClick={handleCompletePayment}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-medium transition-all transform hover:scale-105 mb-3"
            >
              Complete Payment
            </button>

            <button
              onClick={() => navigate('/add-funds')}
              className="w-full px-6 py-3 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {status === 'processing' && (
          <div className="text-center">
            <div className="inline-block w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <h2 className="text-2xl font-bold text-white mb-2">Processing Payment</h2>
            <p className="text-slate-400">Please wait while we complete your payment...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
            <p className="text-slate-400 mb-2">{error}</p>
            <button
              onClick={() => navigate('/add-funds')}
              className="mt-6 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
            >
              Back to Add Funds
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentReview;
