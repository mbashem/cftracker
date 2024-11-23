import styles from "./tooltip.module.css";

type TooltipProps = {
  children?: React.ReactNode;
  xPosition: number;
  yPosition: number;
  width: number;
  height: number;
};

export const Tooltip = ({ children, width, height, xPosition, yPosition }: TooltipProps) => {
  if (!children) {
    return null;
  }

  return (
    // Wrapper div: a rect on top of the viz area
    <div
      style={{
        width,
        height,
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
      }}
    >
      {/* The actual box with dark background */}
      <div
        className={styles.tooltip}
        style={{
          position: "absolute",
          left: xPosition,
          top: yPosition,
        }}
      >
        {children}
      </div>
    </div>
  );
};