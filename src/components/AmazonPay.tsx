import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    amazon?: {
      Pay: {
        renderButton: (elementId: string, options: AmazonPayButtonConfig) => void;
      };
    };
  }
}

interface AmazonPayButtonConfig {
  merchantId: string;
  publicKeyId: string;
  ledgerCurrency: string;
  sandbox: boolean;
  checkoutLanguage?: string;
  productType?: 'PayAndShip' | 'PayOnly';
  placement: 'Cart' | 'Home' | 'Checkout' | 'Product' | 'Other';
  buttonColor?: 'Gold' | 'LightGray' | 'DarkGray';
  createCheckoutSessionConfig: {
    payloadJSON: string;
    signature: string;
    publicKeyId?: string;
  };
}

interface AmazonPayProps {
  amount: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  merchantId?: string;
  publicKeyId?: string;
  region?: 'US' | 'EU' | 'UK' | 'JP';
  sandbox?: boolean;
  buttonColor?: 'Gold' | 'LightGray' | 'DarkGray';
  placement?: 'Cart' | 'Home' | 'Checkout' | 'Product' | 'Other';
  productType?: 'PayAndShip' | 'PayOnly';
}

const AmazonPay: React.FC<AmazonPayProps> = ({
  amount,
  onSuccess,
  onError,
  merchantId = process.env.REACT_APP_AMAZON_PAY_MERCHANT_ID || 'A1UP6A75Y5W3BA',
  publicKeyId = process.env.REACT_APP_AMAZON_PAY_PUBLIC_KEY_ID || 'SANDBOX-AEN54XLOS2NV6DCCMCFIACE7',
  region = 'US',
  sandbox = true,
  buttonColor = 'Gold',
  placement = 'Cart',
  productType = 'PayOnly'
}) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  // Get currency based on region
  const getCurrency = (region: string): string => {
    const currencies = {
      US: 'USD',
      EU: 'EUR',
      UK: 'GBP',
      JP: 'JPY'
    };
    return currencies[region as keyof typeof currencies] || 'USD';
  };

  // Check if Amazon Pay SDK is loaded
  useEffect(() => {
    console.log('[Amazon Pay SDK Check] Starting...');
    console.log('[Amazon Pay SDK Check] window.amazon:', window.amazon);

    const checkSDK = () => {
      if (window.amazon && window.amazon.Pay && typeof window.amazon.Pay.renderButton === 'function') {
        console.log('[Amazon Pay SDK Check] SDK is ready!');
        setIsScriptLoaded(true);
        return true;
      }
      return false;
    };

    // Try immediately
    if (checkSDK()) {
      return;
    }

    console.log('[Amazon Pay SDK Check] SDK not ready, waiting...');
    const interval = setInterval(() => {
      if (checkSDK()) {
        clearInterval(interval);
      }
    }, 100);

    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (!window.amazon || !window.amazon.Pay) {
        const errorMsg = 'Amazon Pay SDK failed to load. Please refresh the page.';
        console.error('[Amazon Pay SDK Check]', errorMsg);
        setError(errorMsg);
        if (onError) onError(errorMsg);
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onError]);

  const createCheckoutSession = async (): Promise<{
    payload: string;
    signature: string;
    publicKeyId: string;
    algorithm: string;
    orderId: string;
    isSandbox: boolean;
  } | null> => {
    setIsLoading(true);
    setError(null);

    console.log('[createCheckoutSession] Starting...', { amount });

    try {
      const { getAuth } = await import('firebase/auth');
      const currentUser = getAuth().currentUser;

      console.log('[createCheckoutSession] Current user:', currentUser?.email);

      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const idToken = await currentUser.getIdToken();
      console.log('[createCheckoutSession] Got ID token');

      console.log('[createCheckoutSession] Calling backend...');
      const response = await fetch('https://us-central1-majorphonesv3.cloudfunctions.net/createOrderAmazonPay', {
        method: 'POST',
        headers: {
          'Authorization': `${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amount
        })
      });

      console.log('[createCheckoutSession] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[createCheckoutSession] Error response:', errorData);

        // Handle specific error messages
        if (response.status === 401) {
          throw new Error('You are not authenticated or your token is invalid');
        } else if (response.status === 503) {
          throw new Error('Amazon Pay service is currently unavailable');
        } else if (errorData.message === 'Missing amount in request body') {
          throw new Error('Please enter a valid amount');
        } else {
          throw new Error(errorData.message || 'Failed to create checkout session');
        }
      }

      const data = await response.json();
      console.log('[createCheckoutSession] Response data:', {
        success: data.success,
        hasPayload: !!data.payload,
        hasSignature: !!data.signature,
        publicKeyId: data.publicKeyId,
        orderId: data.orderId,
        isSandbox: data.isSandbox
      });

      if (data.success && data.payload && data.signature) {
        console.log('[createCheckoutSession] Success!');

        // Save orderId to localStorage for payment return
        localStorage.setItem('amazonPayOrderId', data.orderId);
        console.log('[createCheckoutSession] Saved orderId to localStorage:', data.orderId);

        return {
          payload: data.payload,
          signature: data.signature,
          publicKeyId: data.publicKeyId,
          algorithm: data.algorithm,
          orderId: data.orderId,
          isSandbox: data.isSandbox
        };
      } else {
        console.error('[createCheckoutSession] Invalid response structure:', data);
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create checkout session';
      console.error('[createCheckoutSession] Error:', errorMsg);
      console.error('[createCheckoutSession] Full error:', err);
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
      console.log('[createCheckoutSession] Finished');
    }
  };

  // Render Amazon Pay button
  useEffect(() => {
    console.log('Amazon Pay useEffect triggered', {
      isScriptLoaded,
      hasAmazonSDK: !!window.amazon,
      hasButtonRef: !!buttonRef.current
    });

    if (!isScriptLoaded || !window.amazon || !buttonRef.current) {
      console.log('Waiting for dependencies...');
      return;
    }

    // Clear any existing button
    if (buttonRef.current) {
      buttonRef.current.innerHTML = '';
    }

    const initButton = async () => {
      console.log('Initializing Amazon Pay button...');

      // Get signed payload from backend
      const sessionData = await createCheckoutSession();

      if (!sessionData) {
        console.error('No session data received from backend');
        return;
      }

      console.log('Session data received:', {
        orderId: sessionData.orderId,
        hasPayload: !!sessionData.payload,
        hasSignature: !!sessionData.signature,
        publicKeyId: sessionData.publicKeyId,
        algorithm: sessionData.algorithm,
        payloadLength: sessionData.payload.length,
        signatureLength: sessionData.signature.length
      });

      // Log payload for debugging (remove in production)
      console.log('Payload JSON:', sessionData.payload);
      console.log('Signature:', sessionData.signature);

      try {
        // Verify window.amazon.Pay is available
        if (!window.amazon || !window.amazon.Pay || typeof window.amazon.Pay.renderButton !== 'function') {
          throw new Error('Amazon Pay SDK not properly loaded');
        }

        const buttonConfig: AmazonPayButtonConfig = {
          merchantId: merchantId,
          publicKeyId: sessionData.publicKeyId, // Use the publicKeyId from backend response
          ledgerCurrency: getCurrency(region),
          sandbox: sessionData.isSandbox, // Use sandbox value from backend
          checkoutLanguage: 'en_US',
          productType: productType,
          placement: placement,
          buttonColor: buttonColor,
          createCheckoutSessionConfig: {
            payloadJSON: sessionData.payload, // Backend returns 'payload', but Amazon expects 'payloadJSON'
            signature: sessionData.signature,
            publicKeyId: sessionData.publicKeyId
          }
        };

        console.log('Button config:', {
          merchantId: buttonConfig.merchantId,
          publicKeyId: buttonConfig.publicKeyId,
          ledgerCurrency: buttonConfig.ledgerCurrency,
          sandbox: buttonConfig.sandbox,
          productType: buttonConfig.productType,
          placement: buttonConfig.placement,
          buttonColor: buttonConfig.buttonColor,
          hasPayloadJSON: !!buttonConfig.createCheckoutSessionConfig.payloadJSON,
          hasSignature: !!buttonConfig.createCheckoutSessionConfig.signature
        });

        console.log('Attempting to render button with element:', '#amazon-pay-button');
        console.log('Element exists:', !!document.querySelector('#amazon-pay-button'));

        // Render the button
        window.amazon.Pay.renderButton('#amazon-pay-button', buttonConfig);

        console.log('Amazon Pay button rendered successfully');
        console.log('Order ID:', sessionData.orderId);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to render Amazon Pay button';
        console.error('Error rendering button - Full error:', err);
        console.error('Error name:', err instanceof Error ? err.name : 'Unknown');
        console.error('Error message:', errorMsg);
        console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace');
        setError(errorMsg);
        if (onError) onError(errorMsg);
      }
    };

    initButton();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScriptLoaded, amount, merchantId, region, sandbox, buttonColor, placement, productType]);

  return (
    <div className="amazon-pay-container">
      <div
        id="amazon-pay-button"
        ref={buttonRef}
        className="amazon-pay-button-wrapper"
      ></div>

      {isLoading && (
        <div className="flex items-center justify-center mt-4">
          <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          <span className="ml-2 text-slate-400">Loading payment...</span>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <style>{`
        .amazon-pay-button-wrapper {
          min-height: 50px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
      `}</style>
    </div>
  );
};

export default AmazonPay;
