const express = require("express");
const { randomUUID } = require("crypto");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, ScanCommand, GetCommand, UpdateCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");

const router = express.Router();
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.PRODUCTS_TABLE;

router.get("/", async (req, res) => {
  const result = await docClient.send(new ScanCommand({ TableName: TABLE_NAME }));
  res.json(result.Items || []);
});

router.get("/:id", async (req, res) => {
  const result = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { id: req.params.id } }));
  if (!result.Item) return res.status(404).json({ message: "Producto no encontrado" });
  res.json(result.Item);
});

router.post("/", async (req, res) => {
  const { restaurantId, name, price, imageUrl } = req.body;
  if (!restaurantId || !name || price === undefined) {
    return res.status(400).json({ message: "Campos requeridos: restaurantId, name, price" });
  }

  const product = {
    id: randomUUID(),
    restaurantId,
    name,
    price,
    imageUrl: imageUrl || null,
    available: true,
    createdAt: new Date().toISOString(),
  };

  await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: product }));
  res.status(201).json(product);
});

router.put("/:id", async (req, res) => {
  const { name, price, imageUrl, available } = req.body;

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { id: req.params.id },
      UpdateExpression: "SET #name = :name, price = :price, imageUrl = :imageUrl, available = :available",
      ExpressionAttributeNames: { "#name": "name" },
      ExpressionAttributeValues: {
        ":name": name,
        ":price": price,
        ":imageUrl": imageUrl ?? null,
        ":available": available ?? true,
      },
      ReturnValues: "ALL_NEW",
    })
  );
  res.json(result.Attributes);
});

router.delete("/:id", async (req, res) => {
  await docClient.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { id: req.params.id } }));
  res.status(204).send();
});

module.exports = router;
