import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getAuth } from 'firebase/auth';

const PaymentReturn: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing your payment...');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    const completePayment = async () => {
      try {
        // Get amazonCheckoutSessionId from URL
        const checkoutSessionId = searchParams.get('amazonCheckoutSessionId');

        if (!checkoutSessionId) {
          setStatus('error');
          setMessage('Missing checkout session ID');
          setErrorDetails('No amazonCheckoutSessionId found in URL parameters');
          return;
        }

        console.log('[PaymentReturn] Checkout Session ID:', checkoutSessionId);

        // Get orderId from localStorage (saved when creating the order)
        const orderId = localStorage.getItem('amazonPayOrderId');

        if (!orderId) {
          setStatus('error');
          setMessage('Order ID not found');
          setErrorDetails('Please try creating a new payment');
          return;
        }

        console.log('[PaymentReturn] Order ID:', orderId);

        // Get Firebase auth token
        const currentUser = getAuth().currentUser;
        if (!currentUser) {
          setStatus('error');
          setMessage('User not authenticated');
          return;
        }

        const idToken = await currentUser.getIdToken();

        // Call completeCheckoutAmazonPay
        console.log('[PaymentReturn] Calling completeCheckoutAmazonPay...');
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
        console.log('[PaymentReturn] Response:', data);

        if (!response.ok) {
          setStatus('error');
          setMessage('Payment processing failed');
          setErrorDetails(data.message || 'Unknown error occurred');
          return;
        }

        if (data.success) {
          setStatus('success');
          setMessage('Payment completed successfully!');

          // Clean up localStorage
          localStorage.removeItem('amazonPayOrderId');

          // Redirect to transactions page after 2 seconds
          setTimeout(() => {
            navigate('/transactions');
          }, 2000);
        } else {
          setStatus('error');
          setMessage('Payment was not successful');
          setErrorDetails(data.message || 'Unknown error');
        }

      } catch (error) {
        console.error('[PaymentReturn] Error:', error);
        setStatus('error');
        setMessage('An error occurred while processing your payment');
        setErrorDetails(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    completePayment();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8">
        {status === 'processing' && (
          <div className="text-center">
            <div className="inline-block w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <h2 className="text-2xl font-bold text-white mb-2">Processing Payment</h2>
            <p className="text-slate-400">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
            <p className="text-slate-400">{message}</p>
            <p className="text-sm text-slate-500 mt-2">Redirecting to transactions...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Payment Failed</h2>
            <p className="text-slate-400 mb-2">{message}</p>
            {errorDetails && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-red-400 text-sm">{errorDetails}</p>
              </div>
            )}
            <button
              onClick={() => navigate('/add-funds')}
              className="mt-6 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentReturn;
