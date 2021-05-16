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

  constructor(selected?: ThemesType) {
    switch (selected) {
      case ThemesType.LIGHT:
        this.bg = "bg-light";
        this.text = "text-dark";
        this.btn = "btn-light";
        this.navbar = "navbar-dark bg-dark";
        this.name = "light";
        this.table = "table-light";
        this.thead = "thead-light";
        this.bgSuccess = "bg-success-light";
        this.bgDanger = "bg-danger-light";
        break;
      case ThemesType.DARK:
      default:
        this.btn = "btn-dark";
        this.navbar = "navbar-light bg-light";
        this.bg = "bg-dark";
        this.text = "text-light";
        this.name = "dark";
        this.table = "table-dark";
        this.thead = "thead-dark";
        this.bgSuccess = "bg-success";
        this.bgDanger = "bg-danger";
        break;
    }

    this.bgText = this.bg + " " + this.text;
  }
}