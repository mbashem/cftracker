import { memo, useId, useMemo } from "react";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import "./ReactCalendarHeatMap.css";
import useTheme from "../../../../data/hooks/useTheme";
import { getDaysInYear, getWeekNumber } from "../../../../util/time";
import useWindow from "../../../../hooks/dom/useWindow";
import { ThemesType } from "../../../../util/Theme";

const LIGHT_ACTIVITY_COLORS = ["#c2cdec", "#95a8dd", "#667fc0", "#3a4a94"];
const DARK_ACTIVITY_COLORS = ["#53618b", "#6f84b8", "#91a7df", "#b3c6ff"];

export interface DayData {
  date: Date;
  value: number;
  label?: string;
}

interface ReactCalendarHeatMapProps {
  data: DayData[];
  width?: number;
  height?: number;
  minimumValueForMaxColor: number;
  cellSize?: number;
  compact?: boolean;
  label?: string;
  onDayCellMouseOver?: (data: DayData, cellXPosition: number, cellYPosition: number) => void;
  onDayCellMouseLeave?: () => void;
}

function ReactCalendarHeatMap({ data, minimumValueForMaxColor, onDayCellMouseLeave, onDayCellMouseOver, compact = false, label }: ReactCalendarHeatMapProps) {
  const tooltipId = useId();
  const year = data[0]?.date.getFullYear();
  const { theme } = useTheme();
  // Prepare the data
  const parsedData = data.reduce((map, d) => {
    map[d.date.toDateString()] = d.value;
    return map;
  }, {} as Record<string, number>);

  // Get all days in the year
  const daysInYear = year === undefined || compact ? [] : Array.from({ length: getDaysInYear(year) }, (_, i) => {
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
    if (value === undefined || value === 0) return "#c7c9d4";
    const colors = theme.themeType === ThemesType.DARK ? DARK_ACTIVITY_COLORS : LIGHT_ACTIVITY_COLORS;
    const intensity = Math.min(1, value / minimumValueForMaxColor);
    // Opaque levels keep a quiet current period visible beside busy past periods.
    return colors[Math.max(0, Math.ceil(intensity * colors.length) - 1)];
  };

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const numberOfMonths = 12;
  const monthLabels = year === undefined ? [] : [...Array(numberOfMonths)].map((_, i) =>
    new Date(year, i, 1).toLocaleString("default", { month: "short" })
  );
  const cellSize = useMemo(() => {
    if (width < 900) return 7;
    return 15;
  }, [width]);

  if (compact) {
    return (
      <span className="compact-heatmap" role="group" aria-label={label}>
        {data.map((cell, index) => {
          const details = cell.label ?? `${cell.date.toDateString()}: ${cell.value}`;
          return (
            <OverlayTrigger key={cell.date.getTime()} placement="top" overlay={<Tooltip id={`${tooltipId}-${index}`}>{details}</Tooltip>}>
              <span className={`compact-heatmap__cell${cell.value === 0 ? " heatmap-cell--empty" : ""}`} role="img" tabIndex={0} aria-label={details}
                style={{ backgroundColor: getColor(cell.value) }} />
            </OverlayTrigger>
          );
        })}
      </span>
    );
  }

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
            className={(parsedData[date.toDateString()] ?? 0) === 0 ? "heatmap-cell--empty" : undefined}
            onMouseEnter={(event) =>
              onDayCellMouseOver?.({ date: date, value: parsedData[date.toDateString()] ?? 0 }, event.pageX, event.pageY)
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
