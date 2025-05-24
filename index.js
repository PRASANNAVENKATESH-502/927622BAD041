const express = require("express");
const app = express();
const port = 3000;

// Dummy stock price data (in-memory)
const stockData = {
  NVDA: [
    { price: 100, lastUpdatedAt: new Date(Date.now() - 15 * 60 * 1000) },
    { price: 200, lastUpdatedAt: new Date(Date.now() - 10 * 60 * 1000) },
    { price: 300, lastUpdatedAt: new Date(Date.now() - 5 * 60 * 1000) },
  ],
  PYPL: [
    { price: 80, lastUpdatedAt: new Date(Date.now() - 15 * 60 * 1000) },
    { price: 160, lastUpdatedAt: new Date(Date.now() - 10 * 60 * 1000) },
    { price: 240, lastUpdatedAt: new Date(Date.now() - 5 * 60 * 1000) },
  ],
};

// Helper: calculate average of numbers array
function average(arr) {
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

// Helper: calculate covariance
function covariance(arrX, arrY, meanX, meanY) {
  let cov = 0;
  for (let i = 0; i < arrX.length; i++) {
    cov += (arrX[i] - meanX) * (arrY[i] - meanY);
  }
  return cov / (arrX.length - 1);
}

// Helper: calculate standard deviation
function standardDeviation(arr, mean) {
  return Math.sqrt(
    arr.reduce((sum, val) => sum + (val - mean) ** 2, 0) / (arr.length - 1)
  );
}

// Route 1: Get average stock price and price history for last m minutes
app.get("/stocks/:ticker", (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  const minutes = parseInt(req.query.minutes);
  const aggregation = req.query.aggregation;

  if (!minutes || !aggregation || aggregation !== "average") {
    return res
      .status(400)
      .json({ error: "Provide valid minutes and aggregation=average" });
  }

  const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
  const prices = (stockData[ticker] || []).filter(
    (p) => p.lastUpdatedAt >= cutoffTime
  );

  if (prices.length === 0) {
    return res
      .status(404)
      .json({
        error: `No price data found for ${ticker} in last ${minutes} minutes`,
      });
  }

  const avgPrice = average(prices.map((p) => p.price));

  res.json({
    averageStockPrice: avgPrice,
    priceHistory: prices,
  });
});

// Route 2: Get correlation between 2 stocks in last m minutes
app.get("/stockcorrelation", (req, res) => {
  const minutes = parseInt(req.query.minutes);
  let tickers = req.query.ticker;

  // Normalize tickers param to array
  if (!tickers) {
    return res
      .status(400)
      .json({ error: "Please provide ticker query params" });
  }
  if (!Array.isArray(tickers)) {
    tickers = [tickers];
  }

  if (tickers.length !== 2) {
    return res
      .status(400)
      .json({ error: "Exactly two ticker symbols required" });
  }

  if (!minutes) {
    return res
      .status(400)
      .json({ error: "Please provide minutes query param" });
  }

  const [ticker1, ticker2] = tickers.map((t) => t.toUpperCase());
  const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);

  const data1 = (stockData[ticker1] || []).filter(
    (p) => p.lastUpdatedAt >= cutoffTime
  );
  const data2 = (stockData[ticker2] || []).filter(
    (p) => p.lastUpdatedAt >= cutoffTime
  );

  if (data1.length === 0 || data2.length === 0) {
    return res
      .status(404)
      .json({
        error: `No data for one or both tickers in last ${minutes} minutes`,
      });
  }

  // For correlation, align price arrays by timestamps (simplified: assume same length)
  const prices1 = data1.map((p) => p.price);
  const prices2 = data2.map((p) => p.price);

  if (prices1.length !== prices2.length) {
    return res
      .status(400)
      .json({ error: "Price history length mismatch — data alignment needed" });
  }

  const avg1 = average(prices1);
  const avg2 = average(prices2);

  const cov = covariance(prices1, prices2, avg1, avg2);
  const stdDev1 = standardDeviation(prices1, avg1);
  const stdDev2 = standardDeviation(prices2, avg2);

  const correlation = cov / (stdDev1 * stdDev2);

  res.json({
    correlation,
    stocks: {
      [ticker1]: { averagePrice: avg1, priceHistory: data1 },
      [ticker2]: { averagePrice: avg2, priceHistory: data2 },
    },
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
