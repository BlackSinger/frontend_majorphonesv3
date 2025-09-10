import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import ForgotPassword from './components/ForgotPassword';
import Dashboard from './components/Dashboard';
import ShortNumbers from './components/ShortNumbers';
import Middle from './components/Middle';
import LongTerm from './components/LongTerm';
import EmptySimcard from './components/EmptySimcard';
import History from './components/History';
import Transactions from './components/Transactions';
import Profile from './components/Profile';
import AddFunds from './components/AddFunds';
import Test from './components/Test';
import './App.css';

function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Bienvenido al Proyecto React
        </h1>
        <p className="text-lg text-gray-600">
          Proyecto React con React Router y Tailwind CSS configurados
        </p>
        <div className="mt-8 space-x-4">
          <a 
            href="/signin" 
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </a>
          <a 
            href="/signup" 
            className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            Sign Up
          </a>
          <a 
            href="/dashboard" 
            className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Dashboard
          </a>
        </div>
        <div className="mt-4">
          <a 
            href="/forgot-password" 
            className="text-blue-600 hover:text-blue-800 transition-colors text-sm underline"
          >
            Forgot Password?
          </a>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/short" element={<ShortNumbers />} />
          <Route path="/middle" element={<Middle />} />
          <Route path="/long" element={<LongTerm />} />
          <Route path="/emptysimcard" element={<EmptySimcard />} />
          <Route path="/history" element={<History />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/add-funds" element={<AddFunds />} />
          <Route path="/test" element={<Test />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
