import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { applyActionCode, signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import LogoMajor from '../LogoMajor.png';

const Account: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasVerificationParams, setHasVerificationParams] = useState(false);

  // Set title immediately
  useEffect(() => {
    document.title = 'Major Phones LLC';
  }, []);

  useEffect(() => {
    const verifyEmail = async () => {
      const mode = searchParams.get('mode');
      const oobCode = searchParams.get('oobCode');

      if (mode === 'verifyEmail' && oobCode) {
        setHasVerificationParams(true);
        setIsVerifying(true);

        try {
          await applyActionCode(auth, oobCode);
          console.log('Email verified successfully');
          setVerificationSuccess(true);
          setIsVerifying(false);
        } catch (error: any) {
          console.error('Error verifying email:', error);
          setErrorMessage('The link may be invalid or expired, contact us through');
          setIsVerifying(false);
        }
      } else if (mode || oobCode) {
        // Has some verification params but invalid
        setHasVerificationParams(true);
        setErrorMessage('Invalid verification link.');
        setIsVerifying(false);
      }
      // If no verification params at all, hasVerificationParams stays false
    };

    verifyEmail();
  }, [searchParams]);

  useEffect(() => {
    if (verificationSuccess && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (verificationSuccess && countdown === 0) {
      // Sign out the user before redirecting to signin
      signOut(auth).then(() => {
        navigate('/signin');
      });
    }
  }, [verificationSuccess, countdown]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Main Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-6 relative overflow-hidden">

          {/* Header */}
          {hasVerificationParams ? (
            <div className="text-center mb-6 relative z-10">
              <div className="inline-flex items-center justify-center">
                <img src={LogoMajor} alt="Major Phones Logo" className="w-30 h-20" />
              </div>
              <h1 className="text-xl font-medium text-white">Email Verification</h1>
            </div>
          ) : (
            <div className="text-center relative z-10">
              <div className="inline-flex items-center justify-center">
                <img src={LogoMajor} alt="Major Phones Logo" className="w-30 h-30" />
              </div>
            </div>
          )}

          {/* Content */}
          <div className="text-center relative z-10">
            {hasVerificationParams ? (
              <>
                {isVerifying && (
                  <>
                    <div className="mb-4">
                      <div className="w-12 h-12 mx-auto bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">Verifying Email</h3>
                    <p className="text-blue-200">Please wait a moment...</p>
                  </>
                )}

                {verificationSuccess && (
                  <>
                    <div className="mb-4">
                      <div className="w-12 h-12 mx-auto bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">Account Verified</h3>
                    <p className="text-blue-200">
                      You will be redirected to the login page to access your account
                    </p>
                  </>
                )}

                {errorMessage && (
                  <>
                    <div className="mb-4">
                      <div className="w-12 h-12 mx-auto bg-red-500 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">Verification Failed</h3>
                    <p className="text-blue-200 mb-4">
                      {errorMessage}{' '}
                      <a
                        href="https://t.me/MajorPhones"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-400 hover:text-green-300 underline transition-colors"
                      >
                        Telegram
                      </a>
                      {' '}or{' '}
                      <a
                        href="mailto:support@majorphones.com"
                        className="text-green-400 hover:text-green-300 underline transition-colors"
                      >
                        email
                      </a>
                    </p>
                    <button
                      onClick={() => navigate('/signin')}
                      className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
                    >
                      Go to Sign In
                    </button>
                  </>
                )}
              </>
            ) : null}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Account;