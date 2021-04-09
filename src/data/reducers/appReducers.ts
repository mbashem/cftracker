interface AppStateInterfac {
	errorLog: string[];
	successLog: string[];
}

const initAppState: AppStateInterfac = {
	errorLog: [],
	successLog: []
};

export const AppReducer = (
  initState: AppStateInterfac,
  action: { type: string; message: string }
) => {

};
