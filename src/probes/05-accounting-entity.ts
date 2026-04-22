import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gql } from "../client/graphql-client.ts";

const QUERY = /* GraphQL */ `
  query AccountingEntity {
    accountingEntity {
      id
    }
  }
`;

interface Response {
  accountingEntity: { id: string } | null;
}

export async function probe05AccountingEntity(): Promise<Response> {
  const data = await gql<Response>(
    QUERY,
    {},
    {
      operationName: "AccountingEntity",
    },
  );
  const out = resolve(process.cwd(), "fixtures", "05-accounting-entity.json");
  writeFileSync(out, JSON.stringify(data, null, 2), "utf8");
  return data;
}
