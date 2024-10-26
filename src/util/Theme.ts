export enum ThemesType {
  DARK = 1,
  LIGHT = 2,
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
}
