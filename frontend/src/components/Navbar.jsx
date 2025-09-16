import { Link, useNavigate } from 'react-router-dom';

const Navbar = ({ token, role, username, setToken, setRole, setUsername }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    
    setToken('');
    setRole('');
    if (setUsername) setUsername('');
    navigate('/login');
  };

  return (
    <nav className="bg-gray-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Link to="/dashboard" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <img 
                src="/images/logo.png"
                alt="UX Score Logo"
                className="h-12 w-auto"
              />
              <span className="text-white text-xl font-bold hidden sm:block">UX Score</span>
            </Link>
          </div>
          <div className="hidden md:flex items-center space-x-6">
            {token && (
              <>
                <Link 
                  to="/dashboard" 
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <Link 
                  to="/performance" 
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Performance
                </Link>
                {role === 'Admin' && (
                  <>
                    <Link 
                      to="/admin/categories" 
                      className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                    Category
                    </Link>
                    <Link 
                      to="/admin/users" 
                      className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                    User
                  </Link>
                  </>
                )}
              </>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {token && (
              <>
                <span className="text-gray-300 text-sm hidden sm:block">
                  Welcome, <span className="text-white font-medium">{username || 'User'}</span>
                </span>
                <button 
                  onClick={handleLogout} 
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </>
            )}
          </div>
          <div className="md:hidden">
            <button className="text-gray-300 hover:text-white p-2">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;