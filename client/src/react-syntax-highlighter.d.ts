declare module 'react-syntax-highlighter' {
  import { ComponentType } from 'react';
  
  export interface SyntaxHighlighterProps {
    language?: string;
    style?: any;
    children?: any;
    className?: string;
    PreTag?: string | ComponentType<any>;
    [key: string]: any;
  }
  
  export const Prism: ComponentType<SyntaxHighlighterProps>;
  export const Light: ComponentType<SyntaxHighlighterProps>;
  
  export default ComponentType<SyntaxHighlighterProps>;
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
  export const a11yDark: any;
  export const atomDark: any;
  export const base16AteliersulphurpoolLight: any;
  export const cb: any;
  export const darcula: any;
  export const dracula: any;
  export const duotoneDark: any;
  export const duotoneLight: any;
  export const ghcolors: any;
  export const hopscotch: any;
  export const materialDark: any;
  export const materialLight: any;
  export const materialOceanic: any;
  export const nord: any;
  export const okaidia: any;
  export const prism: any;
  export const synthwave84: any;
  export const vscDarkPlus: any;
  export const vsDark: any;
  
  export default {
    a11yDark,
    atomDark,
    base16AteliersulphurpoolLight,
    cb,
    darcula,
    dracula,
    duotoneDark,
    duotoneLight,
    ghcolors,
    hopscotch,
    materialDark,
    materialLight,
    materialOceanic,
    nord,
    okaidia,
    prism,
    synthwave84,
    vscDarkPlus,
    vsDark
  };
}