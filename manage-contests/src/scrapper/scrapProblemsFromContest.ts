import * as cheerio from "cheerio";
import axios, { AxiosInstance } from "axios";
import { Problem } from "@/prisma/generated/client/client";

const getUrl = (contestId: number): string => {
  return "https://codeforces.com/contest/" + contestId.toString() + "/";
};

const scrapProblemsFromContest = async (contestId: number = 1509) => {
  const url = getUrl(contestId);
  console.log(url);
  const problemNameSelector: string = "div a";
  const problemIndexInRow: string = "#pageContent .left a";

  const problems: Problem[] = [];
  const names: string[] = [];
  const indexes: string[] = [];
  try {
  	const axiosInstance: AxiosInstance = axios.create({
  		headers: {
  			"Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
      },
    });

    const pageData = await axios.get(url);
    const data = cheerio.load(pageData.data);
    const problemNames = data(problemNameSelector);
    const problemIndexes = data(problemIndexInRow);


    for (let problemName of problemNames.toArray())
      names.push(data(problemName).text().trim());
  	for (let problemIndex of problemIndexes.toArray())
      indexes.push(data(problemIndex).text().trim());

  	console.log(names);
    console.log(indexes);
  } catch (err) {
  	console.log(err);
  }
  for (let i = 0; i < names.length; i++)
  	problems.push({contestId: contestId, index: indexes[i], name: names[i], rating: null});
  console.log(problems);

  return problems;
};

// contestScrapper();

export default scrapProblemsFromContest;