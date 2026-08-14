import Modal from "./Modal.jsx";

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal title={title} onClose={onCancel} width="420px">
      <div className="confirm-dialog">
        {typeof message === "string" ? <p>{message}</p> : message}
        <div className="confirm-dialog-actions">
          <button className="btn btn-ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
