import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase/config';
import LogoMajor from '../LogoMajor.png';
import MajorPhonesFavIc from '../MajorPhonesFavIc.png';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const navigate = useNavigate();


  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setModalMessage('Please enter your email address.');
      setShowModal(true);
      return;
    }

    if (!validateEmail(email)) {
      setModalMessage('Please enter a valid email address.');
      setShowModal(true);
      return;
    }

    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setIsLoading(false);
      setIsSuccess(true);
    } catch (error: any) {
      setIsLoading(false);

      let errorMessage = 'An error occurred while sending the reset email';

      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address';
          break;
        case 'auth/invalid-email':
          errorMessage = 'This email address is invalid';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'You are experiencing network errors, please try again';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts, please try again later';
          break;
        case 'auth/invalid-action-code':
          errorMessage = 'Invalid or expired reset code';
          break;
        default:
          errorMessage = 'An unexpected error occurred';
      }

      setModalMessage(errorMessage);
      setShowModal(true);
    }
  };

  const handleBackToSignIn = () => {
    navigate('/signin');
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Success Card */}
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-6 relative overflow-hidden">

            {/* Success Content */}
            <div className="text-center mb-6 relative z-10">
              {/* Success Icon */}
              <div className="inline-flex items-center justify-center">
                <img src={LogoMajor} alt="Major Phones Logo" className="w-38 h-20" />
              </div>
              <h1 className="text-2xl font-bold text-white">Email Sent</h1>
              <p className="text-blue-200">
                Check the mail inbox of
              </p>
            </div>

            <div className="space-y-4 relative z-10">
              <div className="bg-white/5 border border-white/20 rounded-xl p-3">
                <p className="text-green-400 font-medium text-lg break-all">
                  {email}
                </p>
              </div>
              <p className="text-blue-300 text-sm">
                If you don't see the email, check your spam folder or
              </p>

              {/* Action Button */}
              <button
                onClick={() => setIsSuccess(false)}
                className="w-full bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
              >
                Change the Email
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Main Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-6 relative overflow-hidden">

          {/* Header */}
          <div className="text-center mb-6 relative z-10">
            <div className="inline-flex items-center justify-center">
              <img src={LogoMajor} alt="Major Phones Logo" className="w-38 h-20" />
            </div>
            <h1 className="text-2xl font-bold text-white">Forgot Password</h1>
            <p className="text-blue-200">
            Enter your email to recover your account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            {/* Email Input */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-blue-100 text-left">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  id="email"
                  name="randomfield"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                  placeholder="Enter your email address"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
              </div>
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : (
                <>
                  Send Reset Email
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-transparent text-blue-200">or</span>
              </div>
            </div>

            {/* Alternative Actions */}
            <div className="flex flex-col space-y-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
              <Link
                to="/signin"
                className="flex items-center justify-center px-4 py-2 border border-white/20 rounded-xl bg-white/5 hover:bg-white/10 text-blue-200 hover:text-white transition-all duration-300 group"
              >
                Back to Sign In
              </Link>

              <Link
                to="/signup"
                className="flex items-center justify-center px-4 py-2 border border-white/20 rounded-xl bg-white/5 hover:bg-white/10 text-blue-200 hover:text-white transition-all duration-300 group"
              >
                Create New Account
              </Link>
            </div>
          </form>
        </div>

        {/* Custom Validation Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-70 h-58">
              <div className="text-center">
                <div className="mb-4">
                  <div className="w-12 h-12 mx-auto bg-red-500 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Error</h3>
                <p className="text-blue-200 mb-4">{modalMessage}</p>
                <button
                  onClick={() => setShowModal(false)}
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

export default ForgotPassword;