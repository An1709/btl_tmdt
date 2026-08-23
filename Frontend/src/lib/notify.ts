import { toast, type ExternalToast } from "sonner"

type NotificationOptions = ExternalToast & {
  description?: string
}

function show(type: "success" | "error" | "warning" | "info", message: string, options?: NotificationOptions) {
  return toast[type](message, {
    duration: 4500,
    id: options?.id ?? `petmart:${type}:${message}`,
    ...options,
  })
}

const notify = {
  success: (message: string, options?: NotificationOptions) => show("success", message, options),
  error: (message: string, options?: NotificationOptions) => show("error", message, options),
  warning: (message: string, options?: NotificationOptions) => show("warning", message, options),
  info: (message: string, options?: NotificationOptions) => show("info", message, options),
}

export { notify }
