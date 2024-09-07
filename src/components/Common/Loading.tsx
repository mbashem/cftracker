import { ThreeDots } from "react-loader-spinner";

function Loading() {
  return (
    <ThreeDots
      height="80"
      width="80"
      radius="8"
      color="grey"
      wrapperClass={"d-flex justify-content-center"}
      ariaLabel="three-dots-loading"
      visible={true}
    />
  );
}

export default Loading;
