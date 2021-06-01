import { faFilter } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import { Modal } from "react-bootstrap";
import Theme from "../../util/Theme";

interface PropsType {
  title: string;
  children: React.ReactNode;
  theme: Theme;
}

const CustomModal = (props: PropsType) => {
  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  return (
    <>
      <button
        type="button"
        className={"btn " + props.theme.btn}
        onClick={handleShow}>
        {<FontAwesomeIcon icon={faFilter} />}
      </button>
      <Modal className="modal" show={show} onHide={handleClose}>
        <Modal.Header className="modal-header">
          <Modal.Title>{props.title}</Modal.Title>
          <button
            type="button"
            className="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
            onClick={() => handleClose()}></button>
        </Modal.Header>
        <Modal.Body>{props.children}</Modal.Body>
      </Modal>
    </>
  );
};

export default CustomModal;
