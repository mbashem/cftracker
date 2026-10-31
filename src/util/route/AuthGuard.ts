import React from 'react';
import useUser from '../../hooks/useUser';
import { Navigate } from 'react-router';
import { Path } from './path';
import Loading from '../../components/common/Loading';

interface AuthGuardProps {
	children: React.ReactNode;
}

function AuthGuard({ children }: AuthGuardProps): React.ReactNode {
	const { isAuthenticated, isCheckingAuthentication } = useUser();

	if (isCheckingAuthentication) return React.createElement(Loading);

	if (!isAuthenticated) {
		return React.createElement(Navigate, { to: Path.Home, replace: true });
	}

	return children;
};

export default AuthGuard;
