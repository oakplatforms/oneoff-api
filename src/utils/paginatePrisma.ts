interface PaginateOptions<TData, TWhere, TInclude> {
  prismaModel: {
    findMany: (args: {
      where?: TWhere
      include?: TInclude
      skip?: number
      take?: number
    }) => Promise<TData[]>
    count: (args: { where?: TWhere }) => Promise<number>
  }
  where?: TWhere
  include?: TInclude
  page?: number
  limit?: number
  usePagination: boolean
}

export async function paginatePrisma<TData, TWhere, TInclude>({
  prismaModel,
  where,
  include,
  page = 0,
  limit = 10,
  usePagination = true
}: PaginateOptions<TData, TWhere, TInclude>) {
  if (!usePagination) {
    const data = await prismaModel.findMany({ where, include })
    return {
      data,
      page: null,
      total: null,
    }
  }

  const [data, total] = await Promise.all([
    prismaModel.findMany({
      where,
      include,
      skip: page * limit,
      take: limit,
    }),
    prismaModel.count({ where }),
  ])

  return {
    data,
    page,
    total,
  }
}
