import { useState, useEffect } from 'react';
import { createClient } from '../supabase/client';
import { useAuth } from './AuthProvider';

export function usePartnerStatus() {
  const { user, isAuthenticated } = useAuth();
  const [isPartner, setIsPartner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkPartnerStatus() {
      if (!isAuthenticated || !user) {
        setIsPartner(false);
        setIsLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('partners')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error && data) {
          setIsPartner(true);
        } else {
          setIsPartner(false);
        }
      } catch (err) {
        console.error('Error checking partner status:', err);
        setIsPartner(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkPartnerStatus();
  }, [user, isAuthenticated]);

  return { isPartner, isLoading };
}
