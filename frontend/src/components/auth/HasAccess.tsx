import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface HasAccessProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

export const HasAccess: React.FC<HasAccessProps> = ({
  allowedRoles,
  children
}) => {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
};
