import type { DataResponse, RecordData } from '../../../data/source'

export function withReviewContext(
  path: string,
  response: DataResponse,
  material?: RecordData,
): DataResponse {
  const row = response.data as RecordData
  const leave = path.startsWith('/leave/')
  return {
    ...response,
    data: {
      ...row,
      policyExceptions: leave && Number(row.days ?? 0) >= 3 ? ['Review team coverage'] : [],
      reviewContext: leave
        ? {
            chargeableDays: Number(row.days ?? 0),
            balanceAfter: Math.max(0, 15 - Number(row.days ?? 0)),
            teamMembersOff: [],
            steps: row.history ?? [],
            nextReviewer: 'Manager',
          }
        : {
            materials: ['Equipment', 'MATERIAL'].includes(String(row.type))
              ? [
                  {
                    name: material?.name ?? 'Requested material',
                    requested: Number(row.quantity ?? 1),
                    stockAvailable: Number(material?.quantity ?? 0),
                  },
                ]
              : [],
            steps: row.history ?? [],
            nextReviewer: 'Manager',
          },
    },
  }
}

export function withPolicyExceptions(path: string, response: DataResponse): DataResponse {
  const collection = response.data as { items: RecordData[]; total: number }
  return {
    ...response,
    data: {
      ...collection,
      items: collection.items.map((row) => ({
        ...row,
        policyExceptions:
          path.startsWith('/leave/') && Number(row.days ?? 0) >= 3 ? ['Review team coverage'] : [],
      })),
    },
  }
}
