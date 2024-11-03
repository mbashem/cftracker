export enum ThemesType {
  DARK = 1,
  LIGHT = 2,
}

export enum Color {
  Red,
  Green,
  Blue,
  Yellow,
  Purple,
  Teal,
  Orange,
  Pink,
  Cyan,
  Indigo,
  Lime,
  Maroon,
  Navy,
  Olive,
  Brown,
  Coral,
  Slate,
  Gold,
  Lavender,
  Mint,
}

export default class Theme {
  themeType: ThemesType;
  navbar: string;
  name: string;
  table: string;
  thead: string;

  text: string;
  textDanger: string;
  bgText: string;

  bg: string;
  bgSuccess: string;
  bgDanger: string;
  btnPrimary: string;

  btn: string;
  btnDanger: string;
  btnSuccess: string;

  constructor(selected?: ThemesType) {
    switch (selected) {
      case ThemesType.DARK:
        this.themeType = ThemesType.DARK;
        this.navbar = "navbar-dark bg-secondary";
        this.text = "text-light";
        this.name = "dark";
        this.table = "table-dark";
        this.thead = "thead-dark";

        this.bg = "bg-dark";
        this.bgSuccess = "bg-success";
        this.bgDanger = "bg-danger";

        this.btn = "btn btn-dark";
        break;
      case ThemesType.LIGHT:
      default:
        this.themeType = ThemesType.LIGHT;
        this.text = "text-dark";
        this.navbar = "navbar-dark bg-dark";
        this.name = "light";
        this.table = "table-light";
        this.thead = "thead-light";

        this.bg = "bg-light";
        this.bgSuccess = "bg-success-light";
        this.bgDanger = "bg-danger-light";

        this.btn = "btn btn-light";
        break;
    }

    this.btnDanger = "btn btn-danger";
    this.btnSuccess = "btn btn-success";
    this.btnPrimary = "btn btn-primary";

    this.textDanger = "text-danger";
    this.bgText = this.bg + " " + this.text;
  }

  color(rating: number): string {
    let ans: string = (this.name === "light" ? "" : "dark-") + "rating-";
    if (rating >= 3000) {
      ans += "legendary";
    } else if (rating >= 2400) {
      ans += "red";
    } else if (rating >= 2100) {
      ans += "orange";
    } else if (rating >= 1900) {
      ans += "violet";
    } else if (rating >= 1600) {
      ans += "blue";
    } else if (rating >= 1400) {
      ans += "cyan";
    } else if (rating >= 1200) {
      ans += "green";
    } else if (rating >= 800) {
      ans += "gray";
    } else ans = this.text;

    return ans;
  }

  hexColor(color: Color): string {
    switch (color) {
      case Color.Red:
        return this.themeType === ThemesType.LIGHT ? "#f8d7da" : "#842029";  // Light red, dark red
      case Color.Green:
        return this.themeType === ThemesType.LIGHT ? "#d1e7dd" : "#0f5132";  // Light green, dark green
      case Color.Blue:
        return this.themeType === ThemesType.LIGHT ? "#cfe2ff" : "#084298";  // Light blue, dark blue
      case Color.Yellow:
        return this.themeType === ThemesType.LIGHT ? "#fff3cd" : "#664d03";  // Light yellow, dark yellow
      case Color.Purple:
        return this.themeType === ThemesType.LIGHT ? "#e2d9f3" : "#3e2a63";  // Light purple, dark purple
      case Color.Teal:
        return this.themeType === ThemesType.LIGHT ? "#cff4fc" : "#0d5a6e";  // Light teal, dark teal
      case Color.Orange:
        return this.themeType === ThemesType.LIGHT ? "#ffe5b5" : "#7f4700";  // Light orange, dark orange
      case Color.Pink:
        return this.themeType === ThemesType.LIGHT ? "#f8d7da" : "#6e2142";  // Light pink, dark pink
      case Color.Cyan:
        return this.themeType === ThemesType.LIGHT ? "#e0f7fa" : "#004d40";  // Light cyan, dark cyan
      case Color.Indigo:
        return this.themeType === ThemesType.LIGHT ? "#e0e7ff" : "#3e1f79";  // Light indigo, dark indigo
      case Color.Lime:
        return this.themeType === ThemesType.LIGHT ? "#e6ffcc" : "#4c6b10";  // Light lime, dark lime
      case Color.Maroon:
        return this.themeType === ThemesType.LIGHT ? "#f1c6d2" : "#420d09";  // Light maroon, dark maroon
      case Color.Navy:
        return this.themeType === ThemesType.LIGHT ? "#d1dbe6" : "#00274d";  // Light navy, dark navy
      case Color.Olive:
        return this.themeType === ThemesType.LIGHT ? "#e3e3c6" : "#4b5320";  // Light olive, dark olive
      case Color.Brown:
        return this.themeType === ThemesType.LIGHT ? "#e6d5c7" : "#4e3629";  // Light brown, dark brown
      case Color.Coral:
        return this.themeType === ThemesType.LIGHT ? "#ffe4e1" : "#8b3a3a";  // Light coral, dark coral
      case Color.Slate:
        return this.themeType === ThemesType.LIGHT ? "#f1f3f5" : "#495057";  // Light slate, dark slate
      case Color.Gold:
        return this.themeType === ThemesType.LIGHT ? "#fff3cc" : "#7a5c00";  // Light gold, dark gold
      case Color.Lavender:
        return this.themeType === ThemesType.LIGHT ? "#f5f0ff" : "#3f0071";  // Light lavender, dark lavender
      case Color.Mint:
        return this.themeType === ThemesType.LIGHT ? "#e0fff8" : "#14544f";  // Light mint, dark mint
      default:
        return this.themeType === ThemesType.LIGHT ? "#ffffff" : "#000000";  // Light white, dark black
    }
  }
}
