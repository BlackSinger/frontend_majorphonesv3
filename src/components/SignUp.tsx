import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendEmailVerification, signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import LogoMajor from '../LogoMajor.png';
import MajorPhonesFavIc from '../MajorPhonesFavIc.png';

const SignUp: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'error' | 'success'>('error');
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Custom validation
    if (!email.trim()) {
      setModalType('error');
      setModalMessage('Please enter your email address.');
      setShowModal(true);
      return;
    }
    
    if (!validateEmail(email)) {
      setModalType('error');
      setModalMessage('Please enter a valid email address.');
      setShowModal(true);
      return;
    }
    
    if (!password.trim()) {
      setModalType('error');
      setModalMessage('Please enter your password.');
      setShowModal(true);
      return;
    }
    
    if (password.length < 6) {
      setModalType('error');
      setModalMessage('Password must be at least 6 characters long.');
      setShowModal(true);
      return;
    }
    
    if (!confirmPassword.trim()) {
      setModalType('error');
      setModalMessage('Please confirm your password.');
      setShowModal(true);
      return;
    }
    
    if (password !== confirmPassword) {
      setModalType('error');
      setModalMessage('Passwords do not match.');
      setShowModal(true);
      return;
    }
    
    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Send email verification
      await sendEmailVerification(user);

      console.log('User created and verification email sent');

      // Clear form fields
      setEmail('');
      setPassword('');
      setConfirmPassword('');

      // Show success message - user stays on signup page
      // AuthContext will ignore this user until email is verified
      setModalType('success');
      setModalMessage('An account verification email has been sent to you');
      setShowModal(true);
    } catch (error: any) {
      console.error('Error signing up:', error);
      console.log('Error code:', error.code);
      let errorMessage = 'An error occurred during sign up';

      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email address is already registered';
          break;
        case 'auth/invalid-email':
          errorMessage = 'This email address is invalid';
          break;
        case 'auth/weak-password':
          errorMessage = 'This password is too weak';
          break;
        case 'auth/invalid-password':
          errorMessage = 'This password is invalid';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'The signup is currently unavailable, please try again';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'You are experiencing network errors, please try again';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts, please try again later';
          break;
        case 'auth/internal-error':
          errorMessage = 'An unexpected error occurred, please try again';
          break;
        default:
          errorMessage = 'An unexpected error occurred';
      }

      setModalType('error');
      setModalMessage(errorMessage);
      setShowModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log('User signed up with Google:', user);
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error signing up with Google:', error);
      console.log('Error code:', error.code);

      let errorMessage = 'Error signing up with Google, please try again';

      switch (error.code) {
        case 'auth/popup-closed-by-user':
          errorMessage = 'The sign-in has been cancelled, the popup was closed';
          break;
        case 'auth/cancelled-popup-request':
          errorMessage = 'The sign-in has been cancelled, please try again';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error, please check your connection';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many attempts, please try again later';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Your account has been suspended';
          break;
        case 'auth/account-exists-with-different-credential':
          errorMessage = 'An account already exists with this email';
          break;
        case 'auth/popup-blocked':
          errorMessage = 'The popup was blocked, please allow popups and try again';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Google sign-up is not enabled';
          break;
        case 'auth/internal-error':
          errorMessage = 'An unexpected error occurred, please try again';
          break;
        default:
          errorMessage = 'Error signing up with Google, please try again';
      }

      setModalType('error');
      setModalMessage(errorMessage);
      setShowModal(true);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Main Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-6 relative overflow-hidden">

          {/* Header */}
          <div className="text-center mb-6 relative z-10">
            <div className="inline-flex items-center justify-center">
              <img src={LogoMajor} alt="Major Phones Logo" className="w-30 h-20" />
            </div>
            <h1 className="text-2xl font-bold text-white">Create Account</h1>
            <p className="text-blue-200">Join Major Phones today</p>
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
                  name="email-signup"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="john@example.com"
                  autoComplete="nope"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  data-lpignore="true"
                  data-form-type="other"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-blue-100 text-left">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-blue-100 text-left">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Repeat your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-blue-300 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>


            {/* Sign Up Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : (
                'Sign Up'
              )}
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-transparent text-blue-200">Or continue with</span>
              </div>
            </div>

            {/* Social Login */}
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-2 border border-white/20 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 text-white group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="ml-2 text-white text-sm font-medium">Google</span>
            </button>
          </form>

          {/* Sign In Link */}
          <div className="text-center mt-4 relative z-10">
            <p className="text-blue-200">
              You have an account?{' '}
              <Link
                to="/signin"
                className="text-green-400 hover:text-green-300 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Custom Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-70 h-58">
              <div className="text-center">
                <div className="mb-4">
                  <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${modalType === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {modalType === 'success' ? (
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
                <h3 className="text-lg font-medium text-white mb-2">{modalType === 'success' ? 'Success' : 'Error'}</h3>
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

export default SignUp;