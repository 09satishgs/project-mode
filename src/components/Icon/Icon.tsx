import React from "react";

export type IconName =
  | "arrow-left"
  | "arrow-right"
  | "arrow-up"
  | "arrow-down"
  | "chevron-left"
  | "chevron-right"
  | "chevron-down"
  | "close"
  | "filter"
  | "query-builder"
  | "table"
  | "columns"
  | "export"
  | "upload"
  | "sync"
  | "trash"
  | "analyse"
  | "plus"
  | "heart"
  | "undo"
  | "alert"
  | "cycle";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number | string;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  viewBox = "0 0 24 24",
  fill = "none",
  stroke = "currentColor",
  strokeWidth = 2.5,
  ...props
}) => {
  const renderPaths = () => {
    switch (name) {
      case "arrow-left":
        return (
          <>
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </>
        );
      case "arrow-right":
        return (
          <>
            <path d="M5 12h14" />
            <polyline points="12 5 19 12 12 19" />
          </>
        );
      case "arrow-up":
        return (
          <>
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </>
        );
      case "arrow-down":
        return (
          <>
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </>
        );
      case "chevron-left":
        return <polyline points="15 18 9 12 15 6" />;
      case "chevron-right":
        return <polyline points="9 18 15 12 9 6" />;
      case "chevron-down":
        return <polyline points="6 9 12 15 18 9" />;
      case "close":
        return (
          <>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </>
        );
      case "filter":
        return <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />;
      case "query-builder":
        return (
          <>
            <rect x="3" y="3" width="7" height="9" />
            <rect x="14" y="3" width="7" height="5" />
            <rect x="14" y="12" width="7" height="9" />
            <rect x="3" y="16" width="7" height="5" />
          </>
        );
      case "table":
        return <path d="M3 3h18v18H3zM21 9H3M21 15H3M12 3v18" />;
      case "columns":
        return <path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7m0-18H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7m0-18v18" />;
      case "export":
        return (
          <>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </>
        );
      case "upload":
        return (
          <>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </>
        );
      case "sync":
        return (
          <>
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </>
        );
      case "trash":
        return (
          <>
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </>
        );
      case "analyse":
        return (
          <>
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </>
        );
      case "plus":
        return (
          <>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </>
        );
      case "heart":
        return <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />;
      case "undo":
        return (
          <>
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </>
        );
      case "alert":
        return (
          <>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </>
        );
      case "cycle":
        return <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />;
      default:
        return null;
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      {...props}
    >
      {renderPaths()}
    </svg>
  );
};

export default Icon;
