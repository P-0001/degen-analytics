/// <reference types="vite/client" />

declare module '*.hbs?raw' {
  const content: string;
  export default content;
}
