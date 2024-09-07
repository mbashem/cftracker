import { faFilter } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import { Modal } from "react-bootstrap";
import Theme from "../../util/Theme";
import React from "react";

interface childrenProps {
  closeModal: () => void;
}

interface PropsType {
  title: string;
  children: React.ReactNode | ((props: childrenProps) => React.ReactNode);
  theme: Theme;
  button?: React.ReactNode;
}

const CustomModal = (props: PropsType) => {
  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  return (
    <>
      <button type="button" className={"btn " + props.theme.btn} onClick={handleShow}>
        {props.button === undefined ? <FontAwesomeIcon icon={faFilter} /> : props.button}
      </button>
      <Modal className="modal" show={show} onHide={handleClose}>
        <Modal.Header className={"modal-header " + props.theme.bgText}>
          <Modal.Title>{props.title}</Modal.Title>
          <button
            type="button"
            className="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
            onClick={() => handleClose()}
          ></button>
        </Modal.Header>
        <Modal.Body className={props.theme.bgText}>
          {typeof props.children === "function" ? props.children({ closeModal: handleClose }) : props.children}
        </Modal.Body>
      </Modal>
    </>
  );
};

export default CustomModal;
