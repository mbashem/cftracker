export enum ThemesType {
  DARK = 1,
  LIGHT = 2,
}

export default class Theme {
  bg: string;
  text: string;
  bgText: string;
  navbar: string;
  btn: string;
  name: string;
  table: string;
  thead: string;
  bgSuccess: string;
  bgDanger: string;
  themeType: ThemesType;

  constructor(selected?: ThemesType) {
    switch (selected) {
      case ThemesType.DARK:
        this.btn = "btn-dark";
        this.navbar = "navbar-light bg-light";
        this.bg = "bg-dark";
        this.text = "text-light";
        this.name = "dark";
        this.table = "table-dark";
        this.thead = "thead-dark";
        this.bgSuccess = "bg-success";
        this.bgDanger = "bg-danger";
        this.themeType = ThemesType.DARK;
        break;
      case ThemesType.LIGHT:
      default:
        this.bg = "bg-light";
        this.text = "text-dark";
        this.btn = "btn-light";
        this.navbar = "navbar-dark bg-dark";
        this.name = "light";
        this.table = "table-light";
        this.thead = "thead-light";
        this.bgSuccess = "bg-success-light";
        this.bgDanger = "bg-danger-light";
        this.themeType = ThemesType.LIGHT;
        break;
    }

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
}
