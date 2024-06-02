export interface CFAPIContest {
  id: number;
  name: string;
  type: string;
  phase: string;
  frozen: boolean;
  durationSeconds: number;
  startTimeSeconds: number;
  relativeTimeSeconds: number;
}

export interface CFAPIProblem {
  contestId: number;
  index: string;
  name: string;
  type: string;
  points: number;
  rating: number;
  tags: string[];
}

export interface CFAPIMember {
  handle: string;
}

export interface CFAPIParty {
  contestId: number;
  members: CFAPIMember[];
  participantType: string;
  ghost: boolean;
  room: number;
  startTimeSeconds: number;
}

export interface CFAPIProblemResult {
  points: number;
  rejectedAttemptCount: number;
  type: string;
  bestSubmissionTimeSeconds: number;
}

export interface CFAPIRow {
  party: CFAPIParty;
  rank: number;
  points: number;
  penalty: number;
  successfulHackCount: number;
  unsuccessfulHackCount: number;
  problemResults: CFAPIProblemResult[];
}

export interface CFAPIResult {
  contest: CFAPIContest;
  problems: CFAPIProblem[];
  rows: CFAPIRow[];
}

export interface CFAPIResponse {
  status: string;
  result: CFAPIResult;
}
