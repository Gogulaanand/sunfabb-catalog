// Replaces @types/mdx, which declares only the default export. Guides carry
// their frontmatter as a named `meta` export, and @types/mdx has no slot for
// it — with that package installed, `import { meta } from "...mdx"` is a type
// error.
//
// `meta` is deliberately typed `unknown`: an MDX file is authored content, not
// checked code, so a typo in its frontmatter must fail loudly at the boundary
// rather than be trusted by the compiler. lib/guides.ts parses it with zod.
// See rule 11 in CLAUDE.md.
declare module "*.mdx" {
  import type { MDXProps } from "mdx/types";

  export const meta: unknown;

  const MDXComponent: (props: MDXProps) => JSX.Element;
  export default MDXComponent;
}
