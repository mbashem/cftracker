import { memo, useMemo } from "react";
import useTheme from "../../../../data/hooks/useTheme";
import { getDaysInYear, getWeekNumber } from "../../../../util/time";
import useWindow from "../../../../hooks/dom/useWindow";

export interface DayData {
  date: Date;
  value: number;
}

interface ReactCalendarHeatMapProps {
  data: DayData[];
  width?: number;
  height?: number;
  minimumValueForMaxColor: number;
  cellSize?: number;
  onDayCellMouseOver: (data: DayData, cellXPosition: number, cellYPosition: number) => void;
  onDayCellMouseLeave: () => void;
}

function ReactCalendarHeatMap({ data, minimumValueForMaxColor, onDayCellMouseLeave, onDayCellMouseOver }: ReactCalendarHeatMapProps) {
  const year = new Date(data[0]?.date).getFullYear();
  const { theme } = useTheme();
  // Prepare the data
  const parsedData = data.reduce((map, d) => {
    map[d.date.toDateString()] = d.value;
    return map;
  }, {} as Record<string, number>);

  // Get all days in the year
  const daysInYear = Array.from({ length: getDaysInYear(year) }, (_, i) => {
    const date = new Date(year, 0, i + 1);
    return {
      date: date,
      day: date.getDay(),
      week: getWeekNumber(date),
    };
  });

  const { width } = useWindow();

  // Color scale
  const getColor = (value: number | undefined) => {
    if (value === undefined) return "#c7c9d4"; // Default color for no data
    const intensity = Math.min(1, value / minimumValueForMaxColor);
    return `rgba(58, 74, 148, ${intensity})`; // Blue with varying opacity
  };

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const numberOfMonths = 12;
  const monthLabels = [...Array(numberOfMonths)].map((_, i) =>
    new Date(year, i, 1).toLocaleString("default", { month: "short" })
  );
  const cellSize = useMemo(() => {
    if (width < 900) return 7;
    return 15;
  }, [width]);

  return (
    <svg width={cellSize * 53 + 80}>
      <g transform={`translate(50, 20)`}>
        {monthLabels.map((label, i) => (
          <text key={i} className={theme.text} x={i * 4.5 * cellSize} y={-10} fontSize="10" textAnchor="start">
            {label}
          </text>
        ))}

        {/* Day cells */}
        {daysInYear.map(({ date, day, week }) => (
          <rect
            key={date.toString()}
            x={week * cellSize}
            y={day * cellSize}
            width={cellSize - 2}
            height={cellSize - 2}
            fill={getColor(parsedData[date.toDateString()])}
            onMouseEnter={(event) =>
              onDayCellMouseOver({ date: date, value: parsedData[date.toDateString()] ?? 0 }, event.pageX, event.pageY)
            }
            onMouseLeave={onDayCellMouseLeave}
            rx="2"
            ry="2"
          >
            {/* <title>{`${date}: ${parsedData[date.toString()] ?? 0}`}</title> */}
          </rect>
        ))}

        {dayLabels.map((d, i) => (
          <text
            key={d}
            className={theme.text}
            x={-10}
            y={i * cellSize + cellSize / 2}
            fontSize="8"
            textAnchor="end"
            alignmentBaseline="middle"
          >
            {d}
          </text>
        ))}
      </g>
    </svg>
  );
}

export default memo(ReactCalendarHeatMap);
