// Augmentación de tipos para `className` en componentes de React Native
// (NativeWind). El paquete recomienda `/// <reference types="nativewind/types" />`,
// pero en esta instalación (nativewind@4.2.6 vía npm workspaces) ese
// subpath no resuelve: react-native-css-interop, que es quien declara
// esta augmentación, quedó anidado en
// node_modules/nativewind/node_modules/react-native-css-interop y no
// hookeable desde acá. Se declara directo para no depender de ese hoisting.
declare module "react-native" {
  interface ViewProps {
    className?: string;
  }
  interface TextProps {
    className?: string;
  }
  interface ImageProps {
    className?: string;
  }
  interface ScrollViewProps {
    className?: string;
    contentContainerClassName?: string;
  }
  interface TextInputProps {
    className?: string;
  }
}

export {};
