// Small reusable confirmation modal, styled to match the app rather than
// falling back to window.confirm() which looks jarring against the
// editorial design. Used for logout right now; generic enough to reuse
// anywhere else a "are you sure?" is needed later (leaving a group, etc).
export default function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div className="confirm-dialog card" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {message && <p>{message}</p>}
        <div className="confirm-dialog-actions">
          <button className="confirm-dialog-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="confirm-dialog-confirm" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
