import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

const SignIn: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    toast({
      title: 'No account needed!',
      description: 'NyAnime now saves your watch history, watchlist, and downloads directly to your device.',
    });
    navigate('/library', { replace: true });
  }, [navigate]);

  return null;
};

export default SignIn;
