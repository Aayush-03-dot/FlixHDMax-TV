import type { ConfirmDialog } from './adminTypes'

type Props = {
  confirmDialog: ConfirmDialog
  onCancel: () => void
}

function AdminConfirmModal({ confirmDialog, onCancel }: Props) {
  if (!confirmDialog.open) {
    return null
  }

  return (
    <div className="admin-modal-backdrop">
      <div className="admin-confirm-modal">
        <div
          className={`admin-confirm-icon ${
            confirmDialog.danger ? 'danger' : 'success'
          }`}
        >
          <i
            className={`bi ${
              confirmDialog.danger
                ? 'bi-exclamation-triangle-fill'
                : 'bi-check-circle-fill'
            }`}
          ></i>
        </div>

        <div className="admin-confirm-title">{confirmDialog.title}</div>
        <div className="admin-confirm-message">{confirmDialog.message}</div>

        <div className="admin-confirm-actions">
          <button
            type="button"
            className="admin-confirm-cancel"
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            type="button"
            className={`admin-confirm-submit ${
              confirmDialog.danger ? 'danger' : ''
            }`}
            onClick={() => confirmDialog.onConfirm?.()}
          >
            {confirmDialog.confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminConfirmModal