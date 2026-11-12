import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

const SignUp: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    toast({
      title: 'No sign up required!',
      description: 'Everything is saved locally to your device app data with zero sign-in friction.',
    });
    navigate('/library', { replace: true });
  }, [navigate]);

  return null;
};

export default SignUp;
