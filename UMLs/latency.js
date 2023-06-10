const fs = require('fs');


const exponentialRandom = (lambda) => (-Math.log(1 - Math.random()) / lambda);

const simulateBatchFill = (transactionRate, batchSize) => {
  let elapsedTime = 0;
  for (let i = 0; i < batchSize; i++) {
    // Generate time between transactions following the Exponential distribution
    const timeBetweenTransactions = exponentialRandom(transactionRate);
    elapsedTime += timeBetweenTransactions;
  }
  return elapsedTime;
};

const testBatchFillTimes = (transactionRate, maxBatchSize) => {
  const batchFillTimes = [];
  for (let batchSize = 1; batchSize <= maxBatchSize; batchSize++) {
    const fillTime = simulateBatchFill(transactionRate, batchSize);
    batchFillTimes.push({
      batchSize: batchSize,
      timeToFill: fillTime,
    });
  }
  return batchFillTimes;
};

const main = () => {
  const transactionRate = 3.35; // Transactions per day calculated in previous answers
  const maxBatchSize = 100;

  const results = testBatchFillTimes(transactionRate, maxBatchSize);
  const jsonOutput = JSON.stringify(results, null, 2);

  fs.writeFile('batch_fill_times.json', jsonOutput, (err) => {
    if (err) {
      console.error('Error saving the JSON file:', err);
    } else {
      console.log('Batch fill times are successfully saved to batch_fill_times.json');
    }
  });
};

main();