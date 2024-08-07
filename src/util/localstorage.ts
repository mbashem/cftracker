export const saveSet = (name: string, st: Set<string>): boolean => {
  try {
    // console.log(st.keys());
    localStorage.setItem(name, JSON.stringify([...st]));
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
};

export const getSet = (name: string, def: string[]): Set<string> => {
  try {
    let res = JSON.parse(localStorage.getItem(name)!);

    if (res) {
      let st = new Set<string>(res);
      return st;
    }
  } catch (e) {
    console.log(e);
  }
  return new Set<string>(def);
};

export const saveObj = (name: string, obj: any): boolean => {
  try {
    // console.log();
    localStorage.setItem(name, JSON.stringify(obj));
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

export const getObj = (name: string, def: any): any => {
  try {
    let res = JSON.parse(localStorage.getItem(name)!);

    if (res) {
      return { ...def, ...res };
    }
  } catch (e) {
    console.log(e);
  }
  return def;
}

export namespace LocalStorage {
  export function getJWTToken() {
    return localStorage.getItem("jwtToken");
  }
  
  export function setJWTToken(jwtToken: string) {
    localStorage.setItem("jwtToken", jwtToken);
  }
}