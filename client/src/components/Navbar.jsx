import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and Name */}
          <Link to="/" className="flex items-center gap-5 hover:opacity-80 transition-opacity">
            <img src={logo} alt="FeedbackHub Logo" className="h-7 w-14 md:h-10 md:w-20 object-contain" />
            <span className="text-base md:text-xl font-bold ">
              Academic Feedback Management System
            </span>
          </Link>

          {/* Right side - Navigation */}
          <div className="flex items-center space-x-4">
            {!user ? (
              <div></div>
            ) : (
              <>
                <div className="px-4 py-2 bg-gray-100 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">
                    {user.fullName}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    ({user.role})
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;