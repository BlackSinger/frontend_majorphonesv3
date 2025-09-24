import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { applyActionCode, signOut, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
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

  // Password reset states
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  // Set title immediately
  useEffect(() => {
    document.title = 'Major Phones LLC';
  }, []);

  useEffect(() => {
    const handleParams = async () => {
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
          setErrorMessage('The link may be invalid or expired, contact our customer support');
          setIsVerifying(false);
        }
      } else if (mode === 'resetPassword' && oobCode) {
        setHasVerificationParams(true);
        setIsPasswordReset(true);

        try {
          // Verify the password reset code first
          await verifyPasswordResetCode(auth, oobCode);
          console.log('Password reset code verified successfully');
        } catch (error: any) {
          console.error('Error verifying password reset code:', error);
          setErrorMessage('The password reset link may be invalid or expired, contact our customer support');
          setIsPasswordReset(false);
        }
      } else if (mode || oobCode) {
        // Has some verification params but invalid
        setHasVerificationParams(true);
        setErrorMessage('Invalid verification link');
        setIsVerifying(false);
      }
      // If no verification params at all, hasVerificationParams stays false
    };

    handleParams();
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

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    // Custom validation
    if (!newPassword.trim()) {
      setModalMessage('Please enter your new password.');
      setShowModal(true);
      return;
    }

    if (!validatePassword(newPassword)) {
      setModalMessage('Password must be at least 6 characters long.');
      setShowModal(true);
      return;
    }

    setIsResettingPassword(true);

    try {
      const oobCode = searchParams.get('oobCode');
      if (oobCode) {
        await confirmPasswordReset(auth, oobCode, newPassword);
        console.log('Password reset successfully');
        setResetSuccess(true);
        setModalMessage('Your password has been changed successfully');
        setShowModal(true);
      }
    } catch (error: any) {
      console.error('Error resetting password:', error);
      let errorMessage = 'An error occurred while resetting your password';

      switch (error.code) {
        case 'auth/expired-action-code':
          errorMessage = 'The password reset link has expired';
          break;
        case 'auth/invalid-action-code':
          errorMessage = 'The password reset link is invalid';
          break;
        case 'auth/weak-password':
          errorMessage = 'This password is too weak';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'You are experiencing network errors, please try again';
          break;
        default:
          errorMessage = 'An unexpected error occurred';
      }

      setModalMessage(errorMessage);
      setShowModal(true);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    if (resetSuccess) {
      navigate('/signin');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Main Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-6 relative overflow-hidden">

          {/* Header */}
          {hasVerificationParams ? (
            <div className="text-center mb-2 relative z-10">
              <div className="inline-flex items-center justify-center">
                <img src={LogoMajor} alt="Major Phones Logo" className="w-30 h-20" />
              </div>
              <h1 className="text-xl font-medium text-white">
                {isPasswordReset ? 'Reset Password' : 'Email Verification'}
              </h1>
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
                {/* Password Reset Form */}
                {isPasswordReset && !errorMessage && (
                  <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div className="text-center mb-4">
                      <p className="text-blue-200">Enter your new password below</p>
                    </div>

                    {/* New Password Input */}
                    <div className="space-y-2 text-left">
                      <label htmlFor="newPassword" className="block text-sm font-medium text-blue-100">
                        New Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <input
                          id="newPassword"
                          name="newPassword"
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          disabled={isResettingPassword}
                          className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="Minimum 6 characters"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-blue-300 hover:text-white transition-colors"
                        >
                          {showPassword ? (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                            </svg>
                          ) : (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 616 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isResettingPassword}
                      className="w-full bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
                    >
                      {isResettingPassword ? (
                        <div className="flex items-center justify-center">
                          <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                      ) : (
                        'Save New Password'
                      )}
                    </button>
                  </form>
                )}

                {isVerifying && !isPasswordReset && (
                  <>
                    <div className="mb-4">
                      <div className="w-12 h-12 mx-auto flex items-center justify-center">
                        <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-70 h-58">
              <div className="text-center">
                <div className="mb-4">
                  <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${resetSuccess ? 'bg-green-500' : 'bg-red-500'}`}>
                    {resetSuccess ? (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">{resetSuccess ? 'Success' : 'Error'}</h3>
                <p className="text-blue-200 mb-4">{modalMessage}</p>
                <button
                  onClick={handleModalClose}
                  className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Account;