import React from 'react';
import useUser from '../../hooks/useUser';
import { Navigate } from 'react-router';
import { Path } from './path';

interface AuthGuardProps {
	children: React.ReactNode;
}

function AuthGuard({ children }: AuthGuardProps): React.ReactNode {
	const { isAuthenticated } = useUser();

	if (!isAuthenticated) {
		return React.createElement(Navigate, { to: Path.Home, replace: true });
	}

	return children;
};

export default AuthGuard;
