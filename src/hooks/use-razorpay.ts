"use client";

import { useState, useEffect } from 'react';

const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

export function useRazorpay() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check if script already exists
    if (document.querySelector(`script[src="${RAZORPAY_SCRIPT}"]`)) {
        setIsLoaded(true);
        return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT;
    script.async = true;

    const onLoad = () => {
      setIsLoaded(true);
    };

    const onError = () => {
      console.error('Razorpay script failed to load.');
      setIsLoaded(false);
    };
    
    script.addEventListener('load', onLoad);
    script.addEventListener('error', onError);

    document.body.appendChild(script);

    return () => {
      script.removeEventListener('load', onLoad);
      script.removeEventListener('error', onError);
      // Optional: you might not want to remove the script if it's used across the app
      // document.body.removeChild(script); 
    };
  }, []);

  return isLoaded;
}
