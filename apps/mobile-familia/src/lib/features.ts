// Feature flags de la app. No hay backend de pagos todavía — este flag
// controla si el resumen de reserva pide un método de pago o solo
// muestra el aviso de "próximamente". Cambiarlo a `true` es la única
// acción necesaria cuando el pago en línea esté listo; el resto de la
// pantalla ya está preparado (ver requests/new.tsx, paso "review").
export const paymentsEnabled = false;
