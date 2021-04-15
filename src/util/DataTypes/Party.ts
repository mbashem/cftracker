import Member from "./Member";

enum ParticipantType {
  CONTESTANT = "CONTESTANT",
  PRACTICE = "PRACTICE",
  VIRTUAL = "VIRTUAL",
  MANAGER = "MANAGER",
  OUT_OF_COMPETITION = "OUT_OF_COMPETITION",
}

export default class Party {
  contestId?: number;
  members: Member[];
  participantType: ParticipantType;
  teamId?: number;
  teamName?: string;
  ghost: boolean;
  room?: number;
  startTimeSeconds?: number;
}
