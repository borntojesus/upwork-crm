import { gql } from "../client/graphql-client.ts";

const QUERY = /* GraphQL */ `
  query ScoutRooms($pagination: Pagination) {
    roomList(pagination: $pagination) {
      totalCount
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

interface ScoutResult {
  roomList: {
    totalCount: number | null;
    pageInfo: {
      hasNextPage: boolean | null;
      endCursor: string | null;
    } | null;
  };
}

export async function scoutRooms(): Promise<void> {
  for (const first of [1, 10, 50, 100, 500]) {
    const data = await gql<ScoutResult>(
      QUERY,
      { pagination: { first } },
      { operationName: "ScoutRooms" },
    );
    console.log(`first=${first}:`, JSON.stringify(data.roomList, null, 0));
  }
}
