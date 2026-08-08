const express = require("express");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");

const router = express.Router();
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.RESTAURANTS_TABLE;

// GET /restaurants -> solo restaurantes activos (catalogo publico)
router.get("/", async (req, res) => {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "active = :active",
      ExpressionAttributeValues: { ":active": true },
    })
  );
  res.json(result.Items || []);
});

// GET /restaurants/:id
router.get("/:id", async (req, res) => {
  const result = await docClient.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { id: req.params.id } })
  );
  if (!result.Item || !result.Item.active) {
    return res.status(404).json({ message: "Restaurante no encontrado" });
  }
  res.json(result.Item);
});

module.exports = router;
