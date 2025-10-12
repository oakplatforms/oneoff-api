import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn'

const stepFunctions = new SFNClient({
  region: 'us-east-1',
})

export interface EntityProcessingInput {
  entityId: string
  brand: string
  name: string
  number: string
  rarity: string
  color: string
  set: string
  print?: string
  edition: string
}

export interface BatchProcessingInput {
  entities: EntityProcessingInput[]
  batchId: string
  totalBatches: number
  currentBatch: number
}

/**
 * Starts a Step Function execution with the given input
 */
export async function startStepFunctionExecution(
  stateMachineArn: string,
  input: BatchProcessingInput,
  name?: string
): Promise<string> {
  try {
    const command = new StartExecutionCommand({
      stateMachineArn,
      input: JSON.stringify(input),
      name: name || `entity-batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    })

    const result = await stepFunctions.send(command)
    console.log(`Step Function execution started: ${result.executionArn}`)
    return result.executionArn || ''
  } catch (error) {
    console.error('Failed to start Step Function execution:', error)
    throw error
  }
}

/**
 * Processes entities in batches and sends them to Step Functions
 */
export async function processEntitiesInBatches(
  entities: EntityProcessingInput[],
  stateMachineArn: string,
  batchSize: number = 100,
  maxBatches?: number
): Promise<{ executionArns: string[]; totalBatches: number }> {
  const batches: EntityProcessingInput[][] = []

  //Split entities into batches
  for (let i = 0; i < entities.length; i += batchSize) {
    batches.push(entities.slice(i, i + batchSize))
  }

  //Limit batches if maxBatches is specified
  const limitedBatches = maxBatches ? batches.slice(0, maxBatches) : batches
  const executionArns: string[] = []
  const totalBatches = limitedBatches.length

  //Process batches with controlled concurrency
  const maxConcurrentBatches = 5
  const batchPromises: Promise<string>[] = []

  for (let i = 0; i < limitedBatches.length; i++) {
    const batch = limitedBatches[i]
    const batchId = `batch-${i + 1}-${Date.now()}`

    const batchInput: BatchProcessingInput = {
      entities: batch,
      batchId,
      totalBatches,
      currentBatch: i + 1,
    }

    //Add batch to processing queue
    const batchPromise = startStepFunctionExecution(
      stateMachineArn,
      batchInput,
      `entity-batch-${i + 1}-${Date.now()}`
    ).then(executionArn => {
      console.log(`Batch ${i + 1}/${totalBatches} started with execution ARN: ${executionArn}`)
      return executionArn
    })

    batchPromises.push(batchPromise)

    //If we've reached max concurrency, wait for one to complete
    if (batchPromises.length >= maxConcurrentBatches) {
      const completedArn = await Promise.race(batchPromises)
      executionArns.push(completedArn)

      //Remove completed promise from array
      const completedIndex = batchPromises.findIndex(p => p === Promise.resolve(completedArn))
      if (completedIndex > -1) {
        batchPromises.splice(completedIndex, 1)
      }
    }
  }

  //Wait for remaining batches to complete
  const remainingArns = await Promise.all(batchPromises)
  executionArns.push(...remainingArns)

  return { executionArns, totalBatches }
}

export default stepFunctions
