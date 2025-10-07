// src/global.d.ts or types/css.d.ts
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

// For CSS Modules specifically (e.g., .module.css)
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
