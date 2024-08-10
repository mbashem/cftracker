import React from 'react';
import useUser from '../../hooks/useUser';
import { useNavigate } from 'react-router';
import { Path } from './path';

interface AuthGuardProps {
	children: React.ReactNode;
}

function AuthGuard({ children }: AuthGuardProps): React.ReactNode {
	const navigate = useNavigate();
	const { isAuthenticated } = useUser();

	if (!isAuthenticated) {
		navigate(Path.Home);
		return;
	}

	return children;
};

export default AuthGuard;
