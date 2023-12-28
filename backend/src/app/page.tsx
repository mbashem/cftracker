import Image from "next/image";
import styles from "./page.module.css";
import { fetchAndSaveAllContests } from "@/features/contests/services/ContestService";
import { Button } from "@mui/material";

export default function Home() {
  const fetchContestFromCF = async (formData: FormData) => {
    "use server";
    console.log("Server: fethcing contest from CF");

    const contestList = await fetchAndSaveAllContests();

    console.log(contestList);
  };
  return (
    <main className={styles.main}>
      <div className={styles.description}>
        <p>
          Get started by editing&nbsp;
          <code className={styles.code}>src/app/page.tsx</code>
        </p>
        <div>
          <a
            href="https://vercel.com?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            By{" "}
            <Image
              src="/vercel.svg"
              alt="Vercel Logo"
              className={styles.vercelLogo}
              width={100}
              height={24}
              priority
            />
          </a>
        </div>
      </div>

      <div className={styles.grid}>
        <form action={fetchContestFromCF}>
          <Button type="submit">Fetch All Contest From CF</Button>
        </form>
      </div>
    </main>
  );
}
