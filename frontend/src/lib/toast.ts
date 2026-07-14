type ToastType = "success" | "error" | "info";

function emit(message: string, type: ToastType) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("app:toast", { detail: { message, type, id: Date.now() + Math.random() } })
  );
}

export const toast = {
  success: (msg: string) => emit(msg, "success"),
  error: (msg: string) => emit(msg, "error"),
  info: (msg: string) => emit(msg, "info"),
};
