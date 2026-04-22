import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gql } from "../client/graphql-client.ts";

const QUERY = /* GraphQL */ `
  query LatestRooms($pagination: Pagination, $sortOrder: SortOrder) {
    roomList(pagination: $pagination, sortOrder: $sortOrder) {
      totalCount
      edges {
        node {
          id
          roomName
          topic
          roomType
          numUnread
          lastVisitedDateTime
          createdAtDateTime
          contractId
          roomUsers {
            role
            user {
              id
              name
              photoUrl
            }
            organization {
              id
              name
            }
          }
          latestStory {
            id
            createdDateTime
            message
            user {
              id
              name
              photoUrl
            }
            organization {
              id
              name
            }
          }
        }
      }
    }
  }
`;

export async function probe03Messages(): Promise<unknown> {
  const data = await gql(
    QUERY,
    {
      pagination: { first: 10 },
      sortOrder: "DESC",
    },
    { operationName: "LatestRooms" },
  );
  const out = resolve(process.cwd(), "fixtures", "03-messages.json");
  writeFileSync(out, JSON.stringify(data, null, 2), "utf8");
  return data;
}
