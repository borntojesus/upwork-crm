import { spawn } from "node:child_process";
import { runIntrospection } from "./run.ts";
import { writeCapabilities } from "./capabilities.ts";

function runCodegen(): Promise<void> {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(
      "pnpm",
      ["exec", "graphql-codegen", "--config", "codegen.ts"],
      { stdio: "inherit" },
    );
    child.on("error", rejectRun);
    child.on("exit", (code) => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(`graphql-codegen exited with code ${code}`));
    });
  });
}

export async function refreshSchema(): Promise<void> {
  console.error(`[refresh-schema] introspecting Upwork GraphQL…`);
  const { schema, sdlPath, introspectionPath } = await runIntrospection();
  console.error(`[refresh-schema]   SDL → ${sdlPath}`);
  console.error(`[refresh-schema]   raw → ${introspectionPath}`);

  console.error(`[refresh-schema] running graphql-codegen…`);
  await runCodegen();

  console.error(`[refresh-schema] generating capability map…`);
  const cap = writeCapabilities(schema);
  console.error(
    `[refresh-schema]   ${cap.path} (${cap.totalQueries} queries, ${cap.totalMutations} mutations)`,
  );

  console.error(`[refresh-schema] done.`);
}
