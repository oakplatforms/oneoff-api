interface PaginateOptions<TData, TWhere, TInclude, TOrderBy> {
  prismaModel: {
    findMany: (args: {
      where?: TWhere
      include?: TInclude
      skip?: number
      take?: number
      orderBy?: TOrderBy
    }) => Promise<TData[]>
    count: (args: { where?: TWhere }) => Promise<number>
  }
  where?: TWhere
  include?: TInclude
  orderBy?: TOrderBy
  page?: number
  limit?: number
  usePagination: boolean
}

export async function paginatePrisma<TData, TWhere, TInclude, TOrderBy>({
  prismaModel,
  where,
  include,
  orderBy,
  page = 0,
  limit = 10,
  usePagination = true
}: PaginateOptions<TData, TWhere, TInclude, TOrderBy>) {
  if (!usePagination) {
    const data = await prismaModel.findMany({ where, include, orderBy })
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
      orderBy,
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
