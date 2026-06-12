import React, { useState } from "react";
import "./JsonTreeView.scss";

interface JsonTreeViewProps {
  data: any;
  name?: string;
  isLast?: boolean;
}

export const JsonTreeView: React.FC<JsonTreeViewProps> = ({
  data,
  name,
  isLast = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Check if data is a non-null object or array
  const isObject = data !== null && typeof data === "object";
  const isArray = Array.isArray(data);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const renderValue = (val: any) => {
    if (typeof val === "string")
      return <span className="json-val string">"{val}"</span>;
    if (typeof val === "number")
      return <span className="json-val number">{val}</span>;
    if (typeof val === "boolean")
      return <span className="json-val boolean">{val ? "true" : "false"}</span>;
    if (val === null) return <span className="json-val null">null</span>;
    return null;
  };

  if (!isObject) {
    return (
      <div className="json-tree-line">
        {name && <span className="json-key">"{name}": </span>}
        {renderValue(data)}
        {!isLast && <span className="json-comma">,</span>}
      </div>
    );
  }

  const keys = isArray ? data : Object.keys(data);
  const size = isArray ? data.length : keys.length;
  const bracketOpen = isArray ? "[" : "{";
  const bracketClose = isArray ? "]" : "}";

  return (
    <div className={`json-tree-node ${isOpen ? "open" : "collapsed"}`}>
      <div className="json-node-header" onClick={toggle}>
        <span className="toggle-icon">{isOpen ? "▼" : "▶"}</span>
        {name && <span className="json-key">"{name}": </span>}
        <span className="json-bracket">{bracketOpen}</span>
        {!isOpen && (
          <span className="json-collapsed-text">
            {isArray ? `... ${size} items ` : `... ${size} keys `}
          </span>
        )}
        {!isOpen && <span className="json-bracket">{bracketClose}</span>}
        {!isOpen && !isLast && <span className="json-comma">,</span>}
      </div>

      {isOpen && (
        <div className="json-node-children">
          {isArray
            ? data.map((item: any, idx: number) => (
                <JsonTreeView
                  key={idx}
                  data={item}
                  name={undefined}
                  isLast={idx === data.length - 1}
                />
              ))
            : keys.map((key: string, idx: number) => (
                <JsonTreeView
                  key={key}
                  data={data[key]}
                  name={key}
                  isLast={idx === keys.length - 1}
                />
              ))}
        </div>
      )}

      {isOpen && (
        <div className="json-node-footer">
          <span className="json-bracket">{bracketClose}</span>
          {!isLast && <span className="json-comma">,</span>}
        </div>
      )}
    </div>
  );
};

export default JsonTreeView;
