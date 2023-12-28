import { Contest } from "@prisma/client";

interface Props {
  onChange: (contestId: string) => void;
  contests: Contest[];
}

export default function SelectContest({ onChange, contests }: Props) {
  const handleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    console.log(event.target.value);
    onChange(event.target.value as string);
  };

  return (
    <select onChange={handleChange}>
      {contests.map((contest) => (
        <option key={contest.id} value={contest.contestId}>
          {contest.name}
        </option>
      ))}
    </select>
  );
}
