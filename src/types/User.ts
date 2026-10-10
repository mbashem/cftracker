export default interface User {
  id: number;
  githubId: number;
  githubUsername: string;
  email: string;
  avatarUrl: string;
  cfHandle: string;
  // Older saved sessions may not include the verified handle.
  cfVerifiedHandle?: string;
  admin: boolean;
	jwtToken: string;
}
