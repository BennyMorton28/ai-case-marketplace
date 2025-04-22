import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface DemoIconProps {
  icon?: string;
  name?: string;
  size?: number;
  className?: string;
}

// Maximum number of retries for fetching signed URLs
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export default function DemoIcon({ icon, name = '?', size = 40, className = '' }: DemoIconProps) {
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [error, setError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!icon) {
      setLoading(false);
      setError(true);
      return;
    }

    // Reset states when icon changes
    setLoading(true);
    setError(false);

    const fetchIconUrl = async (retries = 0) => {
      try {
        // If icon starts with '/' or 'http', use it directly
        if (icon.startsWith('/') || icon.startsWith('http')) {
          setIconUrl(icon);
          setLoading(false);
          return;
        }

        // For S3 icons, fetch signed URL
        const params = new URLSearchParams({ key: icon });
        const response = await fetch(`/api/s3/signed-url?${params}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch signed URL: ${response.statusText}`);
        }
        
        const { url } = await response.json();
        setIconUrl(url);
        setLoading(false);
      } catch (err) {
        console.error(`Error fetching icon URL (attempt ${retries + 1}/${MAX_RETRIES}):`, err);
        
        if (retries < MAX_RETRIES - 1) {
          setTimeout(() => fetchIconUrl(retries + 1), RETRY_DELAY);
        } else {
          console.error('Max retries reached, falling back to placeholder');
          setError(true);
          setLoading(false);
        }
      }
    };

    fetchIconUrl();
  }, [icon]);

  // Get placeholder text safely
  const placeholderText = name && name.trim() ? name.charAt(0).toUpperCase() : '?';

  // Show placeholder while loading or on error
  if (loading || error || !iconUrl) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-200 rounded-full ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-gray-600 font-semibold">
          {placeholderText}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={iconUrl}
      alt={`${name || 'Unknown'} icon`}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      onError={() => {
        console.error(`Failed to load image: ${iconUrl}`);
        setError(true);
      }}
    />
  );
}