require("dotenv").config();

const express = require("express");
const apiRoutes = require("./routes/api");
const { registerSwagger } = require("./swagger");
const { serverError } = require("./lib/http");

const app = express();

app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.status(200).json({ success: true, data: { status: "ok" } });
});

registerSwagger(app);

app.use("/", apiRoutes);

app.use((err, req, res, next) => {
  console.error(err);

  if (err && err.message) {
    return serverError(res, err.message);
  }

  return serverError(res);
});

module.exports = app;
