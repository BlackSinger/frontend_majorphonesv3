import React from 'react';
import MajorPhonesFavIc from '../MajorPhonesFavIc.png';

const MajorVccStock: React.FC = () => {

  const handlePurchase = () => {
    // Empty function - no purchase logic
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
                    <div className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 rounded-2xl p-6 text-white relative overflow-hidden shadow-2xl border border-slate-600/50 shadow-lg shadow-blue-500/25">
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
                                <p className="text-md font-mono font-light">**** **** **** ****</p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                <div>
                                    <p className="text-sm opacity-60 mb-2 uppercase tracking-wider">Expires</p>
                                    <p className="text-md font-mono font-light">**/**</p>
                                </div>
                                <div>
                                    <p className="text-sm opacity-60 mb-2 uppercase tracking-wider">CVV</p>
                                    <p className="text-md font-mono font-light">***</p>
                                </div>
                                <div className="col-span-2 md:col-span-1 flex flex-col items-center">
                                    <p className="text-sm opacity-60 mb-2 uppercase tracking-wider">Price</p>
                                    <p className="text-md font-mono font-light">***</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-center">
                        <button className="group relative px-8 py-2 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold rounded-lg transition-all duration-300 shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] text-md overflow-hidden w-[150px]">
                            <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-blue-700 hover:from-green-500 hover:to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative z-10 flex items-center justify-center">Load</div>
                        </button>
                    </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MajorVccStock;