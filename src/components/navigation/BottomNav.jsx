import { NavLink } from 'react-router-dom'
import { Home, Radio, Wallet, Menu as MenuIcon, List } from 'lucide-react'

const BottomNav = () => {
  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/live', icon: Radio, label: 'Live' },
    { path: '/my-bets', icon: List, label: 'My Bets' },
    { path: '/wallet', icon: Wallet, label: 'Wallet' },
    { path: '/menu', icon: MenuIcon, label: 'Menu' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-dark/95 backdrop-blur-sm border-t border-primary/20">
      <div className="container mx-auto flex justify-around items-center h-16">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex flex-col items-center text-xs transition-colors ${
                isActive ? 'text-primary' : 'text-gray-400 hover:text-white'
              }`
            }
          >
            <Icon size={24} />
            <span className="mt-0.5">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default BottomNav