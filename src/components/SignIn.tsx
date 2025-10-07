import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, MultiFactorResolver, TotpMultiFactorGenerator, getMultiFactorResolver } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import LogoMajor from '../LogoMajor.png';
import MajorPhonesFavIc from '../MajorPhonesFavIc.png';

const SignIn: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  
  // MFA/TOTP states
  const [showTOTPModal, setShowTOTPModal] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);
  const [isVerifyingTOTP, setIsVerifyingTOTP] = useState(false);
  const [totpError, setTotpError] = useState<string | null>(null);
  
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
      setModalMessage('Please enter your email address.');
      setShowModal(true);
      return;
    }

    if (!password.trim()) {
      setModalMessage('Please enter your password.');
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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('User signed in:', user);

      // Check if email is verified
      if (!user.emailVerified) {
        setModalMessage('Your account has not been verified yet');
        setShowModal(true);
        setIsLoading(false);
        // User stays logged in but can't access dashboard until verified
        return;
      }
      
      // Si el email está verificado, el useEffect manejará la navegación
      // cuando currentUser se actualice
    } catch (error: any) {
      console.error('Error signing in:', error);
      console.log('Error code:', error.code);
      
      // Handle MFA required error
      if (error.code === 'auth/multi-factor-auth-required') {
        const resolver = getMultiFactorResolver(auth, error);
        setMfaResolver(resolver);
        setShowTOTPModal(true);
        setIsLoading(false);
        return;
      }
      
      let errorMessage = 'An error occurred during sign in';

      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'This user does not exist';
          break;
        case 'auth/invalid-password':
          errorMessage = 'This password is incorrect';
          break;
        case 'auth/invalid-email':
          errorMessage = 'This email address is invalid';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'These credentials are invalid';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts, please try again later';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'You are experiencing network errors, please try again';
          break;
        case 'auth/internal-error':
          errorMessage = 'An unexpected error occurred, please try again';
          break;
        case 'auth/session-cookie-expired':
          errorMessage = 'An unexpected error occurred, please refresh';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Your account has been suspended';
          break;
        case 'auth/invalid-action-code':
          errorMessage = 'You have not verified your account through your email';
          break;
        default:
          errorMessage = 'An unexpected error occurred';
      }

      setModalMessage(errorMessage);
      setShowModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // El useEffect manejará la navegación cuando currentUser se actualice
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      console.log('Error code:', error.code);

      let errorMessage = 'Error signing in with Google, please try again';

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
          errorMessage = 'The popup was blocked, please allow popups or refresh and try again';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Google sign-in is not enabled';
          break;
        case 'auth/internal-error':
          errorMessage = 'An unexpected error occurred, please try again';
          break;
        default:
          errorMessage = 'Error signing in with Google, please try again';
      }

      setModalMessage(errorMessage);
      setShowModal(true);
      setIsLoading(false);
    }
  };


  const handleVerifyTOTP = async () => {
    console.log('=== handleVerifyTOTP called ===');
    console.log('totpCode raw:', totpCode);
    console.log('totpCode trimmed:', totpCode.trim());
    console.log('totpCode length:', totpCode.trim().length);
    
    // Limpiar error previo
    setTotpError(null);
    
    if (!totpCode.trim()) {
      setTotpError('Please enter your verification code');
      return;
    }

    if (totpCode.trim().length !== 6) {
      setTotpError('Verification code must be 6 digits');
      return;
    }

    if (!mfaResolver) {
      console.error('No mfaResolver found');
      setTotpError('Session expired. Please sign in again.');
      setTimeout(() => {
        setShowTOTPModal(false);
        setTotpCode('');
        setTotpError(null);
      }, 3000);
      return;
    }

    setIsVerifyingTOTP(true);

    try {
      console.log('MFA Resolver:', mfaResolver);
      console.log('MFA Hints:', mfaResolver.hints);
      
      // Get the TOTP factor from the resolver
      const totpFactor = mfaResolver.hints.find(
        hint => hint.factorId === TotpMultiFactorGenerator.FACTOR_ID
      );

      console.log('TOTP Factor found:', totpFactor);

      if (!totpFactor) {
        throw new Error('TOTP factor not found');
      }

      console.log('Creating assertion with UID:', totpFactor.uid, 'Code:', totpCode.trim());

      // Create TOTP assertion with the verification code - asegurarse de usar trim()
      const multiFactorAssertion = TotpMultiFactorGenerator.assertionForSignIn(
        totpFactor.uid,
        totpCode.trim()
      );

      console.log('Assertion created, resolving sign in...');

      // Complete sign-in with MFA
      const userCredential = await mfaResolver.resolveSignIn(multiFactorAssertion);
      const user = userCredential.user;
      
      console.log('User signed in with MFA:', user);

      // Close TOTP modal
      setShowTOTPModal(false);
      setTotpCode('');
      setTotpError(null);
      setMfaResolver(null);

      // Check email verification
      if (!user.emailVerified) {
        setModalMessage('Your account has not been verified yet');
        setShowModal(true);
        setIsVerifyingTOTP(false);
        return;
      }
      
      // El useEffect manejará la navegación cuando currentUser se actualice
    } catch (error: any) {
      console.error('Error verifying TOTP code:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      let errorMessage = 'Invalid verification code. Please try again.';

      if (error.code === 'auth/invalid-verification-code') {
        errorMessage = 'Invalid code, please try again';
      } else if (error.code === 'auth/totp-challenge-timeout') {
        errorMessage = 'Please refresh and try again';
      } else if (error.code === 'auth/code-expired') {
        errorMessage = 'Code expired, please sign in again';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts, please try again later';
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Mostrar error en el modal TOTP en lugar de abrir otra modal
      // Usar setTimeout para evitar conflictos de renderizado
      setTimeout(() => {
        setTotpError(errorMessage);
        setTotpCode(''); // Limpiar el código para que el usuario ingrese uno nuevo
      }, 0);
    } finally {
      setIsVerifyingTOTP(false);
    }
  };

  const handleCloseTOTPModal = () => {
    setShowTOTPModal(false);
    setTotpCode('');
    setTotpError(null);
    setMfaResolver(null);
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
            <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
            <p className="text-blue-200">Sign in to your Major Phones account</p>
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
                  name="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="john@example.com"
                  autoComplete="off"
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
                  placeholder="••••••••"
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

            {/* Forgot Password */}
            <div className="text-center">
              <Link
                to="/forgot-password"
                className="text-sm text-green-400 hover:text-green-300 transition-colors font-medium"
              >
                Forgot password?
              </Link>
            </div>

            {/* Sign In Button */}
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
                'Sign In'
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
              onClick={handleGoogleSignIn}
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

          {/* Sign Up Link */}
          <div className="text-center mt-4 relative z-10">
            <p className="text-blue-200">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="text-green-400 hover:text-green-300 font-medium transition-colors"
              >
                Sign up
              </Link>
            </p>
          </div>
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

        {/* TOTP Verification Modal */}
        {showTOTPModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-70 h-58">
              <div className="text-center">
                <div className="mb-4">
                  <div className="w-12 h-12 mx-auto bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Two-Factor Authentication</h3>
                <p className="text-blue-200 mb-4">Enter the 6-digit code from your authenticator app</p>
                
                <div className="mb-4">
                  <input
                    type="text"
                    value={totpCode}
                    onChange={(e) => {
                      setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                      setTotpError(null); // Limpiar error cuando el usuario empieza a escribir
                    }}
                    disabled={isVerifyingTOTP}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full px-2 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-center text-lg tracking-widest placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    autoFocus
                  />
                </div>

                {/* Mensaje de error */}
                {totpError && (
                  <div className="mb-4 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-red-400 text-sm">{totpError}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleCloseTOTPModal}
                    disabled={isVerifyingTOTP}
                    className="flex-1 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerifyTOTP}
                    disabled={isVerifyingTOTP || totpCode.length !== 6}
                    className="flex-1 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isVerifyingTOTP ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    ) : (
                      'Verify'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SignIn;