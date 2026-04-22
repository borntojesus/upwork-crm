import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gql } from "../client/graphql-client.ts";

const QUERY = /* GraphQL */ `
  query NextJsJobs($filter: MarketplaceJobPostingsSearchFilter) {
    marketplaceJobPostingsSearch(marketPlaceJobFilter: $filter) {
      totalCount
      edges {
        node {
          id
          ciphertext
          title
          description
          recordNumber
          createdDateTime
          publishedDateTime
          duration
          durationLabel
          engagement
          experienceLevel
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
          hourlyBudgetMin {
            rawValue
            currency
            displayValue
          }
          hourlyBudgetMax {
            rawValue
            currency
            displayValue
          }
          skills {
            name
            prettyName
          }
          client {
            totalHires
            totalPostedJobs
            totalReviews
            totalFeedback
            verificationStatus
            totalSpent {
              rawValue
              currency
              displayValue
            }
            location {
              country
              city
            }
          }
        }
      }
    }
  }
`;

export async function probe04Jobs(): Promise<unknown> {
  const data = await gql(
    QUERY,
    {
      filter: {
        searchExpression_eq: "next.js",
        pagination_eq: { first: 10 },
      },
    },
    { operationName: "NextJsJobs" },
  );
  const out = resolve(process.cwd(), "fixtures", "04-jobs.json");
  writeFileSync(out, JSON.stringify(data, null, 2), "utf8");
  return data;
}
