import React from "react";

export interface filterDataType{
  type: number;
	priority: number;
  st?: Set<any>;
  arr?: Array<any>;
  lower?:number;
  upper?:number;
}

export interface FilterProp{
  data: Array<filterDataType>;
  changed(data:filterDataType): void;
}

const filter = (props: FilterProp): JSX.Element => {

	props.data.sort((a:filterDataType,b:filterDataType)=>a.priority-b.priority);

  return (
    <div>
      
    </div>
    );
};

export default filter;
