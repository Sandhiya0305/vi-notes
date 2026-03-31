import AdminWorkspace from './components/Admin/AdminWorkspace';
import AuthPage from './components/Auth/AuthPage';
import UserWorkspace from './components/UserWorkspace/UserWorkspace';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { user, logout } = useAuth();

  if (!user) {
    return <AuthPage />;
  }

  if (user.role === 'admin') {
    return <AdminWorkspace onLogout={logout} />;
  }

  return <UserWorkspace onLogout={logout} />;
}
