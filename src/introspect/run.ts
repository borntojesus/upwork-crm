import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildClientSchema,
  getIntrospectionQuery,
  printSchema,
  type IntrospectionQuery,
  type GraphQLSchema,
} from "graphql";
import { gql } from "../client/graphql-client.ts";

const SCHEMA_DIR = resolve(process.cwd(), "schema");
const SDL_PATH = resolve(SCHEMA_DIR, "upwork.graphql");
const INTROSPECTION_PATH = resolve(SCHEMA_DIR, "introspection.json");

export interface IntrospectionResult {
  schema: GraphQLSchema;
  sdlPath: string;
  introspectionPath: string;
}

export async function runIntrospection(): Promise<IntrospectionResult> {
  const query = getIntrospectionQuery({ descriptions: true });
  const data = await gql<IntrospectionQuery>(
    query,
    {},
    {
      operationName: "IntrospectionQuery",
    },
  );

  const schema = buildClientSchema(data);
  const sdl = printSchema(schema);

  writeFileSync(INTROSPECTION_PATH, JSON.stringify(data, null, 2), "utf8");
  writeFileSync(SDL_PATH, sdl, "utf8");

  return {
    schema,
    sdlPath: SDL_PATH,
    introspectionPath: INTROSPECTION_PATH,
  };
}
