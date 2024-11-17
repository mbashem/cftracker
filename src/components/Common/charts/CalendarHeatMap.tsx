import { memo, useCallback, useState } from "react";
import ReactCalendarHeatMap, { DayData } from "./HeatMaps/ReactCalendarHeatMap";
import { Tooltip } from "../tooltip/Tooltip";

export interface CalendarHeatMapData {
  date: Date;
  value: number;
}

export interface CalendarHeatMapDataSet {
  datas: CalendarHeatMapData[];
  year: number;
  midThreshold?: number;
  highThreshold?: number;
}

interface CalendarHeatMapProps {
  datasets: CalendarHeatMapDataSet[];
  midThreshold: number;
  highThreshold: number;
}

export interface CalendarTooltipProps {
  message: string;
  xPosition: number;
  yPosition: number;
}

function CalendarHeatMap({ datasets, midThreshold, highThreshold }: CalendarHeatMapProps) {
  const [hoveredCellData, setHoveredCell] = useState<CalendarTooltipProps>({
    message: "",
    xPosition: -1,
    yPosition: -1,
  });

  const onDayCellMouseOver = useCallback((data: DayData, cellXPosition: number, cellYPosition: number) => {
    setHoveredCell({
      message: `${data.date.toDateString()}: ${data.value}`,
      xPosition: cellXPosition,
      yPosition: cellYPosition,
    });
  }, []);

  const onDayCellMouseLeave = useCallback(() => {
    setHoveredCell({ message: "", xPosition: -1, yPosition: -1 });
  }, []);

  return (
    <div>
      {datasets.map((dataset) => (
        <div className="row" key={dataset.year}>
          <ReactCalendarHeatMap
            data={dataset.datas}
            onDayCellMouseOver={onDayCellMouseOver}
            onDayCellMouseLeave={onDayCellMouseLeave}
          />
        </div>
      ))}
      <Tooltip xPosition={hoveredCellData.xPosition} yPosition={hoveredCellData.yPosition} width={500} height={100}>
        {hoveredCellData.message}
      </Tooltip>
    </div>
  );
}

export default memo(CalendarHeatMap);
