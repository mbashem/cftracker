export default interface User {
  id: number;
  githubId: number;
  githubUsername: string;
  email: string;
  avatarUrl: string;
  cfHandle: string;
  cfVerified: boolean;
  admin: boolean;
	jwtToken: string;
}