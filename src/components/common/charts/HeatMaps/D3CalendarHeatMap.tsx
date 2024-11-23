import { useEffect, useRef } from "react";
import * as d3 from "d3";

type D3CalendarHeatMapProps = {
  data: { date: Date; value: number }[];
  width?: number;
  height?: number;
};

function D3CalendarHeatMap({ data, width = 800, height = 200 }: D3CalendarHeatMapProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    console.log(data);

    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const cellSize = 20; // Size of each day square
    const year = d3.timeYear(new Date(data[0]?.date)); // Get the start year from data
    const numWeeks = d3.timeWeeks(d3.timeWeek(year), d3.timeYear.offset(year, 1)).length;

    // Set up color scale
    const maxValue = d3.max(data, (d) => d.value) || 1;
    const colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, maxValue]);

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("height", height - margin.top - margin.bottom)
      .attr("width", width - margin.left - margin.right)
      .attr("transform", `translate(${margin.left},${margin.top})`);
 
    // Define day and week scales
    const day = d3
      .scaleBand()
      .domain(d3.range(7).map((value) => value.toString()))
      .range([0, 7 * cellSize]);
    const week = d3
      .scaleBand()
      .domain(d3.range(numWeeks).map((value) => value.toString()))
      .range([0, numWeeks * cellSize]);
    console.log(numWeeks, day);

    // Draw the heatmap cells
    svg
      .selectAll(".day-cell")
      .data(data)
      .enter()
      .append("rect")
      .classed("day-cell", true)
      .attr("x", (d) => week(d3.timeWeek.count(year, d.date).toString())!)
      .attr("y", (d) => day(d.date.getDay().toString())!)
      .attr("width", cellSize)
      .attr("height", cellSize)
      .attr("fill", (d) => colorScale(d.value || 0)!)
      .attr("stroke", "#ccc");

    // Add month labels
    const months = d3.timeMonths(year, d3.timeYear.offset(year, 1));
    svg
      .selectAll(".month-label")
      .data(months)
      .enter()
      .append("text")
      .attr("x", (d) => week(d3.timeWeek.count(year, d).toString())!)
      .attr("y", -5)
      .text((d) => d3.timeFormat("%b")(d))
      .style("font-size", "10px")
      .attr("text-anchor", "start");

    return () => {
      d3.select(svgRef.current).selectAll("*").remove(); // Cleanup
    };
  }, [data, width, height]);

  return <svg ref={svgRef}></svg>;
}

export default D3CalendarHeatMap;
