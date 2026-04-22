import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gql } from "../client/graphql-client.ts";

const QUERY = /* GraphQL */ `
  query PublicJobs($filter: PublicMarketplaceJobPostingsSearchFilter!) {
    publicMarketplaceJobPostingsSearch(marketPlaceJobFilter: $filter) {
      jobs {
        id
        ciphertext
        title
        description
        createdDateTime
        publishedDateTime
        type
        engagement
        duration
        durationLabel
        contractorTier
        category
        subcategory
        freelancersToHire
        totalApplicants
        amount {
          rawValue
          currency
          displayValue
        }
        hourlyBudgetType
        hourlyBudgetMin
        hourlyBudgetMax
        skills {
          name
          prettyName
        }
        client {
          totalHires
          totalPostedJobs
          totalReviews
          totalFeedback
          location {
            country
            city
          }
        }
      }
      paging {
        hasNextPage
        endCursor
      }
    }
  }
`;

export async function probe05JobsPublic(): Promise<unknown> {
  const data = await gql(
    QUERY,
    {
      filter: {
        searchExpression_eq: "next.js",
        daysPosted_eq: 14,
        pagination: { pageOffset: 0, pageSize: 20 },
      },
    },
    { operationName: "PublicJobs", tenantId: null },
  );
  const out = resolve(process.cwd(), "fixtures", "05-jobs-public.json");
  writeFileSync(out, JSON.stringify(data, null, 2), "utf8");
  return data;
}
