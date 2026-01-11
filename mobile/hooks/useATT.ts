import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { 
  requestTrackingPermissionsAsync, 
  getTrackingPermissionsAsync,
  PermissionStatus 
} from 'expo-tracking-transparency';

interface UseATTReturn {
  trackingStatus: PermissionStatus | null;
  isLoading: boolean;
  canRequestTracking: boolean;
  requestTracking: () => Promise<PermissionStatus>;
  isTrackingAllowed: boolean;
}

export function useATT(): UseATTReturn {
  const [trackingStatus, setTrackingStatus] = useState<PermissionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkTrackingStatus();
  }, []);

  const checkTrackingStatus = async () => {
    if (Platform.OS !== 'ios') {
      setIsLoading(false);
      return;
    }

    try {
      const { status } = await getTrackingPermissionsAsync();
      setTrackingStatus(status);
    } catch (err) {
      console.error('Failed to get tracking status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const requestTracking = useCallback(async (): Promise<PermissionStatus> => {
    if (Platform.OS !== 'ios') {
      return 'granted';
    }

    try {
      const { status } = await requestTrackingPermissionsAsync();
      setTrackingStatus(status);
      return status;
    } catch (err) {
      console.error('Failed to request tracking:', err);
      return 'denied';
    }
  }, []);

  const canRequestTracking = Platform.OS === 'ios' && trackingStatus === 'undetermined';
  const isTrackingAllowed = Platform.OS !== 'ios' || trackingStatus === 'granted';

  return {
    trackingStatus,
    isLoading,
    canRequestTracking,
    requestTracking,
    isTrackingAllowed,
  };
}
