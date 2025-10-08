import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { sendPasswordResetEmail, multiFactor, reauthenticateWithCredential, EmailAuthProvider, TotpMultiFactorGenerator, TotpSecret, MultiFactorResolver, getMultiFactorResolver, deleteUser, GoogleAuthProvider, reauthenticateWithPopup } from 'firebase/auth';
import { db, auth } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from './DashboardLayout';
import QRCode from 'qrcode';

const Profile: React.FC = () => {
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isPasswordChangeRequested, setIsPasswordChangeRequested] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [show2FAConfirmation, setShow2FAConfirmation] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoadingEmail, setIsLoadingEmail] = useState(true);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isLoadingPasswordReset, setIsLoadingPasswordReset] = useState(false);
  const [showPasswordResetErrorModal, setShowPasswordResetErrorModal] = useState(false);
  const [passwordResetError, setPasswordResetError] = useState<string | null>(null);
  const [isLoading2FA, setIsLoading2FA] = useState(false);
  const [show2FAErrorModal, setShow2FAErrorModal] = useState(false);
  const [twoFAError, setTwoFAError] = useState<string | null>(null);
  
  // Estados para el modal de configuración de 2FA
  const [show2FASetupModal, setShow2FASetupModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [setupStep, setSetupStep] = useState<'totp' | 'verify'>('totp');
  const [totpSecret, setTotpSecret] = useState<TotpSecret | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [setupError, setSetupError] = useState<string | null>(null);
  
  // Estados para re-autenticación
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [isReauthenticating, setIsReauthenticating] = useState(false);
  const [reauthError, setReauthError] = useState<string | null>(null);
  
  // Estados para desafío MFA al desactivar
  const [showMFAChallengeModal, setShowMFAChallengeModal] = useState(false);
  const [mfaChallengeCode, setMfaChallengeCode] = useState('');
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);
  const [isSolvingMFA, setIsSolvingMFA] = useState(false);
  const [mfaChallengeError, setMfaChallengeError] = useState<string | null>(null);

  // Estados para eliminación de cuenta
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const [isGoogleUser, setIsGoogleUser] = useState(false);

  // Estados para verificación de identidad antes de cambiar contraseña
  const [showPasswordChangeReauthModal, setShowPasswordChangeReauthModal] = useState(false);
  const [passwordChangeReauthPassword, setPasswordChangeReauthPassword] = useState('');
  const [isPasswordChangeReauthenticating, setIsPasswordChangeReauthenticating] = useState(false);
  const [passwordChangeReauthError, setPasswordChangeReauthError] = useState<string | null>(null);

  const { currentUser, logout } = useAuth();

  // Fetch user email from Firestore
  useEffect(() => {
    const fetchUserEmail = async () => {
      if (!currentUser) {
        setUserEmail(null);
        setIsLoadingEmail(false);
        return;
      }

      try {
        setIsLoadingEmail(true);
        setEmailError(null);

        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setUserEmail(userData.email || 'No email found');
          // Load 2FA status from user's enrolled factors
          setIs2FAEnabled(userData.mfaEnabled || false);
        } else {
          setUserEmail('No email found');
        }
      } catch (error: any) {
        console.error('Error fetching user email:', error);
        let errorMessage = 'Failed to load email';

        if (error.code === 'permission-denied') {
          errorMessage = 'Access denied to email information';
        } else if (error.code === 'unavailable') {
          errorMessage = 'Service temporarily unavailable, try again later';
        } else if (error.code === 'unauthenticated') {
          errorMessage = 'Authentication required';
        }

        setEmailError(errorMessage);
        setShowEmailModal(true);
        setUserEmail(null);
      } finally {
        setIsLoadingEmail(false);
      }
    };

    fetchUserEmail();
  }, [currentUser]);

  // Page load animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Debug: Monitor mfaResolver changes
  useEffect(() => {
    console.log('mfaResolver state changed:', mfaResolver);
    if (mfaResolver) {
      console.log('mfaResolver hints:', mfaResolver.hints);
    }
  }, [mfaResolver]);

  const handlePasswordChangeRequest = () => {
    // Mostrar modal de verificación de identidad
    setShowPasswordChangeReauthModal(true);
  };

  const handlePasswordChangeReauthenticate = async () => {
    if (!currentUser || !passwordChangeReauthPassword.trim()) return;

    try {
      setIsPasswordChangeReauthenticating(true);
      setPasswordChangeReauthError(null);

      const credential = EmailAuthProvider.credential(
        currentUser.email!,
        passwordChangeReauthPassword
      );

      await reauthenticateWithCredential(currentUser, credential);

      // Si la re-autenticación fue exitosa, cerrar modal y enviar correo de cambio de contraseña
      setShowPasswordChangeReauthModal(false);
      setPasswordChangeReauthPassword('');
      setPasswordChangeReauthError(null);

      // Enviar correo de cambio de contraseña
      try {
        setIsLoadingPasswordReset(true);
        await sendPasswordResetEmail(auth, userEmail!);
        setIsPasswordChangeRequested(true);
        setShowPasswordConfirmation(true);
        setIsLoadingPasswordReset(false);

        // Close session after 8 seconds
        setTimeout(async () => {
          await logout();
        }, 8000);
      } catch (error: any) {
        console.error('Error sending password reset email:', error);
        setIsLoadingPasswordReset(false);

        // Handle different error types
        let errorMessage = 'Failed to send password reset email, please try again';

        if (error.code === 'auth/user-not-found') {
          errorMessage = 'No user found with this email address';
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = 'Invalid email address';
        } else if (error.code === 'auth/too-many-requests') {
          errorMessage = 'Too many failed attempts, please try again later';
        } else if (error.code === 'auth/network-request-failed') {
          errorMessage = 'You are experiencing network errors, please try again';
        }

        setPasswordResetError(errorMessage);
        setShowPasswordResetErrorModal(true);
      }
    } catch (error: any) {
      console.error('Re-authentication error:', error);

      let errorMessage = 'Failed to verify your password, please try again';

      if (error.code === 'auth/multi-factor-auth-required') {
        errorMessage = 'Please disable 2FA to delete your account';
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'Incorrect password, please try again';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts, please try again later';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error, please check your connection';
      }

      setPasswordChangeReauthError(errorMessage);
    } finally {
      setIsPasswordChangeReauthenticating(false);
    }
  };

  const handleClosePasswordChangeReauthModal = () => {
    setShowPasswordChangeReauthModal(false);
    setPasswordChangeReauthPassword('');
    setPasswordChangeReauthError(null);
  };

  const handle2FAToggle = async () => {
    if (!currentUser || isLoading2FA) return;

    const newState = !is2FAEnabled;

    // Si está activando 2FA, primero re-autenticar y luego mostrar modal de configuración
    if (newState === true) {
      setShowReauthModal(true);
      return;
    }

    // Si está desactivando 2FA, necesitamos re-autenticar primero
    if (newState === false && is2FAEnabled) {
      // Mostrar modal de re-autenticación para desactivar 2FA
      setShowReauthModal(true);
      return;
    }

    // Este código no debería ejecutarse, pero lo dejamos como fallback
    setIsLoading2FA(true);
    console.log('Toggling 2FA to:', newState);

    try {
      const idToken = await currentUser.getIdToken();
      console.log('ID Token obtained');

      const response = await fetch('https://us-central1-majorphonesv3.cloudfunctions.net/mfaEnabled', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': idToken
        },
        body: JSON.stringify({
          enabled: newState
        })
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Cloud Function response:', data);

      if (response.ok && data.success) {
        setIs2FAEnabled(newState);
        setShow2FAConfirmation(true);

        setTimeout(() => {
          setShow2FAConfirmation(false);
        }, 3000);
      } else {
        throw new Error(data.error || 'Failed to update 2FA settings');
      }
    } catch (error: any) {
      console.error('Error toggling 2FA:', error);
      
      let errorMessage = 'Failed to update Two-Factor Authentication. Please try again.';
      
      if (error.message) {
        errorMessage = error.message;
      }

      setTwoFAError(errorMessage);
      setShow2FAErrorModal(true);
    } finally {
      setIsLoading2FA(false);
    }
  };

  const handleEmailModalClose = () => {
    setShowEmailModal(false);
  };

  const handlePasswordResetErrorModalClose = () => {
    setShowPasswordResetErrorModal(false);
  };

  const handle2FAErrorModalClose = () => {
    setShow2FAErrorModal(false);
  };

  const handleReauthenticate = async () => {
    // Limpiar error previo
    setReauthError(null);
    
    if (!reauthPassword.trim() || !currentUser || !userEmail) {
      setReauthError('Please enter your password');
      return;
    }

    setIsReauthenticating(true);

    try {
      // Re-autenticar al usuario
      const credential = EmailAuthProvider.credential(userEmail, reauthPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Re-autenticación exitosa
      setShowReauthModal(false);
      setReauthPassword('');
      setReauthError(null);

      // Si el 2FA ya está activado, significa que el usuario quiere desactivarlo
      if (is2FAEnabled) {
        await handleDisable2FA();
      } else {
        // Si el 2FA está desactivado, significa que el usuario quiere activarlo
        setShow2FASetupModal(true);
        setSetupStep('totp');
        setVerificationCode('');
      }
    } catch (error: any) {
      console.error('Error re-authenticating:', error);
      
      // Si el error es por MFA requerido, manejar el desafío
      if (error.code === 'auth/multi-factor-auth-required') {
        console.log('MFA challenge required for re-authentication');
        
        try {
          // Usar getMultiFactorResolver para obtener el resolver del error
          const resolver = getMultiFactorResolver(auth, error);
          console.log('MFA Resolver obtained:', resolver);
          console.log('MFA hints:', resolver.hints);
          
          // Establecer todos los estados necesarios
          setMfaResolver(resolver);
          setShowReauthModal(false);
          setReauthPassword('');
          setReauthError(null);
          setShowMFAChallengeModal(true);
          
          // No establecer isReauthenticating a false aquí, el finally lo hará
          return;
        } catch (resolverError: any) {
          console.error('Error getting MFA resolver:', resolverError);
          setReauthError('Unable to get MFA resolver. Please try again or contact support.');
          return;
        }
      }
      
      let errorMessage = 'Failed to verify your password, please try again';
      
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'Incorrect password, please try again';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts, please try again later';
      } else if (error.code === 'auth/mfa-enrollment-already-complete') {
        errorMessage = 'Please refresh and try again';
      }

      setReauthError(errorMessage);
    } finally {
      setIsReauthenticating(false);
    }
  };

  const handleCloseReauthModal = () => {
    setShowReauthModal(false);
    setReauthPassword('');
    setReauthError(null);
  };

  const handleMFAChallenge = async () => {
    console.log('=== handleMFAChallenge CALLED ===');
    console.log('mfaChallengeCode:', mfaChallengeCode);
    console.log('mfaResolver:', mfaResolver);
    console.log('isSolvingMFA:', isSolvingMFA);
    
    // Limpiar error previo
    setMfaChallengeError(null);
    
    if (!mfaChallengeCode.trim()) {
      console.log('Validation failed - missing code');
      setMfaChallengeError('Please enter the verification code from your authenticator app');
      return;
    }

    if (mfaChallengeCode.trim().length !== 6) {
      setMfaChallengeError('Verification code must be 6 digits');
      return;
    }

    if (!mfaResolver) {
      console.log('Validation failed - missing resolver');
      setMfaChallengeError('Session expired. Please try again.');
      setTimeout(() => {
        setShowMFAChallengeModal(false);
        setMfaChallengeCode('');
        setMfaChallengeError(null);
      }, 3000);
      return;
    }

    console.log('Validation passed - setting isSolvingMFA to true');
    setIsSolvingMFA(true);

    try {
      console.log('MFA Challenge: Starting verification...');
      console.log('MFA Resolver hints:', mfaResolver.hints);
      
      // Obtener el hint del factor TOTP
      const selectedHint = mfaResolver.hints[0];
      console.log('Selected hint:', selectedHint);
      
      // Crear la aserción para resolver el desafío
      const multiFactorAssertion = TotpMultiFactorGenerator.assertionForSignIn(
        selectedHint.uid,
        mfaChallengeCode.trim()
      );
      console.log('MFA assertion created');

      // Resolver el desafío MFA - esto completa la re-autenticación
      const userCredential = await mfaResolver.resolveSignIn(multiFactorAssertion);
      console.log('MFA challenge resolved successfully', userCredential);

      // Re-autenticación exitosa con MFA
      setShowMFAChallengeModal(false);
      setMfaChallengeCode('');
      setMfaChallengeError(null);
      setMfaResolver(null);

      // Proceder a desactivar el 2FA
      console.log('Proceeding to disable 2FA...');
      await handleDisable2FA();
    } catch (error: any) {
      console.error('Error resolving MFA challenge:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      let errorMessage = 'Failed to verify code, please try again';

      if (error.code === 'auth/invalid-verification-code') {
        errorMessage = 'Invalid code, please try again';
      } else if (error.code === 'auth/code-expired') {
        errorMessage = 'Code expired, please try again';
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Mostrar error en el modal MFA en lugar de abrir otra modal
      // Usar setTimeout para evitar conflictos de renderizado
      setTimeout(() => {
        setMfaChallengeError(errorMessage);
        setMfaChallengeCode(''); // Limpiar el código para que el usuario ingrese uno nuevo
      }, 0);
    } finally {
      setIsSolvingMFA(false);
    }
  };

  const handleCloseMFAChallengeModal = () => {
    setShowMFAChallengeModal(false);
    setMfaChallengeCode('');
    setMfaChallengeError(null);
    setMfaResolver(null);
  };

  const handleDisable2FA = async () => {
    // Usar auth.currentUser directamente para obtener el usuario más actualizado
    const user = auth.currentUser;
    if (!user) {
      console.error('No current user found');
      setTwoFAError('User session not found. Please try again.');
      setShow2FAErrorModal(true);
      return;
    }

    setIsLoading2FA(true);
    console.log('Disabling 2FA...');
    console.log('Current user UID:', user.uid);

    try {
      // Primero desenrollar todos los factores MFA del usuario
      const enrolledFactors = multiFactor(user).enrolledFactors;
      console.log('Enrolled factors:', enrolledFactors.length);
      
      if (enrolledFactors.length > 0) {
        console.log('Unenrolling MFA factors...', enrolledFactors.length);
        
        // Desenrollar cada factor
        for (const factor of enrolledFactors) {
          try {
            console.log('Attempting to unenroll factor:', factor.uid);
            await multiFactor(user).unenroll(factor);
            console.log('Successfully unenrolled factor:', factor.uid);
          } catch (unenrollError: any) {
            console.error('Error unenrolling factor:', unenrollError);
            console.error('Error code:', unenrollError.code);
            console.error('Error message:', unenrollError.message);
            // Continuar con el siguiente factor
          }
        }
      } else {
        console.log('No enrolled factors found');
      }

      // Luego actualizar Firestore
      console.log('Getting ID token...');
      const idToken = await user.getIdToken(true); // Force refresh token
      console.log('ID token obtained');
      
      const response = await fetch('https://us-central1-majorphonesv3.cloudfunctions.net/mfaEnabled', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': idToken
        },
        body: JSON.stringify({
          enabled: false
        })
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Cloud Function response:', data);

      if (response.ok && data.success) {
        console.log('2FA disabled successfully');
        setIs2FAEnabled(false);
        setShow2FAConfirmation(true);

        setTimeout(() => {
          setShow2FAConfirmation(false);
        }, 3000);
      } else {
        throw new Error(data.error || 'Failed to disable 2FA');
      }
    } catch (error: any) {
      console.error('Error disabling 2FA:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      let errorMessage = 'Failed to disable Two-Factor Authentication. Please try again.';
      
      if (error.message) {
        errorMessage = error.message;
      }

      setTwoFAError(errorMessage);
      setShow2FAErrorModal(true);
    } finally {
      setIsLoading2FA(false);
      console.log('handleDisable2FA completed');
    }
  };

  // Funciones para eliminación de cuenta
  const handleDeleteAccountClick = () => {
    const user = auth.currentUser;
    if (user) {
      // Detectar si el usuario usa Google
      const hasGoogleProvider = user.providerData.some(
        provider => provider.providerId === 'google.com'
      );
      const hasPasswordProvider = user.providerData.some(
        provider => provider.providerId === 'password'
      );
      setIsGoogleUser(hasGoogleProvider && !hasPasswordProvider);
    }
    
    setShowDeleteAccountModal(true);
    setDeleteAccountPassword('');
    setDeleteAccountError(null);
  };

  const handleCloseDeleteAccountModal = () => {
    setShowDeleteAccountModal(false);
    setDeleteAccountPassword('');
    setDeleteAccountError(null);
  };

  const handleDeleteAccount = async () => {
    const user = auth.currentUser;
    if (!user) {
      setDeleteAccountError('User session not found');
      return;
    }

    setIsDeletingAccount(true);
    setDeleteAccountError(null);

    try {
      console.log('Re-authenticating user for account deletion...');
      console.log('User providers:', user.providerData);
      
      // Verificar qué proveedor de autenticación usa el usuario
      const hasPasswordProvider = user.providerData.some(
        provider => provider.providerId === 'password'
      );
      const hasGoogleProvider = user.providerData.some(
        provider => provider.providerId === 'google.com'
      );

      if (hasGoogleProvider && !hasPasswordProvider) {
        // Usuario de Google - re-autenticar con popup
        console.log('Google user detected, re-authenticating with popup...');
        const provider = new GoogleAuthProvider();
        await reauthenticateWithPopup(user, provider);
      } else if (hasPasswordProvider) {
        // Usuario con contraseña - re-autenticar con credenciales
        if (!deleteAccountPassword.trim()) {
          setDeleteAccountError('Please enter your password');
          return;
        }

        if (!user.email) {
          setDeleteAccountError('User email not found');
          return;
        }

        console.log('Password user detected, re-authenticating with credentials...');
        const credential = EmailAuthProvider.credential(user.email, deleteAccountPassword);
        await reauthenticateWithCredential(user, credential);
      } else {
        setDeleteAccountError('Unknown authentication provider');
        return;
      }
      
      console.log('Re-authentication successful, deleting account...');

      // Eliminar el usuario de Firebase Authentication
      await deleteUser(user);
      
      console.log('Account deleted successfully');

      // Cerrar sesión
      await logout();
      
    } catch (error: any) {
      console.error('Error deleting account:', error);
      console.error('Error code:', error.code);

      let errorMessage = 'Failed to delete account, please try again';

      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'Incorrect password, please try again';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts, please try again later';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error, please check your connection';
      } else if (error.code === 'auth/multi-factor-auth-required') {
        errorMessage = 'Please disable 2FA to delete your account';
      } else if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        errorMessage = 'Authentication cancelled, please try again';
      } else if (error.code === 'auth/mfa-enrollment-already-complete') {
        errorMessage = 'Please refresh and try again';
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Usar setTimeout para evitar conflictos de renderizado
      setTimeout(() => {
        setDeleteAccountError(errorMessage);
      }, 0);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleGenerateTOTP = async () => {
    if (!currentUser) return;

    setIsEnrolling(true);

    try {
      // Get multi-factor session
      const multiFactorSession = await multiFactor(currentUser).getSession();
      
      // Generate TOTP secret using Firebase API
      const totpSecretObj = await TotpMultiFactorGenerator.generateSecret(multiFactorSession);
      
      setTotpSecret(totpSecretObj);
      
      // Generate QR code URL for authenticator apps
      const accountName = userEmail || currentUser.email || 'User';
      const issuer = 'Major Phones';
      const totpUri = totpSecretObj.generateQrCodeUrl(accountName, issuer);
      
      // Convert the otpauth:// URI to a QR code data URL
      const qrCodeDataUrl = await QRCode.toDataURL(totpUri, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrCodeUrl(qrCodeDataUrl);
    } catch (error: any) {
      console.error('Error generating TOTP:', error);
      let errorMessage = 'Failed to generate authentication code. Please try again.';

      setTwoFAError(errorMessage);
      setShow2FAErrorModal(true);
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleVerifyTOTP = async () => {
    if (!verificationCode.trim() || !currentUser || !totpSecret) {
      setTwoFAError('Please enter the verification code from your authenticator app');
      setShow2FAErrorModal(true);
      return;
    }

    setIsEnrolling(true);

    try {
      // Create TOTP assertion with the secret and verification code
      const multiFactorAssertion = TotpMultiFactorGenerator.assertionForEnrollment(
        totpSecret,
        verificationCode
      );

      // Enroll the TOTP factor
      await multiFactor(currentUser).enroll(multiFactorAssertion, 'Authenticator App');

      // Call cloud function to update Firestore
      const idToken = await currentUser.getIdToken();
      const response = await fetch('https://us-central1-majorphonesv3.cloudfunctions.net/mfaEnabled', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': idToken
        },
        body: JSON.stringify({
          enabled: true
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIs2FAEnabled(true);
        setShow2FASetupModal(false);
        setShow2FAConfirmation(true);

        setTimeout(() => {
          setShow2FAConfirmation(false);
        }, 3000);
      } else {
        throw new Error(data.error || 'Failed to enable 2FA');
      }
    } catch (error: any) {
      console.error('Error verifying TOTP:', error);
      let errorMessage = 'Failed to verify code, please try again';

      if (error.code === 'auth/invalid-verification-code') {
        errorMessage = 'Invalid code, please try again';
      } else if (error.code === 'auth/code-expired') {
        errorMessage = 'Setup session expired, please refresh and try again';
      }

      // Mostrar error dentro de la modal en lugar de abrir otra modal
      // Usar setTimeout para evitar conflictos de renderizado
      setTimeout(() => {
        setSetupError(errorMessage);
        setVerificationCode(''); // Limpiar el código para que el usuario ingrese uno nuevo
      }, 0);
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleClose2FASetupModal = () => {
    setShow2FASetupModal(false);
    setVerificationCode('');
    setTotpSecret(null);
    setQrCodeUrl('');
    setSetupStep('totp');
    setSetupError(null);
  };

  const renderEmailContent = () => {
    if (isLoadingEmail) {
      return (
        <div className="flex justify-center">
          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      );
    }

    if (emailError) {
      return '-';
    }

    return userEmail || '-';
  };

  return (
    <>
      {/* Custom Scrollbar Styles */}
      <style>{`
        .dashboard-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .dashboard-scrollbar::-webkit-scrollbar-track {
          background: rgba(30, 41, 59, 0.3);
          border-radius: 10px;
        }
        .dashboard-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(71, 85, 105, 0.6);
          border-radius: 10px;
          transition: background 0.3s ease;
        }
        .dashboard-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(71, 85, 105, 0.8);
        }
      `}</style>
      
    <DashboardLayout currentPath="/profile">
      
      <div className={`space-y-6 transition-all duration-1000 ${isLoaded ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'}`}>
        {/* Header */}
        <div 
          className="group rounded-3xl shadow-2xl border border-slate-700/50 p-6 relative overflow-hidden hover:shadow-3xl transition-all duration-500 hover:scale-[1.01] cursor-pointer"
          style={{
            backgroundColor: '#1e293b',
            animationDelay: '200ms',
            animation: isLoaded ? 'slideInFromTop 0.8s ease-out forwards' : 'none'
          }}
        >
          
          <div className="relative z-10">
            <div className="flex items-center space-x-4 group-hover:transform group-hover:translate-x-2 transition-transform duration-500">
              
              <div>
                <h1 className="text-left text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent group-hover:from-cyan-300 group-hover:to-blue-300 transition-all duration-500">
                  Profile Settings
                </h1>
                <p className="text-left text-slate-300 text-md group-hover:text-slate-200 transition-colors duration-300">Manage your account settings and security preferences</p>
              </div>
            </div>
          </div>
        </div>

        {/* Information Section - Always on top */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-3xl p-4 mb-6">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <p className="text-blue-300 text-sm font-semibold mb-3">Important information:</p>
              <ul className="text-blue-200 text-xs mt-1 space-y-2 text-left">
                <li>• If you signed up through Google, you can't change your password</li>
                <li>• Users that signed up through Google can't add a password to their Major Phones account</li>
                <li>• If you signed up through Google, you can't add 2FA to your account</li>
                <li>• If you lose access to your account and it has 2FA enabled, we can't recover it for you, the account and all its data (info, balance) will be lost</li>
                <li>• If you have 2FA enabled, you can't request password reset link or delete your account</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div 
          className="group rounded-3xl shadow-2xl border border-slate-600/50 p-6 relative overflow-hidden hover:shadow-3xl transition-all duration-500"
          style={{
            backgroundColor: '#1e293b',
            animationDelay: '800ms',
            animation: isLoaded ? 'slideInFromBottom 0.8s ease-out forwards' : 'none'
          }}
        >
          
          <div className="relative z-10 p-2">
            <div className="justify-center space-y-8">
              
              {/* Account Information Section */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300 group/section">
                <div className="flex items-center space-x-3 mb-4 group-hover/section:transform group-hover/section:translate-y-1 transition-transform duration-300">
                  <p className="font-bold bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent group-hover/section:from-cyan-300 group-hover/section:to-blue-300 transition-all duration-500" style={{ fontSize: '1.2rem' }}>Email Address</p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl border border-slate-600/50 hover:bg-slate-600/50 hover:border-slate-500/50 transition-all duration-300 group/email">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <svg className="w-5 h-5 text-slate-400 group-hover/email:text-blue-400 transition-colors duration-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-white font-mono text-md group-hover/email:text-blue-100 transition-colors duration-300 truncate">{renderEmailContent()}</span>
                      </div>
                      <div className="flex-shrink-0 ml-3">
                        <span className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/30 rounded-lg text-sm font-semibold group-hover/email:bg-green-500/20 group-hover/email:border-green-500/40 transition-all duration-300">
                          Verified
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Section */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300 group/section">
                <div className="flex items-center space-x-3 mb-4 group-hover/section:transform group-hover/section:translate-y-1 transition-transform duration-300">
                  <h2 className="font-bold bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent group-hover/section:from-cyan-300 group-hover/section:to-blue-300 transition-all duration-500" style={{ fontSize: '1.2rem' }}>Security Settings</h2>
                </div>
                
                <div className="space-y-6">
                  {/* Password Change */}
                  <div className="p-6 bg-slate-700/30 rounded-xl border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300 group/item">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center space-x-4 group-hover/item:transform group-hover/item:translate-x-2 transition-transform duration-500 flex-1 min-w-0">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-left font-bold text-white group-hover/item:text-yellow-100 transition-colors duration-300" style={{ fontSize: '1rem' }}>Password Change</h3>
                          <p className="text-left text-slate-400 group-hover/item:text-slate-300 transition-colors duration-300">Request a password reset via email</p>
                        </div>
                      </div>
                      {!showPasswordConfirmation && (
                        <div className="flex-shrink-0">
                          <button
                            onClick={handlePasswordChangeRequest}
                            disabled={isPasswordChangeRequested || isLoadingPasswordReset || isLoading2FA}
                            style={{ width: window.innerWidth < 640 ? '100%' : '140px' }}
                            className={`p-3 rounded-xl font-semibold transition-all duration-300 hover:shadow-xl hover:scale-105 text-sm ${
                              isPasswordChangeRequested || isLoadingPasswordReset || isLoading2FA
                                ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg'
                            }`}
                          >
                            {isLoadingPasswordReset ? (
                              <div className="flex justify-center items-center">
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              </div>
                            ) : (
                              'Request Change'
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {showPasswordConfirmation && (
                      <div className="mt-3 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <div className="flex items-center sm:space-x-2">
                          <svg className="hidden sm:block w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-green-400 font-semibold mb-1 break-words text-sm">Password reset email sent, your session will be closed for security purposes</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="p-6 bg-slate-700/30 rounded-xl border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300 group/item">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center space-x-4 group-hover/item:transform group-hover/item:translate-x-2 transition-transform duration-500 flex-1 min-w-0">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-left font-bold text-white group-hover/item:text-purple-100 transition-colors duration-300" style={{ fontSize: '1rem' }}>Two-Factor Authentication</h3>
                          <p className="text-left text-slate-400 group-hover/item:text-slate-300 transition-colors duration-300">Add an extra layer of security to your account</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-4 flex-shrink-0 min-w-0">
                        {!isLoading2FA && (
                          <span className={`text-sm font-semibold flex-shrink-0 ${is2FAEnabled ? 'text-green-400' : 'text-slate-400'}`}>
                            {is2FAEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        )}
                        <button
                          onClick={handle2FAToggle}
                          disabled={isLoading2FA || isLoadingPasswordReset || isPasswordChangeRequested}
                          className={`relative inline-flex h-8 w-16 items-center rounded-full transition-all duration-300 shadow-lg flex-shrink-0 ${
                            isLoading2FA || isLoadingPasswordReset || isPasswordChangeRequested
                              ? 'bg-slate-500 cursor-not-allowed opacity-50'
                              : is2FAEnabled
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                : 'bg-slate-600'
                          }`}
                        >
                          {isLoading2FA ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            </div>
                          ) : (
                            <span
                              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-all duration-300 ${
                                is2FAEnabled ? 'translate-x-9 shadow-green-500/50' : 'translate-x-1'
                              }`}
                            />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {show2FAConfirmation && (
                      <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <div className="flex items-start sm:space-x-3">
                          <svg className="hidden sm:block w-5 h-5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-blue-400 font-semibold mb-1 break-words text-sm">
                            Two-Factor Authentication has been {is2FAEnabled ? 'enabled' : 'disabled'}
                          </span>
                        </div>
                      </div>
                    )}

                    {is2FAEnabled && !show2FAConfirmation && (
                      <div className="mt-3 p-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                        <div className="flex items-start sm:space-x-3">
                          <svg className="hidden sm:block w-5 h-5 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className="text-purple-400 font-semibold mb-1 break-words text-sm">Two-Factor Authentication is already enabled</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Delete Account */}
                  <div className="p-6 bg-slate-700/30 rounded-xl border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300 group/item">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center space-x-4 group-hover/item:transform group-hover/item:translate-x-2 transition-transform duration-500 flex-1 min-w-0">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-left font-bold text-white group-hover/item:text-red-100 transition-colors duration-300" style={{ fontSize: '1rem' }}>Delete Account</h3>
                          <p className="text-left text-slate-400 group-hover/item:text-slate-300 transition-colors duration-300">Permanently remove your account and all data</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <button
                          onClick={handleDeleteAccountClick}
                          disabled={isLoading2FA || isLoadingPasswordReset || isPasswordChangeRequested}
                          style={{ width: window.innerWidth < 640 ? '100%' : '140px' }}
                          className={`p-3 rounded-xl font-semibold transition-all duration-300 hover:shadow-xl hover:scale-105 text-sm ${
                            isLoading2FA || isLoadingPasswordReset || isPasswordChangeRequested
                              ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30 cursor-not-allowed'
                              : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-lg'
                          }`}
                        >
                          Delete Account
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Error Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-80">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-12 h-12 mx-auto bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Email Error</h3>
              <p className="text-blue-200 mb-4">{emailError}</p>
              <button
                onClick={handleEmailModalClose}
                className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Error Modal */}
      {showPasswordResetErrorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-80">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-12 h-12 mx-auto bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Password Reset Error</h3>
              <p className="text-blue-200 mb-4">{passwordResetError}</p>
              <button
                onClick={handlePasswordResetErrorModalClose}
                className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Error Modal */}
      {show2FAErrorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-80">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-12 h-12 mx-auto bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">2FA Configuration Error</h3>
              <p className="text-blue-200 mb-4">{twoFAError}</p>
              <button
                onClick={handle2FAErrorModalClose}
                className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Re-authentication Modal */}
      {showReauthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-96 max-w-full mx-4">
            <div className="text-center">
              {/* Header */}
              <div className="mb-4">
                <div className="w-12 h-12 mx-auto bg-blue-500 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Verify Your Identity</h3>
                <p className="text-blue-200 mb-4">
                  Please enter your password to continue
                </p>
              </div>

              {/* Password Input */}
              <div className="space-y-4">
                <div>
                  <input
                    id="reauthPassword"
                    type="password"
                    value={reauthPassword}
                    onChange={(e) => {
                      setReauthPassword(e.target.value);
                      setReauthError(null); // Limpiar error cuando el usuario empieza a escribir
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && !isReauthenticating && handleReauthenticate()}
                    placeholder="Enter your password"
                    className="w-full px-3 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-md placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-300"
                    disabled={isReauthenticating}
                    autoFocus
                  />
                </div>

                {/* Mensaje de error */}
                {reauthError && (
                  <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-red-400 text-sm">{reauthError}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleCloseReauthModal}
                    disabled={isReauthenticating}
                    className="flex-1 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReauthenticate}
                    disabled={isReauthenticating || !reauthPassword.trim()}
                    className="flex-1 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isReauthenticating ? (
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
        </div>
      )}

      {/* Password Change Re-authentication Modal */}
      {showPasswordChangeReauthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-96 max-w-full mx-4">
            <div className="text-center">
              {/* Header */}
              <div className="mb-4">
                <div className="w-12 h-12 mx-auto bg-blue-500 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Verify Your Identity</h3>
                <p className="text-blue-200 mb-4">
                  Please enter your password to continue
                </p>
              </div>

              {/* Password Input */}
              <div className="space-y-4">
                <div>
                  <input
                    id="passwordChangeReauthPassword"
                    type="password"
                    value={passwordChangeReauthPassword}
                    onChange={(e) => {
                      setPasswordChangeReauthPassword(e.target.value);
                      setPasswordChangeReauthError(null);
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && !isPasswordChangeReauthenticating && passwordChangeReauthPassword.trim() && handlePasswordChangeReauthenticate()}
                    placeholder="Enter your password"
                    className="w-full px-3 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-md placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-300"
                    disabled={isPasswordChangeReauthenticating}
                    autoFocus
                  />
                </div>

                {/* Mensaje de error */}
                {passwordChangeReauthError && (
                  <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-red-400 text-sm">{passwordChangeReauthError}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleClosePasswordChangeReauthModal}
                    disabled={isPasswordChangeReauthenticating}
                    className="flex-1 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePasswordChangeReauthenticate}
                    disabled={isPasswordChangeReauthenticating || !passwordChangeReauthPassword.trim()}
                    className="flex-1 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPasswordChangeReauthenticating ? (
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
        </div>
      )}

      {/* MFA Challenge Modal for Disabling 2FA */}
      {showMFAChallengeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-96 max-w-full mx-4">
            <div className="text-center">
              {/* Header */}
              <div className="mb-4">
                <div className="w-12 h-12 mx-auto bg-blue-500 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Two-Factor Authentication Required</h3>
                <p className="text-blue-200 mb-4">
                  Enter the 6-digit code from your authenticator app to continue
                </p>
              </div>

              {/* MFA Code Input */}
              <div className="space-y-4">
                <div>
                  <input
                    id="mfaChallengeCode"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={mfaChallengeCode}
                    onChange={(e) => {
                      setMfaChallengeCode(e.target.value.replace(/\D/g, ''));
                      setMfaChallengeError(null); // Limpiar error cuando el usuario empieza a escribir
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && mfaChallengeCode.length === 6 && !isSolvingMFA && handleMFAChallenge()}
                    placeholder="000000"
                    className="w-full px-2 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-center text-lg tracking-widest placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-300 font-mono"
                    disabled={isSolvingMFA}
                    autoFocus
                  />
                </div>

                {/* Mensaje de error */}
                {mfaChallengeError && (
                  <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-red-400 text-sm">{mfaChallengeError}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleCloseMFAChallengeModal}
                    disabled={isSolvingMFA}
                    className="flex-1 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleMFAChallenge}
                    disabled={isSolvingMFA || mfaChallengeCode.length !== 6}
                    className="flex-1 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSolvingMFA ? (
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
        </div>
      )}

      {/* 2FA Setup Modal */}
      {show2FASetupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-96 max-w-full mx-4">
            <div className="text-center">
              {/* Header */}
              <div className="mb-4">
                <div className="w-12 h-12 mx-auto bg-blue-500 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Set Up Two-Factor Authentication</h3>
                <p className="text-blue-200 mb-4">
                  {setupStep === 'totp' 
                    ? 'Scan the QR code with your Authenticator or Authy app' 
                    : 'Enter the 6-digit code from your authenticator app'}
                </p>
              </div>

              {/* TOTP Setup Step - Show QR Code */}
              {setupStep === 'totp' && (
                <div className="space-y-4">
                  {qrCodeUrl ? (
                    <>
                      <div className="flex justify-center">
                        <div className="bg-white p-1 rounded-xl inline-block">
                          <img src={qrCodeUrl} alt="QR Code for 2FA" className="w-auto h-auto" style={{ maxWidth: '200px' }} />
                        </div>
                      </div>
                      {totpSecret && (
                        <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-3 mb-3">
                          <p className="text-gray-300 text-xs text-center mb-1">Enter this key manually if you can't scan the QR code</p>
                          <p className="text-white text-sm text-center font-mono bg-gray-900/50 py-2 px-2 rounded break-all select-all">
                            {totpSecret.secretKey}
                          </p>
                        </div>
                      )}
                      <div className="flex gap-3">
                        <button
                          onClick={handleClose2FASetupModal}
                          className="flex-1 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => setSetupStep('verify')}
                          className="flex-1 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
                        >
                          Enter Code
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex gap-3">
                        <button
                          onClick={handleClose2FASetupModal}
                          disabled={isEnrolling}
                          className="flex-1 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleGenerateTOTP}
                          disabled={isEnrolling}
                          className="flex-1 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isEnrolling ? (
                            <div className="flex items-center justify-center">
                              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            </div>
                          ) : (
                            'Get QR Code'
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Verification Code Step */}
              {setupStep === 'verify' && (
                <div className="space-y-4">
                  <div>
                    <input
                      id="verificationCode"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => {
                        setVerificationCode(e.target.value.replace(/\D/g, ''));
                        setSetupError(null); // Limpiar error cuando el usuario empieza a escribir
                      }}
                      placeholder="000000"
                      className="w-full px-2 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-center text-lg tracking-widest placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-300 font-mono"
                      disabled={isEnrolling}
                      autoFocus
                    />
                  </div>

                  {/* Mensaje de error */}
                  {setupError && (
                    <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-red-400 text-sm">{setupError}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setSetupStep('totp');
                        setSetupError(null);
                      }}
                      disabled={isEnrolling}
                      className="flex-1 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleVerifyTOTP}
                      disabled={isEnrolling || verificationCode.length !== 6}
                      className="flex-1 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isEnrolling ? (
                        <div className="flex items-center justify-center">
                          <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                      ) : (
                        'Verify & Enable'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-96 max-w-full mx-4">
            <div className="text-center">
              {/* Header */}
              <div className="mb-4">
                <div className="w-12 h-12 mx-auto bg-red-500 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Delete Account</h3>
                <p className="text-red-200 mb-4">
                  This action cannot be undone and your account will be permanently deleted
                </p>
              </div>

              {/* Password Input or Google Confirmation */}
              <div className="space-y-4">
                {!isGoogleUser ? (
                  <div>
                    <input
                      id="deleteAccountPassword"
                      type="password"
                      value={deleteAccountPassword}
                      onChange={(e) => {
                        setDeleteAccountPassword(e.target.value);
                        setDeleteAccountError(null);
                      }}
                      onKeyPress={(e) => e.key === 'Enter' && !isDeletingAccount && deleteAccountPassword.trim() && handleDeleteAccount()}
                      placeholder="Enter your password to proceed"
                      className="w-full px-3 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-md placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all duration-300"
                      disabled={isDeletingAccount}
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      <div className="text-blue-200 text-sm">
                        <p>Sign in with Google to proceed</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error message */}
                {deleteAccountError && (
                  <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-red-400 text-sm">{deleteAccountError}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleCloseDeleteAccountModal}
                    disabled={isDeletingAccount}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeletingAccount || (!isGoogleUser && !deleteAccountPassword.trim())}
                    className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeletingAccount ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    ) : (
                      'Delete'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
    </>
  );
};

export default Profile;