import { faFilter } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import Theme from "../../util/Theme";
import React from "react";
import ButtonPopover from "./ButtonPopover";
import Dialog from "./Dialog";
import Button, { type ButtonVariant } from "./Button";

interface childrenProps {
  closeModal: () => void;
}

export interface CustomModalProps {
  title: string;
  children: React.ReactNode | ((props: childrenProps) => React.ReactNode);
  theme: Theme;
  button?: React.ReactNode;
  buttonLabel?: string;
  buttonPopover?: string;
  buttonVariant?: ButtonVariant;
  buttonDisabled?: boolean;
  onOpen?: () => void;
  size?: "sm" | "lg" | "xl";
}

function CustomModal(props: CustomModalProps) {
  const [show, setShow] = useState(false);

  function handleClose() {
    setShow(false);
  }

  function handleShow() {
    if (props.buttonDisabled) return;
    props.onOpen?.();
    setShow(true);
  }

  const button = (
    <Button aria-label={props.buttonLabel} aria-disabled={props.buttonDisabled || undefined} variant={props.buttonVariant} theme={props.theme} onClick={handleShow}>
      {props.button === undefined ? <FontAwesomeIcon icon={faFilter} /> : props.button}
    </Button>
  );

  return (
    <>
      {props.buttonPopover ? <ButtonPopover label={props.buttonPopover} theme={props.theme}>{button}</ButtonPopover> : button}
      <Dialog title={props.title} theme={props.theme} size={props.size} open={show} onClose={handleClose}>
        {typeof props.children === "function" ? props.children({ closeModal: handleClose }) : props.children}
      </Dialog>
    </>
  );
}

export default CustomModal;
