import { Link } from 'react-router-dom'
import { useSupabase } from '../../context/SupabaseContext'
import { User, LogIn, UserPlus, LogOut, Wallet, Skull } from 'lucide-react'

const Navbar = () => {
  const { user, balance, signOut } = useSupabase()
  const isAdmin = user?.role === 'admin'

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-dark/95 backdrop-blur-sm border-b border-primary/20">
      <div className="container mx-auto px-4 flex items-center justify-between h-14">
        {/* Three skulls - toxic level 3 */}
        <Link to="/" className="flex items-center gap-1 text-white hover:text-primary transition group">
          <Skull size={28} className="group-hover:text-primary transition" />
          <Skull size={28} className="group-hover:text-primary transition" />
          <Skull size={28} className="group-hover:text-primary transition" />
        </Link>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {!isAdmin && balance && (
                <Link to="/wallet" className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded-lg">
                  <Wallet size={16} />
                  <span className="font-bold">{balance.available?.toFixed(2) || '0.00'}</span>
                </Link>
              )}
              <Link to="/profile" className="text-sm text-gray-300 hover:text-white flex items-center gap-1">
                <User size={18} />
                <span className="hidden sm:inline">{user.name || user.email || 'User'}</span>
                {isAdmin && <span className="text-xs text-primary hidden sm:inline">(Admin)</span>}
              </Link>
              <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1">
                <LogOut size={18} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-gray-300 hover:text-white flex items-center gap-1">
                <LogIn size={18} />
                <span>Login</span>
              </Link>
              <Link to="/register" className="text-sm bg-primary hover:bg-secondary text-white px-4 py-1.5 rounded-lg flex items-center gap-1">
                <UserPlus size={18} />
                <span>Join Now</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar