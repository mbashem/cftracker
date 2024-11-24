import { memo, useCallback, useState } from "react";
import ReactCalendarHeatMap, { DayData } from "./heat-maps/ReactCalendarHeatMap";
import { Tooltip } from "../tooltip/Tooltip";

export interface CalendarHeatMapData {
  date: Date;
  value: number;
}

export interface CalendarHeatMapDataSet {
  datas: CalendarHeatMapData[];
  year: number;
}

interface CalendarHeatMapProps {
  datasets: CalendarHeatMapDataSet[];
  minimumValueForMaxColor: number;
}

export interface CalendarTooltipProps {
  message: string;
  xPosition: number;
  yPosition: number;
}

function CalendarHeatMap({ datasets, minimumValueForMaxColor }: CalendarHeatMapProps) {
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
    <div className="d-flex flex-column justify-content-center">
      <span className="row justify-content-center mb-4 text-secondary fw-bold small">Submission HeatMap</span>

      {datasets.map((dataset) => (
        <div className="d-flex flex-column" key={dataset.year}>
          <div className="d-flex justify-content-center">
            <span className="row text-secondary">{dataset.year}</span>
            <div className="row">
              <ReactCalendarHeatMap
                data={dataset.datas}
                onDayCellMouseOver={onDayCellMouseOver}
                onDayCellMouseLeave={onDayCellMouseLeave}
                minimumValueForMaxColor={minimumValueForMaxColor}
              />
            </div>
          </div>
        </div>
      ))}
      <Tooltip xPosition={hoveredCellData.xPosition} yPosition={hoveredCellData.yPosition} width={500} height={100}>
        {hoveredCellData.message}
      </Tooltip>
    </div>
  );
}

export default memo(CalendarHeatMap);
