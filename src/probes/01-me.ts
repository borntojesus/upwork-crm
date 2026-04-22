import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gql } from "../client/graphql-client.ts";

const QUERY = /* GraphQL */ `
  query Me {
    user {
      id
      nid
      rid
      name
      email
      photoUrl
    }
    organization {
      id
      rid
      legacyId
      name
      type
      legacyType
    }
    companySelector {
      items {
        title
        organizationId
        organizationRid
        organizationType
        organizationLegacyType
      }
    }
  }
`;

interface MeResponse {
  user: {
    id: string;
    nid: string;
    rid: string;
    name: string | null;
    email: string | null;
    photoUrl: string | null;
  } | null;
  organization: {
    id: string;
    rid: string | null;
    legacyId: string | null;
    name: string | null;
    type: string | null;
    legacyType: string | null;
  } | null;
  companySelector: {
    items: Array<{
      title: string;
      organizationId: string;
      organizationRid: string | null;
      organizationType: string | null;
      organizationLegacyType: string | null;
    }>;
  };
}

export async function probe01Me(): Promise<MeResponse> {
  // Tenant header omitted on purpose — we want the default context first
  // so we can discover what organizations this user can see.
  const data = await gql<MeResponse>(
    QUERY,
    {},
    {
      tenantId: null,
      operationName: "Me",
    },
  );
  const out = resolve(process.cwd(), "fixtures", "01-me.json");
  writeFileSync(out, JSON.stringify(data, null, 2), "utf8");
  return data;
}
