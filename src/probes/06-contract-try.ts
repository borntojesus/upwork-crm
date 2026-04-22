import { gql } from "../client/graphql-client.ts";

const QUERY = /* GraphQL */ `
  query TryContract($id: ID!) {
    contract(id: $id) {
      id
      title
      contractType
      createdDateTime
      startDateTime
      endDateTime
    }
    contractList(ids: [$id]) {
      contracts {
        id
        title
        status
        startDate
        endDate
        clientOrganization {
          id
          name
        }
      }
    }
  }
`;

export async function probe06ContractTry(): Promise<void> {
  const data = await gql(
    QUERY,
    { id: "42994690" },
    { operationName: "TryContract" },
  );
  console.log(JSON.stringify(data, null, 2));
}
