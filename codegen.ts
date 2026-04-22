import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  schema: "schema/introspection.json",
  generates: {
    "schema/types.generated.ts": {
      plugins: ["typescript"],
      config: {
        enumsAsTypes: true,
        useTypeImports: true,
        avoidOptionals: { field: true, inputValue: false },
        skipTypename: true,
      },
    },
  },
  ignoreNoDocuments: true,
};

export default config;
