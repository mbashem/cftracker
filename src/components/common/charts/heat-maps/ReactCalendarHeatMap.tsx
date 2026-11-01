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

  const compactColumns = Math.max(1, Math.min(data.length, Math.floor(Math.max(1, Math.min(320, width - 80)) / cellSize)));
  const cells = compact
    ? data.map((cell, index) => ({ ...cell, x: (index % compactColumns) * cellSize, y: Math.floor(index / compactColumns) * cellSize }))
    : daysInYear.map(({ date, day, week }) => ({ date, value: parsedData[date.toDateString()] ?? 0, label: undefined, x: week * cellSize, y: day * cellSize }));

  return (
    <svg
      className={`calendar-heatmap${compact ? " compact-heatmap" : ""}`}
      width={compact ? compactColumns * cellSize : cellSize * 53 + 80}
      height={compact ? Math.ceil(data.length / compactColumns) * cellSize : undefined}
      viewBox={compact ? `0 0 ${compactColumns * cellSize} ${Math.max(1, Math.ceil(data.length / compactColumns) * cellSize)}` : undefined}
      role={compact ? "group" : undefined}
      aria-label={label}
    >
      <g transform={compact ? undefined : "translate(50, 20)"}>
        {!compact && monthLabels.map((label, i) => (
          <text key={i} className={theme.text} x={i * 4.5 * cellSize} y={-10} fontSize="10" textAnchor="start">
            {label}
          </text>
        ))}

        {/* Day cells */}
        {cells.map(({ date, value, label: cellLabel, x, y }, index) => {
          const details = cellLabel ?? `${date.toDateString()}: ${value}`;
          const cell = (
            <rect
              key={date.getTime()}
              x={x}
              y={y}
              width={cellSize - 2}
              height={cellSize - 2}
              fill={getColor(value)}
              className={`heatmap__cell${value === 0 ? " heatmap-cell--empty" : ""}`}
              role={compact ? "img" : undefined}
              tabIndex={compact ? 0 : undefined}
              aria-label={compact ? details : undefined}
              onMouseEnter={(event) => onDayCellMouseOver?.({ date, value }, event.pageX, event.pageY)}
              onMouseLeave={onDayCellMouseLeave}
              rx="2"
              ry="2"
            />
          );
          return compact ? (
            <OverlayTrigger key={date.getTime()} placement="top" overlay={<Tooltip id={`${tooltipId}-${index}`}>{details}</Tooltip>}>
              {cell}
            </OverlayTrigger>
          ) : cell;
        })}

        {!compact && dayLabels.map((d, i) => (
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
