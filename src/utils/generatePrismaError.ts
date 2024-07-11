import { Prisma } from "@prisma/client"

export const generatePrismaError = (err: Prisma.PrismaClientKnownRequestError) => {
  switch (err.code) {
    case 'P2002':
      // handling duplicate key errors
      return { statusCode: 400, errorMessage: `Duplicate field value: ${err.meta?.target}`}
    case 'P2014':
      // handling invalid id errors
      return { statusCode: 400, errorMessage: `Invalid ID: ${err.meta?.target}`}
    case 'P2003':
        // handling invalid data errors
        return { statusCode: 400, errorMessage: `Invalid input data: ${err.meta?.target}`}
    default:
        // handling all other errors
        return { statusCode: 400, errorMessage: `Something went wrong: ${err.message}`}
  }
}