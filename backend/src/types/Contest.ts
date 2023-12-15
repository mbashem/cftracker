// export default class Contest {
//   id: number;
//   name: string;
//   type?: string;
//   phase: string;
//   frozen: boolean;
//   durationSeconds?: number;
//   startTimeSeconds?: number;
//   relativeTimeSeconds?: number;
//   preparedBy?: string;
//   websiteUrl?: string;
//   description?: string;
//   difficulty?: number;
//   kind?: string;
//   icpcRegion?: string;
//   country?: string;
//   city?: string;
//   season?: string;

//   constructor(
//     id: number,
//     name: string,
//     type: string,
//     phase: string,
//     durationSeconds: number,
//     startTimeSeconds: number
//   ) {
//     this.id = id;
//     this.name = name;
//     this.type = type;
//     this.phase = phase;
//     this.durationSeconds = durationSeconds;
//     this.startTimeSeconds = startTimeSeconds;
//   }

//   public clone = (): Contest => {
//     const clonedContest = new Contest(
//       this.id,
//       this.name,
//       this.type,
//       this.phase,
//       this.durationSeconds,
//       this.startTimeSeconds
//     );

//     return clonedContest;
//   };
// }

export {}