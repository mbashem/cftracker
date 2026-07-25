interface Props {
  repo: string;
  issue_term: string;
  label: string;
  theme: string;
}

function UtterancesComments(props: Props) {
  return (
    <section
      ref={(elem) => {
        if (!elem || elem.childNodes.length) {
          return;
        }
        const scriptElem = document.createElement("script");
        scriptElem.src = "https://utteranc.es/client.js";
        scriptElem.async = true;
        scriptElem.crossOrigin = "anonymous";
        scriptElem.setAttribute("repo", props.repo);
        scriptElem.setAttribute("issue-term", props.issue_term);
        scriptElem.setAttribute("label", props.label);
        scriptElem.setAttribute("theme", props.theme);
        elem.appendChild(scriptElem);
      }}
    />
  );
}

export default UtterancesComments;
