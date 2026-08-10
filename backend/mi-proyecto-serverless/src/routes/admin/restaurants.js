const express = require("express");
const { randomUUID } = require("crypto");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, ScanCommand, GetCommand, UpdateCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");

const router = express.Router();
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.RESTAURANTS_TABLE;

router.get("/", async (req, res) => {
  const result = await docClient.send(new ScanCommand({ TableName: TABLE_NAME }));
  console.log(`Restaurantes encontrados (admin): ${result.Items.length}`);
  res.json(result.Items || []);
});

router.get("/:id", async (req, res) => {
  const result = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { id: req.params.id } }));
  if (!result.Item) {
    console.log(`Restaurante no encontrado: ${req.params.id}`);
    return res.status(404).json({ message: "Restaurante no encontrado" });
  }
  res.json(result.Item);
});

router.post("/", async (req, res) => {
  const { name, address } = req.body;
  if (!name) return res.status(400).json({ message: "El campo 'name' es requerido" });

  const restaurant = {
    id: randomUUID(),
    name,
    address: address || null,
    active: true,
    createdAt: new Date().toISOString(),
  };

  await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: restaurant }));
  console.log(`Restaurante creado exitosamente: ${restaurant.id}`);
  res.status(201).json(restaurant);
});

router.put("/:id", async (req, res) => {
  const { name, address, active } = req.body;

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { id: req.params.id },
      UpdateExpression: "SET #name = :name, address = :address, active = :active",
      ExpressionAttributeNames: { "#name": "name" },
      ExpressionAttributeValues: {
        ":name": name,
        ":address": address ?? null,
        ":active": active ?? true,
      },
      ReturnValues: "ALL_NEW",
    })
  );
  console.log(`Restaurante actualizado exitosamente: ${req.params.id}`);
  res.json(result.Attributes);
});

router.delete("/:id", async (req, res) => {
  await docClient.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { id: req.params.id } }));
  console.log(`Restaurante eliminado exitosamente: ${req.params.id}`);
  res.status(204).send();
});

module.exports = router;
