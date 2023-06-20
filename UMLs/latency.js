const fs = require('fs');

const exponentialRandom = (lambda) => (-Math.log(1 - Math.random()) / lambda);

const simulateBatchFill = (transactionRate, batchSize) => {
  let elapsedTime = 0;
  for (let i = 0; i < batchSize; i++) {
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

const calculateVariance = (data) => {
  const mean = data.reduce((sum, item) => sum + item.timeToFill, 0) / data.length;
  const variance = data.reduce((sum, item) => sum + Math.pow(item.timeToFill - mean, 2), 0) / data.length;
  return variance;
};

const main = () => {
  // Transactions per minute
  const highThroughput = 100000 / (24 * 60);
  const mediumThroughput = 1;
  const lowThroughput = (3.35 / 24) / 60;

  const maxBatchSize = 100;

  const highResults = testBatchFillTimes(highThroughput, maxBatchSize);
  const highVariance = calculateVariance(highResults);

  const mediumResults = testBatchFillTimes(mediumThroughput, maxBatchSize);
  const mediumVariance = calculateVariance(mediumResults);

  const lowResults = testBatchFillTimes(lowThroughput, maxBatchSize);
  const lowVariance = calculateVariance(lowResults);

  const results = {
    high: {
      throughput: '100,000 transactions per day',
      variance: highVariance,
      data: highResults,
    },
    medium: {
      throughput: '1 transaction per minute',
      variance: mediumVariance,
      data: mediumResults,
    },
    low: {
      throughput: '3.35 transactions per day',
      variance: lowVariance,
      data: lowResults,
    },
  };

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