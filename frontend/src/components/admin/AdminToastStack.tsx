import type { AdminToast } from './adminTypes'

type Props = {
  toasts: AdminToast[]
  onDismiss: (toastId: number) => void
}

function AdminToastStack({ toasts, onDismiss }: Props) {
  return (
    <div className="admin-toast-stack">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          className={`admin-toast admin-toast-${toast.type}`}
          onClick={() => onDismiss(toast.id)}
        >
          <span className="admin-toast-icon">
            <i
              className={`bi ${
                toast.type === 'success'
                  ? 'bi-check-lg'
                  : toast.type === 'error'
                    ? 'bi-x-lg'
                    : 'bi-info-lg'
              }`}
            ></i>
          </span>

          <span>{toast.message}</span>
        </button>
      ))}
    </div>
  )
}

export default AdminToastStack