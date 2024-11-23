import { RATING_LABELS } from "./cf";

export enum ThemesType {
  DARK = 1,
  LIGHT = 2,
}

export enum Color {
  LightRed,
  Red,
  DeepRed,
  Gray,
  Violet,
  Black,
  Green,
  Blue,
  Yellow,
  Purple,
  Teal,
  Orange,
  LightPink,
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
  ConstrastingColor
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

  static get colorsForRatings() {
    return RATING_LABELS.map((value) => Theme.colorForRating(value));
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

  static colorForRating(value: number) {
    if (value < 1200) return Color.Gray;
    else if (value < 1400) return Color.Green;
    else if (value < 1600) return Color.Cyan;
    else if (value < 1900) return Color.Blue;
    else if (value < 2100) return Color.Violet;
    else if (value < 2300) return Color.Yellow;
    else if (value < 2400) return Color.Orange;
    else if (value < 2600) return Color.Red;
    else if (value < 3000) return Color.DeepRed;
    else return Color.Maroon;
  }

  hexColor(color: Color): string {
    switch (color) {
      case Color.Gray:
        return this.themeType === ThemesType.LIGHT ? "#9e9e9e" : "#6c757d"; // Light gray, dark gray
      case Color.Green:
        return this.themeType === ThemesType.LIGHT ? "#66bb6a" : "#2e7d32"; // Light green, dark green
      case Color.Cyan:
        return this.themeType === ThemesType.LIGHT ? "#26c6da" : "#006064"; // Light cyan, dark cyan
      case Color.Blue:
        return this.themeType === ThemesType.LIGHT ? "#42a5f5" : "#1565c0"; // Light blue, dark blue
      case Color.Violet:
        return this.themeType === ThemesType.LIGHT ? "#ab47bc" : "#6a1b9a"; // Light violet, dark violet
      case Color.Orange:
        return this.themeType === ThemesType.LIGHT ? "#ffa726" : "#e65100"; // Light orange, dark orange
      case Color.LightRed:
        return this.themeType === ThemesType.LIGHT ? "#FFCDD2" : "#EF9A9A"; // Light Red, Darker, richer light red
      case Color.Red:
        return this.themeType === ThemesType.LIGHT ? "#ef5350" : "#b71c1c"; // Light red, dark red
      case Color.DeepRed:
        return this.themeType === ThemesType.LIGHT ? "#c62828" : "#842029"; // Deep red, darker deep red
      case Color.Yellow:
        return this.themeType === ThemesType.LIGHT ? "#fdd835" : "#fbc02d"; // Light yellow, dark yellow
      case Color.Black:
        return this.themeType === ThemesType.LIGHT ? "#424242" : "#212121"; // Neutral black for both modes
      case Color.Purple:
        return this.themeType === ThemesType.LIGHT ? "#6a1b9a" : "#3e2a63";  // Dark purple, dark purple
      case Color.Teal:
        return this.themeType === ThemesType.LIGHT ? "#00838f" : "#0d5a6e";  // Dark teal, dark teal
      case Color.Pink:
        return this.themeType === ThemesType.LIGHT ? "#ad1457" : "#6e2142";  // Dark pink, dark pink
      case Color.LightPink:
        return this.themeType === ThemesType.LIGHT ? "#F8BBD0" : "#F48FB1"; // Light Pink, Richer pink
      case Color.Indigo:
        return this.themeType === ThemesType.LIGHT ? "#283593" : "#3e1f79";  // Dark indigo, dark indigo
      case Color.Lime:
        return this.themeType === ThemesType.LIGHT ? "#827717" : "#4c6b10";  // Dark lime, dark lime
      case Color.Maroon:
        return this.themeType === ThemesType.LIGHT ? "#7b1f1f" : "#420d09";  // Dark maroon, dark maroon
      case Color.Navy:
        return this.themeType === ThemesType.LIGHT ? "#1b2a3b" : "#00274d";  // Dark navy, dark navy
      case Color.Olive:
        return this.themeType === ThemesType.LIGHT ? "#556b2f" : "#4b5320";  // Dark olive, dark olive
      case Color.Brown:
        return this.themeType === ThemesType.LIGHT ? "#4e342e" : "#4e3629";  // Dark brown, dark brown
      case Color.Coral:
        return this.themeType === ThemesType.LIGHT ? "#d84315" : "#8b3a3a";  // Dark coral, dark coral
      case Color.Slate:
        return this.themeType === ThemesType.LIGHT ? "#455a64" : "#495057";  // Dark slate, dark slate
      case Color.Gold:
        return this.themeType === ThemesType.LIGHT ? "#8d6e63" : "#7a5c00";  // Dark gold, dark gold
      case Color.Lavender:
        return this.themeType === ThemesType.LIGHT ? "#512da8" : "#3f0071";  // Dark lavender, dark lavender
      case Color.Mint:
        return this.themeType === ThemesType.LIGHT ? "#00796b" : "#14544f";  // Dark mint, dark mint
      case Color.ConstrastingColor:
        return this.themeType === ThemesType.LIGHT ? "#212121" : "#f5f5f5";// Almost black, Near white
      default:
        return this.themeType === ThemesType.LIGHT ? "#ffffff" : "#000000";  // Light white, dark black
    }
  }
}
