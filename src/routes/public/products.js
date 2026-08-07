const express = require("express");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, QueryCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");

const router = express.Router();
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.PRODUCTS_TABLE;

// GET /products?restaurantId=xxx -> si viene restaurantId, usa el GSI; si no, trae todos los disponibles
router.get("/", async (req, res) => {
  const { restaurantId } = req.query;

  if (restaurantId) {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "restaurantId-index",
        KeyConditionExpression: "restaurantId = :rid",
        FilterExpression: "available = :available",
        ExpressionAttributeValues: { ":rid": restaurantId, ":available": true },
      })
    );
    return res.json(result.Items || []);
  }

  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "available = :available",
      ExpressionAttributeValues: { ":available": true },
    })
  );
  res.json(result.Items || []);
});

// GET /products/:id
router.get("/:id", async (req, res) => {
  const result = await docClient.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { id: req.params.id } })
  );
  if (!result.Item || !result.Item.available) {
    return res.status(404).json({ message: "Producto no encontrado" });
  }
  res.json(result.Item);
});

module.exports = router;
