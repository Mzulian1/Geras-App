import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Toaster global (montado una vez en main.tsx). El helper `toast()` de
 * "sonner" se importa directo donde se necesite mostrar una confirmación.
 * @example toast.success("Comisión actualizada"); toast.error("No se pudo guardar");
 */
function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "rounded-md border shadow-md",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
