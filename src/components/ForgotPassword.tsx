import React, { useState } from 'react';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsLoading(false);
    setIsSuccess(true);
  };

  const handleBackToSignIn = () => {
    window.location.href = '/signin';
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Success Card */}
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
              <div className="absolute top-4 right-4 w-16 h-16 bg-gradient-to-r from-green-400 to-blue-500 rounded-full animate-pulse"></div>
              <div className="absolute bottom-6 left-6 w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-bounce delay-300"></div>
              <div className="absolute top-1/2 left-2 w-4 h-4 bg-green-400 rounded-full animate-ping delay-700"></div>
            </div>

            {/* Success Content */}
            <div className="text-center relative z-10">
              {/* Success Icon */}
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-400 to-green-500 rounded-full mb-6 shadow-lg animate-pulse">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h1 className="text-3xl font-bold text-white mb-4">Email Sent!</h1>
              
              <div className="space-y-4 mb-8">
                <p className="text-blue-200 text-lg">
                  We've sent password recovery instructions to:
                </p>
                <div className="bg-white/5 border border-white/20 rounded-xl p-4">
                  <p className="text-green-400 font-medium text-lg break-all">
                    {email}
                  </p>
                </div>
                <p className="text-blue-300 text-sm">
                  Please check your inbox and follow the instructions to reset your password.
                  If you don't see the email, check your spam folder.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                <button
                  onClick={handleBackToSignIn}
                  className="w-full bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-transparent shadow-lg"
                >
                  Back to Sign In
                </button>
                
                <button
                  onClick={() => setIsSuccess(false)}
                  className="w-full bg-white/10 hover:bg-white/20 text-blue-200 hover:text-white font-medium py-3 px-4 rounded-xl transition-all duration-300 border border-white/20"
                >
                  Send Another Email
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Text */}
          <div className="text-center mt-6">
            <p className="text-blue-300 text-sm">
              Didn't receive the email? Check your spam folder or try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Main Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8 relative overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
            <div className="absolute top-4 right-4 w-16 h-16 bg-gradient-to-r from-green-400 to-blue-500 rounded-full animate-pulse"></div>
            <div className="absolute bottom-6 left-6 w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-bounce delay-300"></div>
            <div className="absolute top-1/2 left-2 w-4 h-4 bg-green-400 rounded-full animate-ping delay-700"></div>
          </div>

          {/* Header */}
          <div className="text-center mb-8 relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-400 to-red-500 rounded-xl mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 12H9v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-6.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Forgot Password?</h1>
            <p className="text-blue-200">
              No worries! Enter your email and we'll send you reset instructions.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            {/* Email Input */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-blue-100">
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
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                  placeholder="Enter your email address"
                  required
                />
              </div>
              <p className="text-blue-300 text-xs">
                We'll send recovery instructions to this email address.
              </p>
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-orange-400 to-red-500 hover:from-orange-500 hover:to-red-600 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending Instructions...
                </div>
              ) : (
                <>
                  <svg className="inline w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send Reset Instructions
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-transparent text-blue-200">or</span>
              </div>
            </div>

            {/* Alternative Actions */}
            <div className="space-y-3">
              <a
                href="/signin"
                className="w-full flex items-center justify-center px-4 py-2 border border-white/20 rounded-xl bg-white/5 hover:bg-white/10 text-blue-200 hover:text-white transition-all duration-300 group"
              >
                <svg className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Sign In
              </a>
              
              <a
                href="/signup"
                className="w-full flex items-center justify-center px-4 py-2 border border-white/20 rounded-xl bg-white/5 hover:bg-white/10 text-blue-200 hover:text-white transition-all duration-300 group"
              >
                <svg className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Create New Account
              </a>
            </div>
          </form>
        </div>

        {/* Bottom Text */}
        <div className="text-center mt-6">
          <p className="text-blue-300 text-sm">
            Secure password recovery powered by Major Phones
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;