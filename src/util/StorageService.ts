export namespace StorageService {
  enum Key {
    jwtToken = "jwtToken"
  }
  export function getJWTToken() {
    return localStorage.getItem(Key.jwtToken);
  }

  export function setJWTToken(jwtToken: string) {
    localStorage.setItem(Key.jwtToken, jwtToken);
  }

  export function removeJWTToken() {
    localStorage.removeItem(Key.jwtToken);
  }

  export const saveSet = <T extends string | number | boolean>(name: string, st: Set<T>): boolean => {
    try {
      localStorage.setItem(name, JSON.stringify([...st]));
      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  };

  export const getSet = <T extends string | number | boolean>(name: string, def: T[]): Set<T> => {
    try {
      let res = JSON.parse(localStorage.getItem(name)!);

      if (res) {
        let st = new Set<T>(res);
        return st;
      }
    } catch (e) {
      console.log(e);
    }
    return new Set(def);
  };

  export const saveObject = (name: string, obj: any): boolean => {
    try {
      // console.log();
      localStorage.setItem(name, JSON.stringify(obj));
      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  }

  export const getObject = (name: string, def: any): any => {
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

}