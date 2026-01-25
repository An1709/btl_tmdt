import { useNavigate } from 'react-router';
import { useAuthStore } from '@/stores/useAuthStore';

function Logout() {
    const {signOut} = useAuthStore();
    const navigate = useNavigate();
    const handleLogout = async () => {
        try {
            await signOut();
            navigate('/signin');
        } catch (error) {
            console.error("Error during logout:", error);
        }
    }

  return (
      <button onClick={handleLogout}>Logout</button>
  )
}

export default Logout
