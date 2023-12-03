import * as cheerio from "cheerio";
import axios, { AxiosInstance } from "axios";
import Problem from "../models/Problem";

interface prop {
  contestId: number[];
}

const getUrl = (contestId: number): string => {
  return "https://codeforces.com/contest/" + contestId.toString() + "/";
};

const contestScrapper = async (contestId: number = 1509) => {
  //return [new Problem(contestId,"bash","em"),new Problem(contestId,"sd","sdf")];
  const url = getUrl(contestId);
  console.log(url);
  const problemRow: string = ".problems td";
  const problemNameInRow: string = "div a";
  const problemIndexInRow: string = ".id a";
  const problemNameSelector: string = ".problems div a";
  const problemIndexSelector: string = "#pageContent .left a";

  const problems: Problem[] = [];

  try {
    const axiosInstance: AxiosInstance = axios.create({
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,PATCH,OPTIONS",
      },
    });

    const pageData = await axiosInstance.get(url);
    const data = cheerio.load(pageData.data);
    const problemNames: cheerio.Cheerio = data(problemNameSelector);
    const problemIndexes: cheerio.Cheerio = data(problemIndexInRow);

    const names: string[] = [];
    const indexes: string[] = [];


    for (let problemName of problemNames.toArray())
      names.push(data(problemName).text().trim());
    for (let problemIndex of problemIndexes.toArray())
      indexes.push(data(problemIndex).text().trim());

    console.log(names);
    console.log(indexes);

    for (let i = 0; i < names.length; i++)
      problems.push(new Problem(contestId, indexes[i], names[i]));

    console.log(problems);
  } catch (err) {
    console.log(err);
  }

  return problems;
};

// contestScrapper();

export default contestScrapper;
