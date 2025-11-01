import React, { useState } from 'react';
import { getAuth, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import MajorPhonesFavIc from '../MajorPhonesFavIc.png';

const MajorVccStock: React.FC = () => {
  const navigate = useNavigate();
  const [cardNumber, setCardNumber] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [price, setPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLoad = async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        setErrorMessage('User not authenticated');
        return;
      }

      const idToken = await currentUser.getIdToken();

      // Determinar balance según price
      const balance = price === 4 ? 0 : price === 9 ? 3 : 0;

      const vccData = {
        cardNumber,
        expirationDate,
        cvv,
        price,
        balance
      };

      const response = await fetch('https://loadstockvcc-ezeznlhr5a-uc.a.run.app', {
        method: 'POST',
        headers: {
          'authorization': `${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(vccData)
      });

      if (response.status === 403) {
        // Forbidden - cerrar sesión y redirigir
        await signOut(auth);
        navigate('/signin');
        return;
      }

      if (!response.ok) {
        throw new Error('Internal Server Error');
      }

      // Éxito
      setShowSuccessModal(true);

      // Limpiar los inputs
      setCardNumber('');
      setExpirationDate('');
      setCvv('');
      setPrice(0);

    } catch (error) {
      setErrorMessage('An error occurred while loading the VCC, please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-left text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent">
                  VCC Stock
                </h1>
                <p className="text-slate-300 text-md text-left">Add VCC to stock</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card Options Section */}
        <div className="rounded-3xl shadow-2xl border border-slate-700/50 relative">
          <div className="p-6">
            <div className="relative z-10">
              {/* Header */}
              <div className="text-center">
                <p className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3">Load details</p>
              </div>

              {/* Card Display - Centered */}
              <div className="flex justify-center">
                
                <div className="flex flex-col space-y-6 max-w-lg w-full">
                    <div className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 rounded-2xl p-6 text-white relative overflow-hidden shadow-2xl border border-slate-600/50" style={{ boxShadow: '0 0 10px rgba(59, 130, 246, 0.3)' }}>
                        <div className="absolute inset-0 opacity-5">
                            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent"></div>
                            <div className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/5"></div>
                            <div className="absolute bottom-8 left-8 w-8 h-8 rounded-full bg-white/5"></div>
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-white/3"></div>
                        </div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-6">
                                <div className="text-left">
                                    <p className="text-md opacity-80 font-medium">Virtual Debit Card</p>
                                </div>
                                <img 
                                    src={MajorPhonesFavIc} 
                                    alt="MajorPhones" 
                                    className="w-12 h-10 object-contain hidden md:block"
                                />
                            </div>
                            <div className="mb-6">
                                <p className="text-sm opacity-60 mb-2 uppercase tracking-wider">Card Number</p>
                                <input
                                    type="text"
                                    placeholder="1234567890123456"
                                    autoComplete="off"
                                    value={cardNumber}
                                    onChange={(e) => setCardNumber(e.target.value)}
                                    disabled={loading}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-md font-mono font-light text-white placeholder-white/30 focus:outline-none focus:border-blue-400/50 focus:bg-white/10 transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                <div>
                                    <p className="text-sm opacity-60 mb-2 uppercase tracking-wider">Expires</p>
                                    <input
                                        type="text"
                                        placeholder="MM/YY"
                                        autoComplete="off"
                                        value={expirationDate}
                                        onChange={(e) => setExpirationDate(e.target.value)}
                                        disabled={loading}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-md font-mono font-light text-white placeholder-white/30 focus:outline-none focus:border-blue-400/50 focus:bg-white/10 transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <p className="text-sm opacity-60 mb-2 uppercase tracking-wider">CVV</p>
                                    <input
                                        type="text"
                                        placeholder="123"
                                        autoComplete="off"
                                        value={cvv}
                                        onChange={(e) => setCvv(e.target.value)}
                                        disabled={loading}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-md font-mono font-light text-white placeholder-white/30 focus:outline-none focus:border-blue-400/50 focus:bg-white/10 transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </div>
                                <div className="col-span-2 md:col-span-1 flex flex-col items-center">
                                    <p className="text-sm opacity-60 mb-2 uppercase tracking-wider">Price</p>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        autoComplete="off"
                                        value={price || ''}
                                        onChange={(e) => setPrice(Number(e.target.value))}
                                        disabled={loading}
                                        className="w-1/2 md:w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-md font-mono font-light text-white placeholder-white/30 focus:outline-none focus:border-blue-400/50 focus:bg-white/10 transition-all text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-center">
                        <button
                            onClick={handleLoad}
                            disabled={loading}
                            className="group relative px-8 py-2 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold rounded-lg transition-all duration-300 shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] text-md overflow-hidden w-[150px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-blue-700 hover:from-green-500 hover:to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative z-10 flex items-center justify-center">
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    'Load'
                                )}
                            </div>
                        </button>
                    </div>
                </div>

              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-80 max-w-md">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-12 h-12 mx-auto flex items-center justify-center bg-green-500/20 rounded-full">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Success</h3>
              <p className="text-blue-200 mb-4">This VCC has been loaded</p>
              <div className="flex justify-center">
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
                >
                  Ok
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {errorMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-80 max-w-md">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-12 h-12 mx-auto flex items-center justify-center bg-red-500/20 rounded-full">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Error</h3>
              <p className="text-blue-200 mb-4">{errorMessage}</p>
              <div className="flex justify-center">
                <button
                  onClick={() => setErrorMessage('')}
                  className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
                >
                  Ok
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MajorVccStock;